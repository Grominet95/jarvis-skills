from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import re
import sys
import types
from pathlib import Path, PureWindowsPath

import yaml

ROOT = Path(__file__).resolve().parents[1]
GLOBE_DIR = ROOT / "views" / "globe"
EXPECTED_VIEW_JS_SHA256 = (
    "c197c78d53253dd2b1f47d82a1173fcdf849eb81bc344740a15e4e21a3303c87"
)
UNSUPPORTED_CLAIM_RE = re.compile(
    r"\b(?:vols?|flights?|m[ée]t[ée]o|meteo|weather|navires?|ships?|ais)\b",
    re.IGNORECASE,
)

FORBIDDEN_IMPORTS = {
    "tools.show_view",
    "background.notifications",
    "jarvis.capabilities.tools.show_view",
    "jarvis.engine.background.notifications",
}


def _load_module(name: str, path: Path) -> types.ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_globe_manifest() -> dict:
    return yaml.safe_load((GLOBE_DIR / "skill.yaml").read_text(encoding="utf-8"))


def _load_globe_view_frontmatter() -> dict:
    content = (GLOBE_DIR / "VIEW.md").read_text(encoding="utf-8")
    _, frontmatter, _ = content.split("---", 2)
    return yaml.safe_load(frontmatter)


def _globe_index_entry() -> dict:
    index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    matches = [
        entry
        for entry in index["views"]
        if entry.get("name") == "globe-view"
        or entry.get("view_id") == "globe"
        or entry.get("path") == "views/globe"
    ]
    assert len(matches) == 1
    return matches[0]


def _write_view_package(
    views_dir: Path,
    *,
    directory: str,
    package_name: str,
    frontend_id: str,
) -> None:
    view_dir = views_dir / directory
    view_dir.mkdir(parents=True)
    (view_dir / "skill.yaml").write_text(
        yaml.safe_dump(
            {
                "name": package_name,
                "version": "1.0.0",
                "type": "view",
                "static_files": [],
                "requires_tools": [],
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    (view_dir / "VIEW.md").write_text(
        (
            "---\n"
            f"id: {frontend_id}\n"
            f"name: {frontend_id.title()}\n"
            "version: 1.0.0\n"
            "author: test-author\n"
            "description: Vue de test locale\n"
            "tags: [test]\n"
            "glyph: TST\n"
            "requires_env: []\n"
            "---\n"
        ),
        encoding="utf-8",
    )


def test_globe_skill_manifest_contract() -> None:
    manifest = _load_globe_manifest()

    assert manifest["name"] == "globe-view"
    assert manifest["view_id"] == "globe"
    assert manifest["version"] == "1.2.1"
    assert manifest["schema_version"] == "1.0"
    assert manifest["type"] == "view"
    assert manifest["static_files"] == []

    mapbox_entries = [
        item
        for item in manifest["requires_env"]
        if isinstance(item, dict) and item.get("name") == "MAPBOX_TOKEN"
    ]
    assert len(mapbox_entries) == 1
    mapbox_entry = mapbox_entries[0]
    assert set(mapbox_entry) == {"name", "description", "example", "sensitive"}
    assert mapbox_entry["description"]
    assert mapbox_entry["example"].startswith("pk.")
    assert mapbox_entry["sensitive"] is True


def test_globe_skill_executes_without_registering_tools(
    monkeypatch,
) -> None:
    source = (GLOBE_DIR / "skill.py").read_text(encoding="utf-8")
    tree = ast.parse(source, filename="views/globe/skill.py")

    imported_modules = {
        node.module
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module
    }
    imported_modules.update(
        alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        for alias in node.names
    )
    assert imported_modules.isdisjoint(FORBIDDEN_IMPORTS)

    class FakeSkillBase:
        pass

    skills_package = types.ModuleType("skills")
    skills_package.__path__ = []
    skills_base = types.ModuleType("skills.base")
    skills_base.SkillBase = FakeSkillBase
    monkeypatch.setitem(sys.modules, "skills", skills_package)
    monkeypatch.setitem(sys.modules, "skills.base", skills_base)

    module = _load_module("test_globe_skill_module", GLOBE_DIR / "skill.py")
    skill = module.GlobeViewSkill()

    assert isinstance(skill.SYSTEM_PROMPT, str)
    assert skill.SYSTEM_PROMPT.strip()
    assert "globe" in skill.SYSTEM_PROMPT.lower()
    assert "view_id" in skill.SYSTEM_PROMPT
    assert "NIKYA" in skill.SYSTEM_PROMPT
    assert "cœur" in skill.SYSTEM_PROMPT
    assert skill.get_tools() == []


def test_generated_globe_index_contract() -> None:
    entry = _globe_index_entry()

    assert entry["name"] == "globe-view"
    assert entry["view_id"] == "globe"
    assert entry["path"] == "views/globe"
    assert entry["version"] == "1.2.1"
    assert entry["static_files"] == []
    assert "MAPBOX_TOKEN" in entry["requires_env"]
    assert "globe.js" not in entry["static_files"]
    assert "globe.css" not in entry["static_files"]


def test_published_globe_metadata_has_no_unsupported_claims() -> None:
    published_metadata = {
        "view": _load_globe_view_frontmatter(),
        "package": _load_globe_manifest(),
        "index": _globe_index_entry(),
    }

    for source, metadata in published_metadata.items():
        serialized = json.dumps(metadata, ensure_ascii=False)
        assert UNSUPPORTED_CLAIM_RE.search(serialized) is None, source


def test_supported_globe_capabilities_remain_published() -> None:
    manifest = _load_globe_manifest()
    view_metadata = _load_globe_view_frontmatter()
    entry = _globe_index_entry()

    assert manifest["capabilities"] == [
        "Afficher le globe terrestre interactif",
        "Naviguer vers une ville ou un monument",
        "Zoomer et dézoomer",
        "Faire pivoter la vue",
        "Déplacer la vue",
        "Recentrer sur une vue globale",
    ]

    for metadata in (view_metadata, manifest, entry):
        description = metadata["description"].lower()
        assert "globe terrestre" in description
        assert "interacti" in description
        assert "navigation" in description
        assert "zoom" in description
        assert "rotation" in description
        assert "recentrage" in description


def test_globe_frontend_is_byte_for_byte_unchanged() -> None:
    view_bytes = (GLOBE_DIR / "view.js").read_bytes()
    view_source = view_bytes.decode("utf-8")

    assert hashlib.sha256(view_bytes).hexdigest() == EXPECTED_VIEW_JS_SHA256
    assert "const VIEW_ID = 'globe';" in view_source
    assert "Jarvis.views.register(VIEW_ID" in view_source
    assert "fetch('/api/globe/config')" in view_source
    assert view_source.count("fetch(") == 1
    assert "/api/globe/flights" not in view_source
    assert "/api/globe/weather" not in view_source
    assert "new WebSocket" not in view_source
    assert re.search(r"\bAIS\b", view_source, re.IGNORECASE) is None


def test_build_index_separates_package_and_frontend_id(
    tmp_path: Path,
    monkeypatch,
) -> None:
    build_index_source = (ROOT / "scripts" / "build_index.py").read_text(
        encoding="utf-8"
    )
    assert "globe" not in build_index_source.lower()

    build_index = _load_module(
        "test_build_index_distinct_ids",
        ROOT / "scripts" / "build_index.py",
    )
    skills_dir = tmp_path / "skills"
    views_dir = tmp_path / "views"
    skills_dir.mkdir()
    views_dir.mkdir()
    _write_view_package(
        views_dir,
        directory="aurora",
        package_name="aurora-package",
        frontend_id="aurora",
    )
    _write_view_package(
        views_dir,
        directory="simple-view",
        package_name="simple-view",
        frontend_id="simple-view",
    )

    monkeypatch.setattr(build_index, "ROOT", tmp_path)
    monkeypatch.setattr(build_index, "SKILLS_DIR", skills_dir)
    monkeypatch.setattr(build_index, "VIEWS_DIR", views_dir)
    monkeypatch.setattr(build_index, "INDEX_PATH", tmp_path / "index.json")

    generated = build_index.generate()
    entries = {entry["name"]: entry for entry in generated["views"]}

    assert entries["aurora-package"]["view_id"] == "aurora"
    assert entries["aurora-package"]["path"] == "views/aurora"
    assert "/" in entries["aurora-package"]["path"]
    assert "\\" not in entries["aurora-package"]["path"]
    assert "view_id" not in entries["simple-view"]
    assert entries["simple-view"]["path"] == "views/simple-view"


class _WindowsContributionPath:
    name = "aurora"

    def relative_to(self, root: Path) -> PureWindowsPath:
        return PureWindowsPath("views", "aurora")


def test_index_check_normalizes_windows_path(
    tmp_path: Path,
    monkeypatch,
) -> None:
    index_check = _load_module(
        "test_index_check_windows_path",
        ROOT / "scripts" / "checks" / "index_check.py",
    )
    index_path = tmp_path / "index.json"
    index_path.write_text(
        json.dumps(
            {
                "views": [
                    {
                        "name": "aurora-package",
                        "version": "1.0.0",
                        "path": "views/aurora",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(index_check, "ROOT", tmp_path)
    monkeypatch.setattr(index_check, "INDEX_PATH", index_path)

    ok, errors = index_check.run(
        {
            "id": "aurora",
            "name": "Aurora Display Name",
            "version": "1.0.0",
        },
        "view",
        _WindowsContributionPath(),
    )

    assert ok is True
    assert errors == []


def test_index_check_prefers_view_id_to_display_name(
    tmp_path: Path,
    monkeypatch,
) -> None:
    index_check = _load_module(
        "test_index_check_view_id",
        ROOT / "scripts" / "checks" / "index_check.py",
    )
    index_path = tmp_path / "index.json"
    index_path.write_text(
        json.dumps(
            {
                "views": [
                    {
                        "name": "aurora-package",
                        "view_id": "aurora",
                        "version": "1.0.0",
                        "path": "views/different-path",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(index_check, "ROOT", tmp_path)
    monkeypatch.setattr(index_check, "INDEX_PATH", index_path)

    ok, errors = index_check.run(
        {
            "id": "aurora",
            "name": "Aurora Display Name",
            "version": "1.0.0",
        },
        "view",
        _WindowsContributionPath(),
    )

    assert ok is True
    assert errors == []


def test_frontend_contract_and_unused_legacy_tool() -> None:
    view_source = (GLOBE_DIR / "view.js").read_text(encoding="utf-8")
    skill_source = (GLOBE_DIR / "skill.py").read_text(encoding="utf-8")
    manifest = _load_globe_manifest()
    entry = _globe_index_entry()

    assert "const VIEW_ID = 'globe';" in view_source
    assert "Jarvis.views.register(VIEW_ID" in view_source
    assert "fetch('/api/globe/config')" in view_source
    assert "GlobeViewTool" not in skill_source
    assert "tool.py" not in skill_source
    assert manifest["requires_tools"] == []
    assert entry["requires_tools"] == []
