#!/usr/bin/env python3
"""
Orchestrateur de validation du catalogue jarvis-skills.

Détecte le type de contribution (skill / preset / vue), charge le manifest,
lance les checks pertinents et produit une sortie déterministe.

Usage :
  python scripts/validate_catalog.py skills/mon-skill       # un élément
  python scripts/validate_catalog.py views/globe            # idem pour une vue
  python scripts/validate_catalog.py --all                  # tout le catalogue

Sortie :
  ✅ check_name          — check passé
  ❌ check_name: raison  — check échoué (actionnable)
  ⚠  check_name: raison  — avertissement (ne bloque pas le build)

Exit code 0 = tout vert (ou seulement des ⚠). ≠ 0 si au moins un ❌.

Aucun code de contribution n'est jamais importé ni exécuté.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"
VIEWS_DIR = ROOT / "views"

# Correctif YAML pyyaml (scalaires non-quotés contenant ': ')
_YAML_PLAIN_SCALAR_RE = re.compile(
    r'^([ \t]*[a-zA-Z_][a-zA-Z0-9_-]*[ \t]*:[ \t]+)([^"\'{|>\[\n][^\n]*)$',
    re.MULTILINE,
)


def _yaml_repair(content: str) -> str:
    def _quote(m: re.Match) -> str:
        prefix, value = m.group(1), m.group(2).rstrip()
        if ": " not in value:
            return m.group(0)
        stripped = value.strip()
        if stripped and stripped[0] in ('"', "'", "[", "{", "|", ">", "&", "*"):
            return m.group(0)
        escaped = stripped.replace("\\", "\\\\").replace('"', '\\"')
        return f'{prefix}"{escaped}"\n'
    return _YAML_PLAIN_SCALAR_RE.sub(_quote, content)


def _load_yaml(path: Path):
    try:
        content = path.read_text(encoding="utf-8")
        try:
            data = yaml.safe_load(content)
        except yaml.YAMLError:
            data = yaml.safe_load(_yaml_repair(content))
        return data if isinstance(data, dict) else None
    except (OSError, yaml.YAMLError):
        return None


def _load_view_frontmatter(view_md: Path):
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


# ── Détection de contribution ────────────────────────────────────────────────

def detect_contribution(path: Path):
    """Retourne (contribution_type, manifest) ou None si non reconnu.

    Priorités :
    - Si le dossier est sous views/ OU si VIEW.md est présent → vue
    - Sinon, skill.yaml avec type conversational/preset → skill/preset
    Cette règle gère le cas views/globe qui a skill.yaml (type: view) ET VIEW.md.
    """
    view_md = path / "VIEW.md"
    yaml_path = path / "skill.yaml"

    # Vue : VIEW.md présent (prioritaire si dossier sous views/ ou type: view dans yaml)
    is_under_views = VIEWS_DIR in path.parents or path.parent == VIEWS_DIR
    yaml_type = ""
    if yaml_path.exists():
        data = _load_yaml(yaml_path)
        yaml_type = str((data or {}).get("type", ""))

    if view_md.exists() and (is_under_views or yaml_type == "view"):
        fm = _load_view_frontmatter(view_md)
        if fm:
            return "view", fm

    # Skill ou preset
    if yaml_path.exists():
        data = _load_yaml(yaml_path)
        if data and "name" in data:
            ctype = str(data.get("type", "conversational"))
            if ctype in ("conversational", "preset"):
                return ctype, data

    # Vue fallback (VIEW.md sans skill.yaml)
    if view_md.exists():
        fm = _load_view_frontmatter(view_md)
        if fm:
            return "view", fm

    return None


# ── Checks par type ──────────────────────────────────────────────────────────

def _run_checks(path: Path, contribution_type: str, manifest: dict) -> tuple[bool, list[str]]:
    """Lance les checks appropriés et retourne (overall_ok, all_messages)."""
    # Import ici pour éviter les imports circulaires au niveau module
    from checks import (
        env_check,
        index_check,
        permissions_check,
        preset_static_check,
        schema_check,
        secrets_check,
        skill_static_ast_check,
        view_static_check,
    )

    results: list[tuple[str, bool, list[str]]] = []

    def _run(name: str, ok: bool, msgs: list[str]) -> None:
        results.append((name, ok, msgs))

    _run("schema_check", *schema_check.run(manifest, contribution_type))
    _run("secrets_check", *secrets_check.run(path))
    _run("env_check", *env_check.run(manifest, path))

    if contribution_type in ("conversational", "preset"):
        _run("permissions_check", *permissions_check.run(manifest, contribution_type))
        _run("skill_static_ast_check", *skill_static_ast_check.run(path, contribution_type))

    if contribution_type == "preset":
        _run("preset_static_check", *preset_static_check.run(manifest, path))

    if contribution_type == "view":
        _run("view_static_check", *view_static_check.run(manifest, path))

    _run("index_check", *index_check.run(manifest, contribution_type, path))

    # Affichage et calcul du résultat global
    overall_ok = True
    all_messages: list[str] = []

    for check_name, ok, msgs in results:
        if ok and not msgs:
            print(f"  ✅ {check_name}")
        else:
            # Classer les messages
            errors = [m for m in msgs if m.startswith("❌")]
            warns = [m for m in msgs if m.startswith("⚠")]
            if errors:
                overall_ok = False
                for m in errors:
                    print(f"  {m}")
            if warns:
                for m in warns:
                    print(f"  {m}")
            if not errors and not warns:
                print(f"  ✅ {check_name}")
            elif not errors:
                print(f"  ✅ {check_name} (avec avertissement(s))")
        all_messages.extend(msgs)

    return overall_ok, all_messages


# ── Validation d'un élément ──────────────────────────────────────────────────

def validate_one(path: Path) -> bool:
    """Valide un dossier de contribution. Retourne True si OK."""
    path = path.resolve()
    if not path.is_dir():
        print(f"❌ '{path}' n'est pas un dossier", file=sys.stderr)
        return False

    result = detect_contribution(path)
    if result is None:
        print(
            f"❌ '{path.name}' : impossible de détecter le type "
            "(skill.yaml ou VIEW.md absent ou invalide)",
            file=sys.stderr,
        )
        return False

    contribution_type, manifest = result
    type_label = {"conversational": "skill", "preset": "preset", "view": "vue"}[contribution_type]

    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        rel = path

    print(f"\n{'─' * 60}")
    print(f"[{type_label.upper()}] {rel}")
    print(f"{'─' * 60}")

    ok, _ = _run_checks(path, contribution_type, manifest)

    print(f"\n  {'✅ OK' if ok else '❌ ÉCHEC'}")
    return ok


# ── Validation de tout le catalogue ─────────────────────────────────────────

def validate_all() -> bool:
    """Valide tous les éléments du catalogue. Retourne True si tout est vert."""
    total_ok = 0
    total_fail = 0

    dirs_to_scan = []

    if SKILLS_DIR.exists():
        dirs_to_scan += [(d, "skill") for d in sorted(SKILLS_DIR.iterdir()) if d.is_dir()]

    if VIEWS_DIR.exists():
        dirs_to_scan += [
            (d, "view")
            for d in sorted(VIEWS_DIR.iterdir())
            if d.is_dir() and d.name != "TEMPLATE"
        ]

    for path, _ in dirs_to_scan:
        ok = validate_one(path)
        if ok:
            total_ok += 1
        else:
            total_fail += 1

    print(f"\n{'=' * 60}")
    print(f"Catalogue : {total_ok} ✅ valide(s), {total_fail} ❌ échec(s)")
    print(f"{'=' * 60}")

    return total_fail == 0


# ── Point d'entrée ───────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Valide une contribution ou tout le catalogue jarvis-skills.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples :\n"
            "  python scripts/validate_catalog.py skills/web-researcher\n"
            "  python scripts/validate_catalog.py views/globe\n"
            "  python scripts/validate_catalog.py --all\n"
        ),
    )
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=None,
        help="Chemin vers le dossier de contribution (skills/foo ou views/bar)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Valide tout le catalogue (skills/ + views/)",
    )
    args = parser.parse_args()

    if args.all:
        return 0 if validate_all() else 1

    if args.path:
        target = args.path if args.path.is_absolute() else ROOT / args.path
        return 0 if validate_one(target) else 1

    parser.print_help()
    return 2


if __name__ == "__main__":
    # Ajouter scripts/ au path pour les imports relatifs des checks
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.exit(main())
