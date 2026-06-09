#!/usr/bin/env python3
"""Délègue l'analyse de sécurité à scan_security.py — zéro duplication."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent


def run(contribution_path: Path) -> tuple[bool, list[str]]:
    """Appelle scan_security.py sur contribution_path. Échoue si au moins un CRITIQUE."""
    scan_script = SCRIPTS_DIR / "scan_security.py"
    if not scan_script.exists():
        return True, ["⚠ secrets_check: scan_security.py absent — ignoré"]

    try:
        result = subprocess.run(
            [sys.executable, str(scan_script), str(contribution_path), "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        return False, ["❌ secrets_check: timeout (30s)"]
    except OSError as exc:
        return False, [f"❌ secrets_check: impossible de lancer scan_security.py: {exc}"]

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        if result.returncode not in (0, 1):
            return False, [f"❌ secrets_check: erreur inattendue (rc={result.returncode})"]
        return True, []

    critiques = [
        f"❌ secrets_check: [{f['rule']}] {f['file']}:{f['line']} — {f['detail']}"
        for f in data.get("findings", [])
        if f.get("severity") == "CRITIQUE"
    ]
    return len(critiques) == 0, critiques
