#!/usr/bin/env python3
"""
Scanner de sécurité statique pour le catalogue jarvis-skills.

Analyse les fichiers .py par AST sans jamais les exécuter ni les importer.
Exit code 0 = OK (au plus des ALERTE/INFO), 1 = au moins une CRITIQUE.

Usage:
    python scripts/scan_security.py               # tout le repo
    python scripts/scan_security.py skills/foo    # un skill précis
    python scripts/scan_security.py --json        # sortie JSON
"""
from __future__ import annotations

import ast
import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# Modèle
# ─────────────────────────────────────────────────────────────────────────────

CRITIQUE = "CRITIQUE"
ALERTE   = "ALERTE"
INFO     = "INFO"

SEVERITY_ORDER = {CRITIQUE: 0, ALERTE: 1, INFO: 2}


@dataclass
class Finding:
    severity: str
    file: str
    line: int
    rule: str
    detail: str

    def __str__(self) -> str:
        return f"[{self.severity}] {self.file}:{self.line} — {self.rule}: {self.detail}"


@dataclass
class ScanResult:
    findings: list[Finding] = field(default_factory=list)

    def add(self, severity: str, file: str, line: int, rule: str, detail: str) -> None:
        self.findings.append(Finding(severity, file, line, rule, detail))

    def has_critical(self) -> bool:
        return any(f.severity == CRITIQUE for f in self.findings)

    def sorted(self) -> list[Finding]:
        return sorted(self.findings, key=lambda f: (SEVERITY_ORDER[f.severity], f.file, f.line))


# ─────────────────────────────────────────────────────────────────────────────
# Chemins sensibles
# ─────────────────────────────────────────────────────────────────────────────

_SENSITIVE_PATH_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE) for p in [
        r"\.ssh",
        r"\.env",
        r"keychain",
        r"/etc/",
        r"id_rsa",
        r"id_ed25519",
        r"authorized_keys",
        r"known_hosts",
        r"\.gnupg",
        r"\.aws/credentials",
        r"\.netrc",
        r"Library/Keychains",
        r"login\.keychain",
        r"/proc/",
        r"/sys/",
        r"shadow$",
        r"passwd$",
    ]
]

_NETWORK_MODULES = {"requests", "httpx", "urllib", "urllib2", "urllib3", "aiohttp", "socket", "ssl"}

# Imports internes légitimes — jamais suspects
_INTERNAL_PREFIXES = ("skills.", "tools.", "background.", "views.")

# Modules inhabituels qui méritent un INFO
_UNUSUAL_MODULES = {
    "ctypes", "cffi", "mmap", "multiprocessing", "threading",
    "signal", "pty", "termios", "fcntl", "resource",
    "importlib", "types", "dis",
}


# ─────────────────────────────────────────────────────────────────────────────
# Lecture du YAML associé (pour croiser requires_tools / requires_env)
# ─────────────────────────────────────────────────────────────────────────────

def _load_yaml_meta(py_path: Path) -> dict:
    """Charge le skill.yaml du même dossier sans dépendance PyYAML."""
    yaml_path = py_path.parent / "skill.yaml"
    if not yaml_path.exists():
        return {}
    try:
        import yaml  # type: ignore
        with yaml_path.open(encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        return data
    except Exception:
        # PyYAML absent ou YAML invalide — parse minimal maison
        return _minimal_yaml_parse(yaml_path)


def _minimal_yaml_parse(path: Path) -> dict:
    """Parser YAML minimaliste pour extraire requires_tools et requires_env."""
    result: dict = {"requires_tools": [], "requires_env": []}
    current_list: Optional[str] = None
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("requires_tools:"):
                inline = stripped[len("requires_tools:"):].strip()
                if inline.startswith("["):
                    result["requires_tools"] = [
                        s.strip().strip('"\'')
                        for s in inline.strip("[]").split(",")
                        if s.strip()
                    ]
                current_list = "requires_tools"
            elif stripped.startswith("requires_env:"):
                inline = stripped[len("requires_env:"):].strip()
                if inline.startswith("["):
                    result["requires_env"] = [
                        s.strip().strip('"\'')
                        for s in inline.strip("[]").split(",")
                        if s.strip()
                    ]
                current_list = "requires_env"
            elif stripped.startswith("- ") and current_list:
                val = stripped[2:].strip().strip('"\'')
                if val:
                    result[current_list].append(val)
            elif stripped and not stripped.startswith("#") and ":" in stripped and not stripped.startswith("-"):
                current_list = None
    except Exception:
        pass
    return result


def _yaml_declares_network(meta: dict) -> bool:
    """Retourne True si le yaml déclare un outil réseau (browser, requests…)."""
    tools: list = meta.get("requires_tools", []) or []
    network_keywords = {"browser", "requests", "http", "web", "search", "fetch", "url"}
    return any(
        any(kw in str(t).lower() for kw in network_keywords)
        for t in tools
    )


def _yaml_declares_env(meta: dict, var_name: str) -> bool:
    envs = meta.get("requires_env", []) or []
    for e in envs:
        name = e if isinstance(e, str) else (e.get("name", "") if isinstance(e, dict) else "")
        if name == var_name:
            return True
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Helpers AST
# ─────────────────────────────────────────────────────────────────────────────

def _call_name(node: ast.Call) -> str:
    """Retourne le nom qualifié d'un appel, ex. 'os.system' ou 'subprocess.run'."""
    func = node.func
    if isinstance(func, ast.Attribute):
        val = func.value
        if isinstance(val, ast.Name):
            return f"{val.id}.{func.attr}"
        if isinstance(val, ast.Attribute) and isinstance(val.value, ast.Name):
            return f"{val.value.id}.{val.attr}.{func.attr}"
    if isinstance(func, ast.Name):
        return func.id
    return ""


def _has_kwarg(node: ast.Call, name: str) -> Optional[ast.expr]:
    """Retourne la valeur d'un keyword arg s'il existe."""
    for kw in node.keywords:
        if kw.arg == name:
            return kw.value
    return None


def _is_truthy_literal(node: ast.expr) -> bool:
    """True si le nœud est littéralement True ou une chaîne non vide."""
    if isinstance(node, ast.Constant):
        return bool(node.value)
    if isinstance(node, ast.NameConstant):  # Python <3.8
        return bool(node.value)
    return False


def _string_value(node: ast.expr) -> Optional[str]:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _collect_imports(tree: ast.Module) -> dict[str, str]:
    """
    Retourne un dict alias → module_racine.
    Ex: import os → {"os": "os"}
        from requests import get → {"get": "requests"}
        import subprocess as sp → {"sp": "subprocess"}
    """
    mapping: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                key = alias.asname if alias.asname else alias.name.split(".")[0]
                mapping[key] = alias.name.split(".")[0]
        elif isinstance(node, ast.ImportFrom):
            mod = (node.module or "").split(".")[0]
            for alias in node.names:
                key = alias.asname if alias.asname else alias.name
                mapping[key] = mod
    return mapping


# ─────────────────────────────────────────────────────────────────────────────
# Règles de détection
# ─────────────────────────────────────────────────────────────────────────────

class _Visitor(ast.NodeVisitor):
    """Visiteur AST qui accumule les findings pour un fichier."""

    def __init__(self, src: str, rel_path: str, meta: dict) -> None:
        self.src = src
        self.rel_path = rel_path
        self.meta = meta
        self.result = ScanResult()
        # Collecte des imports en première passe (remplie avant visit_Call)
        self._imports: dict[str, str] = {}
        self._network_calls_found = False

    # ── Utilitaire interne ────────────────────────────────────────────────

    def _add(self, severity: str, line: int, rule: str, detail: str) -> None:
        self.result.add(severity, self.rel_path, line, rule, detail)

    # ── Imports ───────────────────────────────────────────────────────────

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = alias.name.split(".")[0]
            self._check_import(root, node.lineno, alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        mod = node.module or ""
        root = mod.split(".")[0]
        if root:
            self._check_import(root, node.lineno, mod)
        self.generic_visit(node)

    def _check_import(self, root: str, line: int, full: str) -> None:
        # Ignorer les imports internes Jarvis
        if any(full.startswith(p.rstrip(".")) for p in _INTERNAL_PREFIXES):
            return
        if root in _NETWORK_MODULES:
            self._network_calls_found = True
        if root in _UNUSUAL_MODULES:
            self._add(INFO, line, "import-inhabituel",
                      f"Module '{full}' inhabituel dans un skill Jarvis")

    # ── Appels de fonctions ───────────────────────────────────────────────

    def visit_Call(self, node: ast.Call) -> None:
        name = _call_name(node)

        # ── CRITIQUES ────────────────────────────────────────────────────

        # os.system
        if name in ("os.system", "os.popen"):
            self._add(CRITIQUE, node.lineno, "exec-os-system",
                      f"Appel à '{name}' : exécution de commandes shell arbitraires")

        # subprocess avec shell=True
        if name.startswith("subprocess."):
            shell_kw = _has_kwarg(node, "shell")
            if shell_kw is not None and _is_truthy_literal(shell_kw):
                self._add(CRITIQUE, node.lineno, "subprocess-shell-true",
                          f"'{name}(shell=True)' : injection shell possible")

        # eval / exec / compile
        if name in ("eval", "exec", "compile"):
            self._add(CRITIQUE, node.lineno, "eval-exec",
                      f"Appel à '{name}' : exécution de code dynamique")

        # __import__ dynamique (argument non-constant)
        if name == "__import__":
            if node.args:
                if not isinstance(node.args[0], ast.Constant):
                    self._add(CRITIQUE, node.lineno, "import-dynamique",
                              "__import__() avec argument dynamique")
            else:
                self._add(CRITIQUE, node.lineno, "import-dynamique",
                          "__import__() sans argument littéral")

        # pickle.loads / pickle.load
        if name in ("pickle.loads", "pickle.load", "pickle.Unpickler"):
            self._add(CRITIQUE, node.lineno, "pickle-deserialisation",
                      f"'{name}' : désérialisation pickle non sûre (RCE possible)")

        # socket direct (socket.socket)
        if name in ("socket.socket", "socket.create_connection", "socket.connect"):
            self._add(CRITIQUE, node.lineno, "socket-brut",
                      f"Ouverture de socket brut via '{name}'")

        # open() en écriture — hors du répertoire du skill (heuristique)
        if name == "open":
            self._check_open(node)

        # Chemins sensibles dans les arguments string
        self._check_sensitive_paths(node, name)

        # os.environ.setdefault / os.putenv — exfiltration indirecte
        if name in ("os.putenv", "os.environ.update"):
            self._add(ALERTE, node.lineno, "env-mutation",
                      f"'{name}' modifie l'environnement du processus")

        # ── Appels réseau (ALERTE si non déclaré dans le yaml) ───────────
        if self._is_network_call(name):
            self._network_calls_found = True
            if not _yaml_declares_network(self.meta):
                self._add(ALERTE, node.lineno, "reseau-non-declare",
                          f"Appel réseau '{name}' non déclaré dans requires_tools du skill.yaml")
            # URL en dur dans les args → CRITIQUE (exfiltration potentielle)
            self._check_hardcoded_url(node, name)

        # os.getenv / os.environ sur une variable non déclarée
        if name in ("os.getenv", "os.environ.get", "os.environ.__getitem__"):
            self._check_undeclared_env(node, name)

        self.generic_visit(node)

    def _is_network_call(self, name: str) -> bool:
        net_calls = {
            "requests.get", "requests.post", "requests.put", "requests.delete",
            "requests.patch", "requests.head", "requests.request", "requests.Session",
            "httpx.get", "httpx.post", "httpx.put", "httpx.delete", "httpx.patch",
            "httpx.request", "httpx.AsyncClient", "httpx.Client",
            "urllib.request.urlopen", "urllib.request.urlretrieve",
            "urllib2.urlopen", "aiohttp.ClientSession",
        }
        return name in net_calls

    def _check_open(self, node: ast.Call) -> None:
        """Détecte open() en écriture ou vers un chemin sensible."""
        write_modes = {"w", "wb", "a", "ab", "x", "xb", "w+", "r+b"}
        mode: Optional[str] = None

        # 2e argument positionnel
        if len(node.args) >= 2:
            mode = _string_value(node.args[1])

        # keyword mode=
        mode_kw = _has_kwarg(node, "mode")
        if mode_kw is not None:
            mode = _string_value(mode_kw)

        if mode and mode in write_modes:
            # Écriture vers un chemin sensible → CRITIQUE
            if node.args:
                path_val = _string_value(node.args[0])
                if path_val:
                    for pat in _SENSITIVE_PATH_PATTERNS:
                        if pat.search(path_val):
                            self._add(CRITIQUE, node.lineno, "ecriture-chemin-sensible",
                                      f"Écriture dans un chemin sensible : '{path_val}'")
                            return
                    # Chemin absolu hors workspace → ALERTE
                    if path_val.startswith("/") or path_val.startswith("~"):
                        self._add(ALERTE, node.lineno, "ecriture-chemin-absolu",
                                  f"Écriture vers un chemin absolu : '{path_val}'")
                else:
                    # Chemin dynamique en écriture
                    self._add(ALERTE, node.lineno, "ecriture-dynamique",
                              "open() en écriture avec chemin dynamique")

    def _check_sensitive_paths(self, node: ast.Call, name: str) -> None:
        """Vérifie si un argument string contient un chemin sensible."""
        for arg in node.args:
            val = _string_value(arg)
            if val:
                for pat in _SENSITIVE_PATH_PATTERNS:
                    if pat.search(val):
                        # Si c'est dans un open() en lecture → ALERTE
                        if name == "open":
                            self._add(ALERTE, node.lineno, "lecture-chemin-sensible",
                                      f"Lecture d'un chemin potentiellement sensible : '{val}'")
                        elif name not in ("print", "logging.info", "logging.debug"):
                            self._add(ALERTE, node.lineno, "chemin-sensible",
                                      f"Référence à un chemin sensible dans '{name}' : '{val}'")
                        break

    def _check_hardcoded_url(self, node: ast.Call, name: str) -> None:
        """URL en dur non-localhost dans un appel réseau → CRITIQUE (exfiltration)."""
        for arg in node.args:
            val = _string_value(arg)
            if val and re.search(r"https?://", val):
                if not re.search(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)", val):
                    self._add(CRITIQUE, node.lineno, "url-en-dur",
                              f"URL en dur dans '{name}' : '{val[:80]}' — exfiltration possible")
                    return
        # kwargs aussi (url=, endpoint=)
        for kw in node.keywords:
            if kw.arg in ("url", "endpoint", "base_url"):
                val = _string_value(kw.value)
                if val and re.search(r"https?://", val):
                    if not re.search(r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)", val):
                        self._add(CRITIQUE, node.lineno, "url-en-dur",
                                  f"URL en dur dans '{name}' (kwarg {kw.arg}) : '{val[:80]}'")
                        return

    def _check_undeclared_env(self, node: ast.Call, name: str) -> None:
        """os.getenv/os.environ.get sur variable non déclarée dans le yaml."""
        if not node.args:
            return
        var = _string_value(node.args[0])
        if var and not _yaml_declares_env(self.meta, var):
            self._add(ALERTE, node.lineno, "env-non-declare",
                      f"Variable d'env '{var}' lue mais non déclarée dans requires_env du skill.yaml")

    # ── Expressions (obfuscation) ─────────────────────────────────────────

    def visit_Constant(self, node: ast.Constant) -> None:
        if isinstance(node.value, str):
            self._check_obfuscation(node.value, node.lineno)
        self.generic_visit(node)

    def _check_obfuscation(self, value: str, line: int) -> None:
        # Longue chaîne base64 (≥ 80 chars de l'alphabet base64)
        if len(value) >= 80 and re.fullmatch(r"[A-Za-z0-9+/=\n]+", value):
            self._add(INFO, line, "chaine-base64",
                      f"Chaîne ressemblant à du base64 ({len(value)} chars) — vérifier si obfuscation")

        # Encodage \x
        if value.count("\\x") >= 4 or (len(value) > 10 and re.search(r"\\x[0-9a-fA-F]{2}", value)):
            self._add(INFO, line, "chaine-xencoding",
                      "Chaîne avec encodage \\x — vérifier si obfuscation")

    # ── Attributs (accès os.environ direct, dunder) ───────────────────────

    def visit_Attribute(self, node: ast.Attribute) -> None:
        # __reduce__ / __reduce_ex__ sur une classe → pickle-like RCE
        if node.attr in ("__reduce__", "__reduce_ex__"):
            self._add(ALERTE, node.lineno, "reduce-pickle",
                      f"Accès à '{node.attr}' : peut être utilisé pour un gadget pickle/RCE")
        self.generic_visit(node)

    # ── Nœuds exec (Python 2 vestige via ast) ────────────────────────────

    def visit_Exec(self, node: ast.AST) -> None:  # type: ignore[override]
        # ast.Exec existe en Python 2; en Python 3 c'est un appel — couvert par visit_Call
        self._add(CRITIQUE, getattr(node, "lineno", 0), "eval-exec",
                  "Instruction exec (Python 2)")
        self.generic_visit(node)


# ─────────────────────────────────────────────────────────────────────────────
# Scanner principal
# ─────────────────────────────────────────────────────────────────────────────

def scan_file(py_path: Path, root: Path) -> ScanResult:
    """Analyse un fichier .py par AST et retourne les findings."""
    try:
        rel = str(py_path.relative_to(root))
    except ValueError:
        rel = str(py_path)
    try:
        src = py_path.read_text(encoding="utf-8")
    except Exception as exc:
        r = ScanResult()
        r.add(ALERTE, rel, 0, "lecture-impossible", str(exc))
        return r

    try:
        tree = ast.parse(src, filename=rel)
    except SyntaxError as exc:
        r = ScanResult()
        r.add(ALERTE, rel, exc.lineno or 0, "syntax-error",
              f"Erreur de syntaxe Python : {exc.msg}")
        return r

    meta = _load_yaml_meta(py_path)
    visitor = _Visitor(src, rel, meta)
    # Collecte des imports avant la visite complète
    visitor._imports = _collect_imports(tree)
    visitor.visit(tree)
    return visitor.result


def scan_directory(target: Path, root: Path) -> ScanResult:
    """Scanne tous les .py dans target (récursivement) sauf ce fichier lui-même."""
    combined = ScanResult()
    this_file = Path(__file__).resolve()
    py_files = sorted(target.rglob("*.py"))
    for f in py_files:
        if f.resolve() == this_file:
            continue
        r = scan_file(f, root)
        combined.findings.extend(r.findings)
    return combined


# ─────────────────────────────────────────────────────────────────────────────
# Affichage
# ─────────────────────────────────────────────────────────────────────────────

_COLORS = {
    CRITIQUE: "\033[91m",  # rouge
    ALERTE:   "\033[93m",  # jaune
    INFO:     "\033[94m",  # bleu
    "RESET":  "\033[0m",
    "BOLD":   "\033[1m",
}


def _c(severity: str, text: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{_COLORS.get(severity, '')}{text}{_COLORS['RESET']}"


def print_report(result: ScanResult) -> None:
    findings = result.sorted()
    if not findings:
        print(_c("INFO", "✔ Aucun problème détecté."))
        return

    counts = {CRITIQUE: 0, ALERTE: 0, INFO: 0}
    for f in findings:
        counts[f.severity] += 1

    for f in findings:
        icon = {"CRITIQUE": "✖", "ALERTE": "⚠", "INFO": "ℹ"}[f.severity]
        prefix = _c(f.severity, f"{icon} [{f.severity}]")
        loc    = _c("BOLD", f"{f.file}:{f.line}")
        print(f"{prefix} {loc}")
        print(f"  Règle   : {f.rule}")
        print(f"  Détail  : {f.detail}")
        print()

    print("─" * 60)
    print(f"  CRITIQUE : {_c(CRITIQUE, str(counts[CRITIQUE]))}")
    print(f"  ALERTE   : {_c(ALERTE,   str(counts[ALERTE]))}")
    print(f"  INFO     : {_c(INFO,     str(counts[INFO]))}")
    print("─" * 60)

    if result.has_critical():
        print(_c(CRITIQUE, "\n✖ Build bloqué : des problèmes CRITIQUES ont été détectés.\n"))
    else:
        print(_c(ALERTE, "\n⚠ Revue humaine recommandée pour les ALERTE/INFO.\n"))


def print_json(result: ScanResult) -> None:
    data = [
        {
            "severity": f.severity,
            "file": f.file,
            "line": f.line,
            "rule": f.rule,
            "detail": f.detail,
        }
        for f in result.sorted()
    ]
    print(json.dumps({"findings": data, "has_critical": result.has_critical()}, ensure_ascii=False, indent=2))


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scanner de sécurité statique pour jarvis-skills.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Exit 0 = OK/ALERTE/INFO seulement   Exit 1 = au moins une CRITIQUE",
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=None,
        help="Chemin à analyser (fichier ou dossier). Défaut : tout le repo.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Sortie au format JSON (CI-friendly).",
    )
    args = parser.parse_args()

    # Racine du repo = répertoire parent de ce script
    repo_root = Path(__file__).resolve().parent.parent

    if args.target:
        target = Path(args.target).resolve()
    else:
        # Par défaut : skills/ + views/
        target = repo_root

    if target.is_file():
        result = scan_file(target, repo_root)
    elif target.is_dir():
        # Si target est la racine, limiter aux dossiers pertinents
        if target == repo_root:
            result = ScanResult()
            for sub in ("skills", "views"):
                sub_path = repo_root / sub
                if sub_path.exists():
                    r = scan_directory(sub_path, repo_root)
                    result.findings.extend(r.findings)
        else:
            result = scan_directory(target, repo_root)
    else:
        print(f"Erreur : '{target}' n'existe pas.", file=sys.stderr)
        return 2

    if args.json:
        print_json(result)
    else:
        print_report(result)

    return 1 if result.has_critical() else 0


if __name__ == "__main__":
    sys.exit(main())
