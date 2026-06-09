#!/usr/bin/env python3
"""
Analyse statique AST de skill.py — zéro import, zéro exécution.

Vérifie :
  1. Une classe héritant de SkillBase (skill conversationnel) ou PresetSkill (preset) est définie.
  2. Pour les skills conversationnels : SYSTEM_PROMPT est réellement surchargé
     (attribut de classe non-vide, @property, ou get_system_prompt redéfini).
     La valeur par défaut SkillBase.SYSTEM_PROMPT = "" est refusée — le Skill Lab
     rejetterait ce skill au gate 3 (system_prompt) de la sandbox.
  3. Pas de secret hardcodé évident (patterns basiques).

Le check 2 est le désalignement critique identifié en état des lieux : un skill
structurellement valide (héritage OK) mais avec SYSTEM_PROMPT vide passerait
validate_skills.py mais serait rejeté par le Skill Lab. Ce check ferme ce gap.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Optional

_EXPECTED_BASE = {"conversational": "SkillBase", "preset": "PresetSkill"}

_SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"AIza[0-9A-Za-z\-_]{35}"),
    re.compile(r"(?i)api[_-]?key\s*=\s*['\"][^'\"${\\\s]{8,}['\"]"),
    re.compile(r"(?i)(secret|token|password)\s*=\s*['\"][^'\"${\\\s]{8,}['\"]"),
]


def _find_base_class(tree: ast.Module, expected_base: str) -> Optional[ast.ClassDef]:
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        for base in node.bases:
            name = ""
            if isinstance(base, ast.Name):
                name = base.id
            elif isinstance(base, ast.Attribute):
                name = base.attr
            if name == expected_base:
                return node
    return None


def _check_system_prompt_overridden(class_node: ast.ClassDef) -> Optional[str]:
    """
    Vérifie que SYSTEM_PROMPT est surchargé dans la classe.

    Retourne None si OK, message d'erreur sinon.
    Acceptable :
      - SYSTEM_PROMPT = "non-vide"   (attribut de classe avec valeur littérale non-vide)
      - SYSTEM_PROMPT = <expression> (variable, f-string, etc.) — accepté, sera évalué au runtime
      - @property def SYSTEM_PROMPT  (propriété dynamique)
      - def get_system_prompt(self)  (méthode redéfinie)
    Refusé :
      - SYSTEM_PROMPT = ""           (explicitement vide — le Skill Lab refusera au gate 3)
      - Aucune surcharge             (hérite de la valeur vide de SkillBase)
    """
    for node in class_node.body:
        # Cas 1 : SYSTEM_PROMPT = "..." (attribut de classe)
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "SYSTEM_PROMPT":
                    # Valeur littérale vide → refusé
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        if not node.value.value.strip():
                            return (
                                "SYSTEM_PROMPT = \"\" (chaîne vide) — "
                                "le Skill Lab refusera ce skill au gate system_prompt"
                            )
                    # Toute autre valeur (expression, f-string, constante non-vide) → accepté
                    return None

        # Cas 2 : @property def SYSTEM_PROMPT(self)
        if isinstance(node, ast.FunctionDef) and node.name == "SYSTEM_PROMPT":
            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Name) and decorator.id == "property":
                    return None

        # Cas 3 : def get_system_prompt(self) redéfinie
        if isinstance(node, ast.FunctionDef) and node.name == "get_system_prompt":
            return None

    return (
        "SYSTEM_PROMPT non surchargé et get_system_prompt non redéfini — "
        "le Skill Lab refusera ce skill au gate system_prompt "
        "(SkillBase.SYSTEM_PROMPT = \"\" par défaut)"
    )


def _check_secrets(source: str) -> list[str]:
    findings = []
    for pattern in _SECRET_PATTERNS:
        if pattern.search(source):
            findings.append(
                f"❌ skill_static_ast_check: secret potentiellement hardcodé "
                f"(motif: {pattern.pattern[:40]}…)"
            )
    return findings


def run(contribution_path: Path, contribution_type: str) -> tuple[bool, list[str]]:
    skill_py = contribution_path / "skill.py"
    if not skill_py.exists():
        return False, [f"❌ skill_static_ast_check: skill.py absent dans {contribution_path.name}/"]

    try:
        source = skill_py.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(skill_py))
    except SyntaxError as exc:
        return False, [f"❌ skill_static_ast_check: erreur de syntaxe dans skill.py: {exc}"]

    ok = True
    messages: list[str] = []
    expected_base = _EXPECTED_BASE.get(contribution_type, "SkillBase")

    # 1) Héritage
    found_class = _find_base_class(tree, expected_base)
    if found_class is None:
        return False, [
            f"❌ skill_static_ast_check: aucune classe héritant de {expected_base} dans skill.py"
        ]

    # 2) SYSTEM_PROMPT surchargé (uniquement pour les skills conversationnels)
    if contribution_type == "conversational":
        sp_error = _check_system_prompt_overridden(found_class)
        if sp_error:
            ok = False
            messages.append(f"❌ skill_static_ast_check: {sp_error}")

    # 3) Secrets hardcodés
    secret_msgs = _check_secrets(source)
    if secret_msgs:
        ok = False
        messages.extend(secret_msgs)

    return ok, messages
