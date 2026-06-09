#!/usr/bin/env python3
"""Vérifie la cohérence des permissions et déclarations de la contribution."""

from __future__ import annotations

from pathlib import Path

_KNOWN_PERMISSIONS = {"network", "filesystem", "audio", "cli", "display", "notifications"}


def run(manifest: dict, contribution_type: str) -> tuple[bool, list[str]]:
    errors: list[str] = []

    # platforms non-vide (skills et presets)
    if contribution_type in ("conversational", "preset"):
        platforms = manifest.get("platforms") or []
        if not platforms:
            errors.append("❌ permissions_check: platforms vide — déclarer au moins une plateforme supportée")

    # permissions field : si présent, items connus
    permissions = manifest.get("permissions") or []
    for perm in permissions:
        if perm not in _KNOWN_PERMISSIONS:
            errors.append(
                f"❌ permissions_check: permission inconnue '{perm}' "
                f"— valeurs acceptées: {', '.join(sorted(_KNOWN_PERMISSIONS))}"
            )

    # requires_tools : pas de valeurs vides ou malformées
    for tool in manifest.get("requires_tools") or []:
        if not isinstance(tool, str) or not tool.strip():
            errors.append("❌ permissions_check: requires_tools contient une valeur vide ou invalide")

    return len(errors) == 0, errors
