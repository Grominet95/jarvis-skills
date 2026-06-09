#!/usr/bin/env python3
"""
Vérifications statiques spécifiques aux presets.

Vérifie :
  1. triggers non-vide — sinon PresetSkill.SYSTEM_PROMPT = "" → rejeté par Skill Lab
  2. Steps de type connu (cli, spotify, tts, ai, wait, notify)
  3. Commande CLI destructive-données → requires_confirmation: true
  4. Si steps CLI présents → dry_run_possible déclaré (avertissement si absent)

"Destructif" = suppression irréversible de données ou modification système critique.
Les commandes de gestion de processus (kill, pkill, taskkill) sont exclues car
c'est un usage attendu des presets (fermer des applications avant un changement de mode).
"""

from __future__ import annotations

import re
from pathlib import Path

_KNOWN_STEP_TYPES = {"cli", "spotify", "tts", "ai", "wait", "notify"}

# Patterns de commandes destructives-données dans un step CLI.
# Exclut kill/pkill/taskkill (gestion de processus, usage attendu en preset).
_DESTRUCTIVE_PATTERNS = [
    re.compile(r"\brm\s+-[a-z]*r[a-z]*f"),     # rm -rf, rm -fr, rm -f -r
    re.compile(r"\brmdir\s+/[Ss]"),              # rmdir /S (Windows récursif)
    re.compile(r"\bdd\s+if="),
    re.compile(r"\bshutdown\b"),
    re.compile(r"\breboot\b"),
    re.compile(r"\bformat\s+[A-Z]:"),            # format C: (Windows)
    re.compile(r"\bgit\s+reset\s+--hard"),
    re.compile(r"\bgit\s+clean\s+-[^\s]*f"),
    re.compile(r"\bbrew\s+uninstall\b"),
    re.compile(r"\bpip\s+uninstall\b"),
    re.compile(r"\bnpm\s+uninstall\b"),
    re.compile(r"DROP\s+TABLE", re.IGNORECASE),
    re.compile(r"DELETE\s+FROM", re.IGNORECASE),
]


def _is_destructive(command: str) -> bool:
    return any(pat.search(command) for pat in _DESTRUCTIVE_PATTERNS)


def _step_commands(step: dict) -> list[str]:
    commands = []
    if "command" in step:
        commands.append(str(step["command"]))
    if "platforms" in step and isinstance(step["platforms"], dict):
        for cmd in step["platforms"].values():
            if cmd and isinstance(cmd, str):
                commands.append(cmd)
    return commands


def run(manifest: dict, contribution_path: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    # 1) triggers non-vide
    triggers = manifest.get("triggers") or []
    if not triggers:
        errors.append(
            "❌ preset_static_check: triggers vide [] — "
            "PresetSkill.SYSTEM_PROMPT sera vide et le Skill Lab refusera ce preset "
            "(gate system_prompt)"
        )

    steps = manifest.get("steps") or []
    has_cli_steps = False

    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append(f"❌ preset_static_check: step[{i}] n'est pas un objet")
            continue

        step_type = step.get("type", "")
        step_name = step.get("name", f"step[{i}]")

        # 2) Type connu
        if step_type not in _KNOWN_STEP_TYPES:
            errors.append(
                f"❌ preset_static_check: step '{step_name}' — type inconnu '{step_type}' "
                f"(types acceptés: {', '.join(sorted(_KNOWN_STEP_TYPES))})"
            )
            continue

        if step_type != "cli":
            continue

        has_cli_steps = True

        # 3) Commande destructive-données → requires_confirmation
        for cmd in _step_commands(step):
            if _is_destructive(cmd):
                if not step.get("requires_confirmation"):
                    errors.append(
                        f"❌ preset_static_check: step '{step_name}' — "
                        f"commande destructive sans requires_confirmation: true "
                        f"('{cmd[:60]}')"
                    )
                break

    # 4) dry_run_possible déclaré (avertissement — pas bloquant sur l'existant)
    if has_cli_steps and "dry_run_possible" not in manifest:
        warnings.append(
            "⚠ preset_static_check: steps CLI présents mais dry_run_possible non déclaré — "
            "ajouter dry_run_possible: true/false dans skill.yaml"
        )

    all_messages = errors + warnings
    return len(errors) == 0, all_messages
