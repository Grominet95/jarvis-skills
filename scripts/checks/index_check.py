#!/usr/bin/env python3
"""Vérifie la cohérence entre le manifest et index.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
INDEX_PATH = ROOT / "index.json"

_TYPE_TO_ARRAY = {
    "conversational": "skills",
    "preset": "presets",
    "view": "views",
}


def run(manifest: dict, contribution_type: str, contribution_path: Path) -> tuple[bool, list[str]]:
    if not INDEX_PATH.exists():
        return False, ["❌ index_check: index.json absent — lancer build_index.py"]

    try:
        index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return False, [f"❌ index_check: index.json illisible: {exc}"]

    array_key = _TYPE_TO_ARRAY.get(contribution_type)
    if not array_key:
        return False, [f"❌ index_check: type inconnu '{contribution_type}'"]

    entries = index.get(array_key) or []

    if contribution_type == "view":
        contrib_name = manifest.get("id") or contribution_path.name
    else:
        contrib_name = manifest.get("name") or contribution_path.name
    expected_path = contribution_path.relative_to(ROOT).as_posix()

    # Chercher l'entrée correspondante
    entry = next(
        (
            e
            for e in entries
            if e.get("name") == contrib_name
            or e.get("view_id") == contrib_name
            or e.get("path") == expected_path
        ),
        None,
    )

    if entry is None:
        return False, [
            f"❌ index_check: '{contrib_name}' absent de index.json['{array_key}'] "
            "— lancer build_index.py"
        ]

    errors = []
    # Vérifier que la version dans l'index correspond au manifest
    manifest_version = str(manifest.get("version", ""))
    index_version = str(entry.get("version", ""))
    if manifest_version and index_version and manifest_version != index_version:
        errors.append(
            f"❌ index_check: version désynchronisée — manifest: {manifest_version}, "
            f"index: {index_version} — lancer build_index.py"
        )

    return len(errors) == 0, errors
