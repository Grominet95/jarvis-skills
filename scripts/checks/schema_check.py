#!/usr/bin/env python3
"""Vérifie la conformité du manifest au schéma JSON (socle commun + spécifique type)."""

from __future__ import annotations

import json
from pathlib import Path

try:
    import jsonschema
    from jsonschema import Draft7Validator, RefResolver
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

SCHEMAS_DIR = Path(__file__).resolve().parent.parent.parent / "schemas"

_SCHEMA_MAP = {
    "conversational": "skill.schema.json",
    "preset": "preset.schema.json",
    "view": "view.schema.json",
}


def _build_store() -> dict:
    store: dict = {}
    for f in SCHEMAS_DIR.glob("*.schema.json"):
        try:
            schema = json.loads(f.read_text(encoding="utf-8"))
            if "$id" in schema:
                store[schema["$id"]] = schema
        except (json.JSONDecodeError, OSError):
            pass
    return store


def run(manifest: dict, contribution_type: str) -> tuple[bool, list[str]]:
    if not HAS_JSONSCHEMA:
        return True, ["⚠ schema_check: jsonschema non installé — ignoré"]

    schema_file = _SCHEMA_MAP.get(contribution_type)
    if not schema_file:
        return False, [f"❌ schema_check: type inconnu '{contribution_type}'"]

    schema_path = SCHEMAS_DIR / schema_file
    if not schema_path.exists():
        return True, [f"⚠ schema_check: {schema_file} absent — ignoré"]

    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return False, [f"❌ schema_check: impossible de lire {schema_file}: {exc}"]

    store = _build_store()
    resolver = RefResolver.from_schema(schema, store=store)
    validator = Draft7Validator(schema, resolver=resolver)

    errors = []
    for err in sorted(validator.iter_errors(manifest), key=str):
        path = " → ".join(str(p) for p in err.path) or "racine"
        errors.append(f"❌ schema_check: {err.message} (champ: {path})")

    return len(errors) == 0, errors
