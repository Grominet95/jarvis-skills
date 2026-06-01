#!/usr/bin/env python3
"""Valide les manifestes de skills Jarvis contre les schémas JSON et les conventions."""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path
from typing import Optional

import yaml

try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = ROOT / "schemas"
SKILLS_DIR = ROOT / "skills"
VIEWS_DIR = ROOT / "views"

SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
KEBAB_RE = re.compile(r"^[a-z][a-z0-9-]*$")

# pyyaml refuse les scalaires non-quotés contenant ': ' (ex: "foo : bar").
# Motif limité aux espaces horizontaux ([ \t]) pour ne pas traverser les sauts de ligne.
_YAML_PLAIN_SCALAR_RE = re.compile(
    r'^([ \t]*[a-zA-Z_][a-zA-Z0-9_-]*[ \t]*:[ \t]+)([^"\'{|>\[\n][^\n]*)$',
    re.MULTILINE,
)

# Motifs de détection de secrets potentiellement hardcodés dans le code source.
# Conçus pour détecter des valeurs littérales — pas des références à des variables.
_SECRET_PATTERNS = [
    r"sk-[a-zA-Z0-9]{20,}",
    r"AIza[0-9A-Za-z\-_]{35}",
    r"(?i)api[_-]?key\s*=\s*['\"][^'\"${\\\s]{8,}['\"]",
    r"(?i)(secret|token|password)\s*=\s*['\"][^'\"${\\\s]{8,}['\"]",
]
_SECRET_RES = [re.compile(p) for p in _SECRET_PATTERNS]


# ── Utilitaires ────────────────────────────────────────────────────────────────

def _yaml_repair_colons(content: str) -> str:
    """Cite les scalaires non-quotés contenant ': ' pour satisfaire pyyaml.

    pyyaml (YAML 1.1) refuse `: ` dans un scalaire plain non-quoté alors que
    certaines implémentations YAML l'acceptent. Cette fonction ajoute des guillemets
    autour des valeurs affectées afin de permettre la validation structurelle.
    """
    def _quote_value(m: re.Match) -> str:
        prefix, value = m.group(1), m.group(2).rstrip()
        if ": " not in value:
            return m.group(0)
        # Ne pas re-quoter ce qui est déjà structuré (listes, blocs, ancres…)
        stripped = value.strip()
        if stripped and stripped[0] in ('"', "'", "[", "{", "|", ">", "&", "*"):
            return m.group(0)
        escaped = stripped.replace("\\", "\\\\").replace('"', '\\"')
        return f'{prefix}"{escaped}"\n'

    return _YAML_PLAIN_SCALAR_RE.sub(_quote_value, content)


def _load_yaml_lenient(content: str) -> tuple[Optional[dict], bool]:
    """Charge du YAML avec fallback de réparation des scalaires non-quotés.

    Retourne (data, repaired) où repaired=True indique qu'une réparation a eu lieu.
    Retourne (None, False) si le parsing échoue même après réparation.
    """
    try:
        return yaml.safe_load(content), False
    except yaml.YAMLError:
        pass
    try:
        repaired = _yaml_repair_colons(content)
        return yaml.safe_load(repaired), True
    except yaml.YAMLError:
        return None, False


def _load_schema(filename: str) -> Optional[dict]:
    """Charge un schéma JSON depuis schemas/. Retourne None si absent."""
    path = SCHEMAS_DIR / filename
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _validate_against_schema(data: dict, schema: dict) -> list[str]:
    """Valide data contre schema (Draft 7). Retourne la liste des erreurs."""
    if not HAS_JSONSCHEMA:
        return ["jsonschema non installé — validation de schéma ignorée"]
    errors: list[str] = []
    validator = jsonschema.Draft7Validator(schema)
    for err in sorted(validator.iter_errors(data), key=str):
        path = " → ".join(str(p) for p in err.path) or "racine"
        errors.append(f"  Schéma : {err.message} (champ : {path})")
    return errors


def _normalize_requires_env(raw: object) -> list[str]:
    """Normalise requires_env vers une liste de noms de variables."""
    if not raw or not isinstance(raw, list):
        return []
    result = []
    for item in raw:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            name = item.get("name", "")
            if name:
                result.append(name)
    return result


def _check_semver(version: object) -> bool:
    """Vérifie qu'une version est en format semver (X.Y.Z)."""
    return bool(SEMVER_RE.match(str(version)))


def _check_kebab(name: str) -> bool:
    """Vérifie qu'un identifiant est en kebab-case minuscule."""
    return bool(KEBAB_RE.match(name))


def _check_class_inheritance(skill_py: Path, expected_base: str) -> Optional[str]:
    """Vérifie via AST que skill.py définit une classe héritant de expected_base.

    Analyse statique uniquement — le code n'est jamais importé ni exécuté.
    Retourne None si OK, ou un message d'erreur.
    """
    if not skill_py.exists():
        return f"{skill_py.name} absent"
    try:
        source = skill_py.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(skill_py))
    except SyntaxError as exc:
        return f"Erreur de syntaxe Python dans {skill_py.name} : {exc}"

    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        for base in node.bases:
            base_name: str = ""
            if isinstance(base, ast.Name):
                base_name = base.id
            elif isinstance(base, ast.Attribute):
                base_name = base.attr
            if base_name == expected_base:
                return None  # classe trouvée ✓

    return f"Aucune classe héritant de {expected_base} dans {skill_py.name}"


def _check_hardcoded_secrets(source_file: Path) -> list[str]:
    """Recherche des patterns de clés API hardcodées dans source_file."""
    if not source_file.exists():
        return []
    try:
        text = source_file.read_text(encoding="utf-8")
    except OSError:
        return []
    found = []
    for pattern in _SECRET_RES:
        match = pattern.search(text)
        if match:
            snippet = pattern.pattern[:40].replace("\n", " ")
            found.append(f"Clé potentiellement hardcodée (motif: {snippet}…)")
    return found


def _check_requires_env_documented(raw: object) -> list[str]:
    """Vérifie que les requires_env de type objet ont une description."""
    if not raw or not isinstance(raw, list):
        return []
    issues = []
    for item in raw:
        if isinstance(item, dict) and not item.get("description"):
            var_name = item.get("name", "?")
            issues.append(f"requires_env '{var_name}' sans description")
    return issues


# ── Validation d'un skill ──────────────────────────────────────────────────────

def validate_skill(skill_dir: Path) -> tuple[bool, list[str]]:
    """Valide un dossier skills/ et retourne (succès, [messages]).

    Vérifie : schéma JSON, kebab-case, name == dirname, semver,
    héritage de classe (AST), secrets hardcodés, requires_env documentés.
    """
    messages: list[str] = []
    ok = True

    yaml_path = skill_dir / "skill.yaml"
    if not yaml_path.exists():
        return False, [f"skill.yaml absent dans skills/{skill_dir.name}/"]

    content = yaml_path.read_text(encoding="utf-8")
    data, repaired = _load_yaml_lenient(content)
    if data is None:
        return False, [f"YAML invalide dans {skill_dir.name}/skill.yaml (parsing échoué)"]
    if not isinstance(data, dict):
        return False, [f"skills/{skill_dir.name}/skill.yaml ne contient pas un objet YAML"]
    if repaired:
        messages.append(
            "  ⚠  skill.yaml : valeur non-quotée contenant ': ' — "
            "utilisez des guillemets autour de la description (ex: description: \"foo : bar\")"
        )

    skill_type = str(data.get("type", "conversational"))

    # — Validation de schéma JSON (dépendance docs/machine-standards)
    schema_map = {"conversational": "skill.schema.json", "preset": "preset.schema.json"}
    schema_file = schema_map.get(skill_type)
    if schema_file:
        schema = _load_schema(schema_file)
        if schema is None:
            messages.append(
                f"  ⚠  schemas/{schema_file} absent "
                f"— validation schéma ignorée (dépendance docs/machine-standards)"
            )
        else:
            for err in _validate_against_schema(data, schema):
                ok = False
                messages.append(err)

    # — Nom du dossier en kebab-case
    dirname = skill_dir.name
    if not _check_kebab(dirname):
        ok = False
        messages.append(f"  ✗ Dossier '{dirname}' n'est pas en kebab-case")

    # — name dans le yaml == nom du dossier
    name = str(data.get("name", ""))
    if name != dirname:
        ok = False
        messages.append(f"  ✗ name '{name}' ≠ dossier '{dirname}'")

    # — Version semver
    version = str(data.get("version", ""))
    if not _check_semver(version):
        ok = False
        messages.append(f"  ✗ version '{version}' n'est pas un semver valide (ex: 1.0.0)")

    # — skill.py : existence et héritage de classe (AST uniquement)
    skill_py = skill_dir / "skill.py"
    expected_base = "PresetSkill" if skill_type == "preset" else "SkillBase"
    ast_error = _check_class_inheritance(skill_py, expected_base)
    if ast_error:
        ok = False
        messages.append(f"  ✗ {ast_error}")

    # — Détection de secrets hardcodés dans skill.py
    if skill_py.exists():
        for secret_msg in _check_hardcoded_secrets(skill_py):
            ok = False
            messages.append(f"  ✗ {secret_msg}")

    # — requires_env documentés (avertissement, pas d'erreur)
    requires_env_raw = data.get("requires_env") or []
    for warn in _check_requires_env_documented(requires_env_raw):
        messages.append(f"  ⚠  {warn}")

    return ok, messages


# ── Validation d'une vue ───────────────────────────────────────────────────────

def validate_view(view_dir: Path) -> tuple[bool, list[str]]:
    """Valide VIEW.md d'un dossier views/ et retourne (succès, [messages]).

    Vérifie : frontmatter YAML, schéma JSON, champs obligatoires,
    id == dirname, kebab-case, semver, requires_env documentés.
    """
    messages: list[str] = []
    ok = True

    view_md = view_dir / "VIEW.md"
    if not view_md.exists():
        return False, [f"VIEW.md absent dans views/{view_dir.name}/"]

    content = view_md.read_text(encoding="utf-8")
    parts = content.split("---")
    if len(parts) < 3:
        return False, [
            f"views/{view_dir.name}/VIEW.md : frontmatter YAML manquant (délimiteurs --- absents)"
        ]

    front = parts[1]
    data, repaired = _load_yaml_lenient(front)
    if data is None:
        return False, [f"Frontmatter YAML invalide dans {view_dir.name}/VIEW.md (parsing échoué)"]
    if not isinstance(data, dict):
        return False, [f"views/{view_dir.name}/VIEW.md : frontmatter ne contient pas un objet YAML"]
    if repaired:
        messages.append(
            "  ⚠  VIEW.md : valeur non-quotée contenant ': ' — "
            "utilisez des guillemets autour des valeurs ambiguës"
        )

    # — Validation de schéma JSON (dépendance docs/machine-standards)
    schema = _load_schema("view.schema.json")
    if schema is None:
        messages.append(
            "  ⚠  schemas/view.schema.json absent "
            "— validation schéma ignorée (dépendance docs/machine-standards)"
        )
    else:
        for err in _validate_against_schema(data, schema):
            ok = False
            messages.append(err)

    # — Champs obligatoires
    for field in ("id", "name", "version", "author", "description", "tags"):
        if not data.get(field):
            ok = False
            messages.append(f"  ✗ Champ obligatoire '{field}' absent ou vide")

    # — id == nom du dossier
    view_id = str(data.get("id", ""))
    dirname = view_dir.name
    if view_id and view_id != dirname:
        ok = False
        messages.append(f"  ✗ id '{view_id}' ≠ dossier '{dirname}'")

    # — id en kebab-case
    if view_id and not _check_kebab(view_id):
        ok = False
        messages.append(f"  ✗ id '{view_id}' n'est pas en kebab-case")

    # — Version semver
    version = str(data.get("version", ""))
    if version and not _check_semver(version):
        ok = False
        messages.append(f"  ✗ version '{version}' n'est pas un semver valide")

    # — requires_env documentés (avertissement)
    requires_env_raw = data.get("requires_env") or []
    for warn in _check_requires_env_documented(requires_env_raw):
        messages.append(f"  ⚠  {warn}")

    return ok, messages


# ── Point d'entrée ─────────────────────────────────────────────────────────────

def main() -> int:
    """Valide tous les skills et vues. Retourne 0 si valide, 1 sinon."""
    total_ok = 0
    total_fail = 0
    total_warn = 0

    print("=" * 64)
    print("Validation des skills Jarvis")
    print("=" * 64)

    # — Skills (conversationnels et presets)
    if SKILLS_DIR.exists():
        for skill_dir in sorted(d for d in SKILLS_DIR.iterdir() if d.is_dir()):
            ok, messages = validate_skill(skill_dir)
            status = "✓" if ok else "✗"
            if ok:
                total_ok += 1
            else:
                total_fail += 1
            total_warn += sum(1 for m in messages if "⚠" in m)
            print(f"\n[{status}] skills/{skill_dir.name}/")
            for msg in messages:
                print(msg)

    # — Vues (via VIEW.md, TEMPLATE exclu)
    if VIEWS_DIR.exists():
        for view_dir in sorted(
            d for d in VIEWS_DIR.iterdir()
            if d.is_dir() and d.name != "TEMPLATE"
        ):
            ok, messages = validate_view(view_dir)
            status = "✓" if ok else "✗"
            if ok:
                total_ok += 1
            else:
                total_fail += 1
            total_warn += sum(1 for m in messages if "⚠" in m)
            print(f"\n[{status}] views/{view_dir.name}/")
            for msg in messages:
                print(msg)

    print("\n" + "=" * 64)
    print(
        f"Résultat : {total_ok} valide(s), "
        f"{total_fail} erreur(s), "
        f"{total_warn} avertissement(s)"
    )
    print("=" * 64)

    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
