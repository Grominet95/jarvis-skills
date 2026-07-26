#!/usr/bin/env python3
"""Génère index.json depuis les manifestes skill.yaml et VIEW.md.

Source de vérité : les fichiers manifestes individuels (skills/*/skill.yaml,
views/*/skill.yaml ou views/*/VIEW.md). index.json est une vue dérivée —
ne jamais l'éditer à la main.

Usage :
    python scripts/build_index.py           # écriture
    python scripts/build_index.py --check   # compare sans écrire (CI)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"
VIEWS_DIR = ROOT / "views"
INDEX_PATH = ROOT / "index.json"

INDEX_FORMAT_VERSION = "2.0"

_YAML_PLAIN_SCALAR_RE = re.compile(
    r'^([ \t]*[a-zA-Z_][a-zA-Z0-9_-]*[ \t]*:[ \t]+)([^"\'{|>\[\n][^\n]*)$',
    re.MULTILINE,
)
_KEBAB_ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


# ── YAML helpers ───────────────────────────────────────────────────────────────

def _yaml_repair(content: str) -> str:
    def _quote(m: re.Match) -> str:
        prefix, value = m.group(1), m.group(2).rstrip()
        if ": " not in value:
            return m.group(0)
        stripped = value.strip()
        if stripped and stripped[0] in ('"', "'", "[", "{", "|", ">", "&", "*"):
            return m.group(0)
        escaped = stripped.replace("\\", "\\\\").replace('"', '\\"')
        return f'{prefix}"{escaped}"'
    return _YAML_PLAIN_SCALAR_RE.sub(_quote, content)


def _load_yaml(path: Path) -> Optional[dict]:
    try:
        content = path.read_text(encoding="utf-8")
        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError:
            data = yaml.safe_load(_yaml_repair(content))
        return data if isinstance(data, dict) else None
    except (OSError, yaml.YAMLError):
        return None


def _load_view_frontmatter(view_md: Path) -> Optional[dict]:
    try:
        content = view_md.read_text(encoding="utf-8")
        parts = content.split("---")
        if len(parts) < 3:
            return None
        try:
            data = yaml.safe_load(parts[1])
        except yaml.YAMLError:
            data = yaml.safe_load(_yaml_repair(parts[1]))
        return data if isinstance(data, dict) else None
    except (OSError, yaml.YAMLError):
        return None


# ── Normalisation ──────────────────────────────────────────────────────────────

def _norm_env(raw: Any) -> list[str]:
    if not raw or not isinstance(raw, list):
        return []
    result = []
    for item in raw:
        if isinstance(item, str) and item:
            result.append(item)
        elif isinstance(item, dict):
            name = item.get("name", "")
            if name:
                result.append(name)
    return result


def _norm_apps(raw: Any) -> list[str]:
    if not raw or not isinstance(raw, list):
        return []
    result = []
    for item in raw:
        if isinstance(item, str) and item:
            result.append(item)
        elif isinstance(item, dict):
            name = item.get("name", "")
            if name:
                result.append(name)
    return result


def _lst(raw: Any) -> list:
    if not raw or not isinstance(raw, list):
        return []
    return list(raw)


# ── Constructeurs d'entrées ────────────────────────────────────────────────────

def _skill_entry(dirname: str, data: dict) -> dict:
    return {
        "name": str(data.get("name", dirname)),
        "version": str(data.get("version", "")),
        "type": str(data.get("type", "conversational")),
        "author": str(data.get("author", "")),
        "description": str(data.get("description", "")),
        "tags": _lst(data.get("tags")),
        "path": f"skills/{dirname}",
        "requires_env": _norm_env(data.get("requires_env")),
        "requires_tools": _lst(data.get("requires_tools")),
        "requires_oauth": _lst(data.get("requires_oauth")),
        "requires_apps": _norm_apps(data.get("requires_apps")),
        "capabilities": _lst(data.get("capabilities")),
        "platforms": _lst(data.get("platforms")),
    }


def _preset_entry(dirname: str, data: dict) -> dict:
    entry = _skill_entry(dirname, data)
    entry["triggers"] = _lst(data.get("triggers"))
    return entry


def _view_entry_from_yaml(dirname: str, data: dict) -> dict:
    return {
        "name": str(data.get("name", dirname)),
        "version": str(data.get("version", "")),
        "author": str(data.get("author", "")),
        "description": str(data.get("description", "")),
        "tags": _lst(data.get("tags")),
        "path": f"views/{dirname}",
        "static_files": _lst(data.get("static_files")),
        "requires_tools": _lst(data.get("requires_tools")),
        "requires_env": _norm_env(data.get("requires_env")),
    }


def _view_entry_from_frontmatter(
    dirname: str,
    fm: dict,
    package_manifest: Optional[dict] = None,
) -> dict:
    frontend_id = str(fm.get("id", dirname))
    package_name = frontend_id
    if package_manifest:
        candidate = package_manifest.get("name")
        if isinstance(candidate, str) and _KEBAB_ID_RE.fullmatch(candidate):
            package_name = candidate

    entry = {
        "name": package_name,
        "version": str(fm.get("version", "")),
        "author": str(fm.get("author", "")),
        "description": str(fm.get("description", "")),
        "tags": _lst(fm.get("tags")),
        "path": f"views/{dirname}",
        "static_files": _lst((package_manifest or {}).get("static_files")),
        "requires_tools": _lst((package_manifest or {}).get("requires_tools")),
        "requires_env": _norm_env(fm.get("requires_env")),
    }
    if package_name != frontend_id:
        entry["view_id"] = frontend_id
    return entry


# ── Génération ─────────────────────────────────────────────────────────────────

def generate() -> dict:
    skills: list[dict] = []
    presets: list[dict] = []
    views: list[dict] = []

    if SKILLS_DIR.exists():
        for skill_dir in sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir()):
            yaml_path = skill_dir / "skill.yaml"
            if not yaml_path.exists():
                continue
            data = _load_yaml(yaml_path)
            if not data or "name" not in data:
                continue
            skill_type = str(data.get("type", "conversational"))
            if skill_type == "preset":
                presets.append(_preset_entry(skill_dir.name, data))
            elif skill_type == "conversational":
                skills.append(_skill_entry(skill_dir.name, data))

    if VIEWS_DIR.exists():
        for view_dir in sorted(
            d for d in VIEWS_DIR.iterdir()
            if d.is_dir() and d.name != "TEMPLATE"
        ):
            yaml_path = view_dir / "skill.yaml"
            package_manifest = _load_yaml(yaml_path) if yaml_path.exists() else None

            # VIEW.md décrit le frontend ; skill.yaml peut fournir l'identité installable.
            view_md = view_dir / "VIEW.md"
            if view_md.exists():
                fm = _load_view_frontmatter(view_md)
                if fm:
                    views.append(
                        _view_entry_from_frontmatter(
                            view_dir.name,
                            fm,
                            package_manifest,
                        )
                    )
                    continue

            # Fallback skill.yaml (type: view)
            if package_manifest and "name" in package_manifest:
                views.append(_view_entry_from_yaml(view_dir.name, package_manifest))

    return {
        "version": INDEX_FORMAT_VERSION,
        "updated_at": str(date.today()),
        "skills": skills,
        "presets": presets,
        "views": views,
    }


# ── Mode --check ───────────────────────────────────────────────────────────────

def _sort(entries: list[dict]) -> list[dict]:
    return sorted(entries, key=lambda e: e.get("name", ""))


def check() -> bool:
    if not INDEX_PATH.exists():
        print("✗ index.json absent — lancez : python scripts/build_index.py")
        return False
    try:
        current = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        print(f"✗ index.json illisible : {exc}")
        return False

    generated = generate()
    ok = True
    for key in ("skills", "presets", "views"):
        cur = _sort(current.get(key) or [])
        gen = _sort(generated.get(key) or [])
        if cur != gen:
            ok = False
            print(f"✗ index.json['{key}'] désynchronisé avec les manifestes.")
            cur_names = {e.get("name", "?") for e in cur}
            gen_names = {e.get("name", "?") for e in gen}
            added = gen_names - cur_names
            removed = cur_names - gen_names
            if added:
                print(f"  Manifestes sans entrée index : {sorted(added)}")
            if removed:
                print(f"  Entrées index sans manifeste : {sorted(removed)}")
            if not added and not removed:
                for g, c in zip(gen, cur):
                    if g != c:
                        print(f"  '{g['name']}' : contenu modifié")

    if ok:
        totals = (
            f"{len(generated['skills'])} skill(s), "
            f"{len(generated['presets'])} preset(s), "
            f"{len(generated['views'])} vue(s)"
        )
        print(f"✓ index.json à jour — {totals}")
    else:
        print("\nLancez : python scripts/build_index.py")
    return ok


# ── Écriture ───────────────────────────────────────────────────────────────────

def write() -> None:
    index = generate()
    INDEX_PATH.write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    totals = (
        f"{len(index['skills'])} skill(s), "
        f"{len(index['presets'])} preset(s), "
        f"{len(index['views'])} vue(s)"
    )
    print(f"✓ index.json régénéré — {totals} — updated_at : {index['updated_at']}")


# ── Point d'entrée ─────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Génère index.json depuis les manifestes skill.yaml et VIEW.md."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Vérifie que index.json est synchronisé sans le modifier (exit ≠ 0 si désynchronisé).",
    )
    args = parser.parse_args()
    if args.check:
        return 0 if check() else 1
    write()
    return 0


if __name__ == "__main__":
    sys.exit(main())
