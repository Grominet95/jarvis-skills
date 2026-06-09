#!/usr/bin/env python3
"""Vérifie que les variables d'environnement sont correctement documentées."""

from __future__ import annotations

import re
from pathlib import Path

_UPPER_SNAKE_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")


def run(manifest: dict, contribution_path: Path) -> tuple[bool, list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    requires_env = manifest.get("requires_env") or []

    for item in requires_env:
        if isinstance(item, str):
            # Forme courte : juste le nom — acceptée, mais nom doit être UPPER_SNAKE_CASE
            if not _UPPER_SNAKE_RE.match(item):
                warnings.append(
                    f"⚠ env_check: variable '{item}' n'est pas en UPPER_SNAKE_CASE"
                )
        elif isinstance(item, dict):
            name = item.get("name", "")
            description = item.get("description", "")
            if not name:
                errors.append("❌ env_check: item requires_env objet sans champ 'name'")
                continue
            if not _UPPER_SNAKE_RE.match(name):
                warnings.append(f"⚠ env_check: variable '{name}' n'est pas en UPPER_SNAKE_CASE")
            if not description:
                errors.append(f"❌ env_check: requires_env '{name}' sans description")
            # Vérifier que example ne ressemble pas à une vraie valeur sensible
            example = item.get("example", "")
            if example and item.get("sensitive") and len(example) > 20 and "..." not in example:
                warnings.append(
                    f"⚠ env_check: requires_env '{name}' sensitive=true — "
                    "tronquer l'exemple (ex: 'sk-abc...xyz')"
                )
        else:
            errors.append(f"❌ env_check: item requires_env invalide (type: {type(item).__name__})")

    return len(errors) == 0, errors + warnings
