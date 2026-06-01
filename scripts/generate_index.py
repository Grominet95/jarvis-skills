#!/usr/bin/env python3
"""Génère index.json depuis les manifestes skill.yaml et VIEW.md.

Source de vérité : les fichiers manifestes individuels (skills/*/skill.yaml,
views/*/skill.yaml ou views/*/VIEW.md). index.json est une vue dérivée.

Usage :
    python scripts/generate_index.py           # écriture
    python scripts/generate_index.py --check   # compare sans écrire (CI)
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

# Format de l'index. À incrémenter si la structure des tableaux change.
INDEX_FORMAT_VERSION = "2.0"

# Même correctif YAML que dans validate_skills.py (scalaires non-quotés).
_YAML_PLAIN_SCALAR_RE = re.compile(
    r'^([ \t]*[a-zA-Z_][a-zA-Z0-9_-]*[ \t]*:[ \t]+)([^"\'{|>\[\n][^\n]*)$',
    re.MULTILINE,
)


# ── Parsing YAML ───────────────────────────────────────────────────────────────

def _yaml_repair_colons(content: str) -> str:
    """Cite les scalaires YAML non-quotés contenant ': ' (limitation pyyaml)."""
    def _quote_value(m: re.Match) -> str:
        prefix, value = m.group(1), m.group(2).rstrip()
        if ": " not in value:
            return m.group(0)
        stripped = value.strip()
        if stripped and stripped[0] in ('"', "'", "[", "{", "|", ">", "&", "*"):
            return m.group(0)
        escaped = stripped.replace("\\", "\\\\").replace('"', '\\"')
        return f'{prefix}"{escaped}"'

    return _YAML_PLAIN_SCALAR_RE.sub(_quote_value, content)


def _load_yaml(path: Path) -> Optional[dict]:
    """Charge un fichier YAML avec réparation des scalaires non-quotés."""
    try:
        content = path.read_text(encoding="utf-8")
    except OSError:
        return None
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError:
        try:
            data = yaml.safe_load(_yaml_repair_colons(content))
        except yaml.YAMLError:
            return None
    return data if isinstance(data, dict) else None


def _load_view_md_frontmatter(view_md: Path) -> Optional[dict]:
    """Extrait et charge le frontmatter YAML d'un VIEW.md."""
    try:
        content = view_md.read_text(encoding="utf-8")
    except OSError:
        return None
    parts = content.split("---")
    if len(parts) < 3:
        return None
    try:
        data = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        try:
            data = yaml.safe_load(_yaml_repair_colons(parts[1]))
        except yaml.YAMLError:
            return None
    return data if isinstance(data, dict) else None


# ── Normalisation des champs ───────────────────────────────────────────────────

def _norm_env(raw: Any) -> list[str]:
    """Normalise requires_env vers une liste de noms de variables."""
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
    """Normalise requires_apps vers une liste de noms d'applications."""
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
    """Retourne une liste vide si raw est None ou non-liste."""
    if not raw or not isinstance(raw, list):
        return []
    return list(raw)


# ── Constructeurs d'entrées ────────────────────────────────────────────────────

def _skill_entry(dirname: str, data: dict) -> dict:
    """Construit l'entrée index pour un skill conversationnel."""
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
    """Construit l'entrée index pour un preset."""
    entry = _skill_entry(dirname, data)
    entry["triggers"] = _lst(data.get("triggers"))
    return entry


def _view_entry(dirname: str, data: dict) -> dict:
    """Construit l'entrée index pour une vue (depuis skill.yaml ou VIEW.md)."""
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


def _view_from_frontmatter(dirname: str, fm: dict) -> dict:
    """Construit l'entrée index depuis le frontmatter VIEW.md (champs différents)."""
    return {
        "name": str(fm.get("id", dirname)),
        "version": str(fm.get("version", "")),
        "author": str(fm.get("author", "")),
        "description": str(fm.get("description", "")),
        "tags": _lst(fm.get("tags")),
        "path": f"views/{dirname}",
        "static_files": [],
        "requires_tools": [],
        "requires_env": _norm_env(fm.get("requires_env")),
    }


# ── Génération ─────────────────────────────────────────────────────────────────

def generate() -> dict:
    """Génère le contenu complet de index.json depuis les manifestes."""
    skills: list[dict] = []
    presets: list[dict] = []
    views: list[dict] = []

    # — Skills et presets depuis skills/*/skill.yaml
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

    # — Vues depuis views/*/skill.yaml (priorité) ou VIEW.md (repli)
    if VIEWS_DIR.exists():
        for view_dir in sorted(
            d for d in VIEWS_DIR.iterdir()
            if d.is_dir() and d.name != "TEMPLATE"
        ):
            yaml_path = view_dir / "skill.yaml"
            if yaml_path.exists():
                data = _load_yaml(yaml_path)
                if data and "name" in data:
                    views.append(_view_entry(view_dir.name, data))
                    continue

            view_md = view_dir / "VIEW.md"
            if view_md.exists():
                fm = _load_view_md_frontmatter(view_md)
                if fm:
                    views.append(_view_from_frontmatter(view_dir.name, fm))

    return {
        "version": INDEX_FORMAT_VERSION,
        "updated_at": str(date.today()),
        "skills": skills,
        "presets": presets,
        "views": views,
    }


# ── Mode --check ───────────────────────────────────────────────────────────────

def _sort_by_name(entries: list[dict]) -> list[dict]:
    """Trie une liste d'entrées index par name."""
    return sorted(entries, key=lambda e: e.get("name", ""))


def check() -> bool:
    """Vérifie que index.json est synchronisé avec les manifestes.

    Compare uniquement les tableaux skills[], presets[], views[] (pas updated_at
    ni version qui sont des métadonnées de génération). Retourne True si OK.
    """
    if not INDEX_PATH.exists():
        print("✗ index.json absent — lancez : python scripts/generate_index.py")
        return False

    try:
        current = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        print(f"✗ index.json illisible : {exc}")
        return False

    generated = generate()
    ok = True

    for key in ("skills", "presets", "views"):
        current_arr = _sort_by_name(current.get(key) or [])
        generated_arr = _sort_by_name(generated.get(key) or [])

        if current_arr != generated_arr:
            ok = False
            print(f"✗ index.json['{key}'] désynchronisé avec les manifestes.")
            current_names = {e.get("name", "?") for e in current_arr}
            generated_names = {e.get("name", "?") for e in generated_arr}
            added = generated_names - current_names
            removed = current_names - generated_names
            if added:
                print(f"  Manifestes sans entrée index : {sorted(added)}")
            if removed:
                print(f"  Entrées index sans manifeste  : {sorted(removed)}")
            if not added and not removed:
                # Même noms mais contenu différent — lister les divergences
                for gen, cur in zip(generated_arr, current_arr):
                    if gen != cur:
                        print(f"  '{gen['name']}' : contenu modifié")

    if ok:
        totals = (
            f"{len(generated['skills'])} skill(s), "
            f"{len(generated['presets'])} preset(s), "
            f"{len(generated['views'])} vue(s)"
        )
        print(f"✓ index.json à jour — {totals}")
    else:
        print("\nLancez : python scripts/generate_index.py")

    return ok


# ── Écriture ───────────────────────────────────────────────────────────────────

def write() -> None:
    """Écrit index.json à partir des manifestes (opération idempotente)."""
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
    """Point d'entrée : génère ou vérifie index.json."""
    parser = argparse.ArgumentParser(
        description="Génère index.json depuis les manifestes skill.yaml et VIEW.md."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Vérifie que index.json est synchronisé sans le modifier. "
            "Retourne exit code 1 si désynchronisé."
        ),
    )
    args = parser.parse_args()

    if args.check:
        return 0 if check() else 1

    write()
    return 0


if __name__ == "__main__":
    sys.exit(main())
