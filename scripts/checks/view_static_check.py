#!/usr/bin/env python3
"""
Vérifications statiques spécifiques aux vues.

Vérifie (analyse statique — zéro exécution) :
  1. commands déclarées dans VIEW.md si tool.py expose une méthode command()
  2. tool.py : pas d'import de modules inhabituels non déclarés dans requires_env
  3. view.js contient une fonction cleanup/destroy/unmount (convention de cycle de vie)
  4. gestures : cohérence des bindings (command|action exclusifs, command déclarée)
"""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Optional

_UNUSUAL_MODULES = {
    "ctypes", "cffi", "mmap", "multiprocessing", "threading",
    "signal", "pty", "termios", "fcntl", "resource",
}

_CLEANUP_RE = re.compile(
    r"\b(cleanup|destroy|unmount|onDestroy|teardown)\s*[=({(]",
    re.MULTILINE,
)

_GESTURES_RE = re.compile(r"\bgestures\s*:", re.MULTILINE)


def _has_command_method(py_path: Path) -> bool:
    """Retourne True si tool.py définit une méthode nommée 'command'."""
    try:
        source = py_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_path))
    except (OSError, SyntaxError):
        return False
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == "command":
            return True
    return False


def _check_unusual_imports(py_path: Path) -> list[str]:
    errors = []
    try:
        source = py_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_path))
    except (OSError, SyntaxError):
        return []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                if root in _UNUSUAL_MODULES:
                    errors.append(
                        f"⚠ view_static_check: tool.py importe le module inhabituel '{alias.name}' "
                        f"— justifier dans la description de la vue"
                    )
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".")[0]
            if root in _UNUSUAL_MODULES:
                errors.append(
                    f"⚠ view_static_check: tool.py importe depuis le module inhabituel '{node.module}'"
                )
    return errors


def _has_cleanup(js_path: Path) -> bool:
    try:
        content = js_path.read_text(encoding="utf-8")
        return bool(_CLEANUP_RE.search(content))
    except OSError:
        return False


def _has_gestures_binding(js_path: Path) -> bool:
    try:
        content = js_path.read_text(encoding="utf-8")
        return bool(_GESTURES_RE.search(content))
    except OSError:
        return False


def _check_gestures(manifest: dict) -> list[str]:
    """Valide les bindings gestuels déclarés dans le frontmatter VIEW.md."""
    errors: list[str] = []
    gestures = manifest.get("gestures") or []
    if not isinstance(gestures, list):
        return ["❌ view_static_check: 'gestures' doit être une liste"]

    declared = {
        c.get("action")
        for c in (manifest.get("commands") or [])
        if isinstance(c, dict) and c.get("action")
    }

    for i, g in enumerate(gestures):
        if not isinstance(g, dict):
            errors.append(f"❌ view_static_check: gestures[{i}] doit être un objet")
            continue

        on = g.get("on")
        label = on if on else f"gestures[{i}]"

        if not on or not str(on).strip():
            errors.append(
                f"❌ view_static_check: gestures[{i}] doit avoir un champ 'on' non vide"
            )

        has_command = bool(g.get("command"))
        has_action = bool(g.get("action"))
        if has_command == has_action:  # les deux, ou aucun
            errors.append(
                f"❌ view_static_check: gesture '{label}' doit déclarer exactement un de "
                "'command' ou 'action' (pas les deux, pas aucun)"
            )

        if has_command and g["command"] not in declared:
            errors.append(
                f"❌ view_static_check: gesture '{label}' référence une commande non "
                f"déclarée ('{g['command']}' absente de 'commands')"
            )

    return errors


def run(manifest: dict, contribution_path: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []

    tool_py = contribution_path / "tool.py"
    view_js = contribution_path / "view.js"

    # 1) commands déclarées si méthode command() présente dans tool.py
    if tool_py.exists() and _has_command_method(tool_py):
        commands = manifest.get("commands") or []
        if not commands:
            errors.append(
                "❌ view_static_check: tool.py expose une méthode command() "
                "mais aucune command n'est déclarée dans VIEW.md — "
                "ajouter le champ 'commands:' au frontmatter"
            )

    # 2) Imports inhabituels dans tool.py
    if tool_py.exists():
        errors.extend(_check_unusual_imports(tool_py))

    # 3) cleanup déclaré dans view.js (avertissement — pas d'erreur bloquante sur l'existant)
    if view_js.exists() and not _has_cleanup(view_js):
        errors.append(
            "⚠ view_static_check: view.js ne déclare pas de fonction cleanup/destroy/unmount — "
            "recommandé pour éviter les fuites mémoire au déchargement de la vue"
        )

    # 4) Cohérence des bindings gestuels (bloquant)
    errors.extend(_check_gestures(manifest))

    # 4 bis) Si gestures déclaré dans VIEW.md, rappeler le binding runtime côté JS (avertissement)
    if manifest.get("gestures") and view_js.exists() and not _has_gestures_binding(view_js):
        errors.append(
            "⚠ view_static_check: VIEW.md déclare 'gestures' mais view.js ne contient pas de "
            "binding 'gestures:' — le mapping runtime doit aussi exister côté JS"
        )

    return len(errors) == 0 or all(m.startswith("⚠") for m in errors), errors
