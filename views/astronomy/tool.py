"""Tool backend pour la vue Carte du ciel (id: astronomy)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class AstronomyViewTool(Tool):
    name = "astronomy_view"
    description = """
    Affiche et contrôle le ciel étoilé temps réel en plein écran.
    Catalogue HYG ~5000 étoiles réelles, constellations IAU, Voie lactée,
    planètes (Mercure, Vénus, Mars, Jupiter, Saturne), galaxies (M31, M33,
    M51, M81), nébuleuses (M42 Orion, Flamme), amas (M45 Pléiades, M13).

    >>> UTILISER CET OUTIL EN PRIORITÉ <<< pour TOUTE demande qui mentionne
    un objet astronomique : étoile, constellation, planète, galaxie,
    nébuleuse, amas, Voie lactée, ciel nocturne. NE PAS chercher sur le
    web ni en cartographie pour des noms qui peuvent désigner un lieu
    homonyme — "Grande Ourse", "Vénus", "Mars", "Orion", "Pégase", etc.
    sont des références CÉLESTES dans le contexte de Jarvis.

    Exemples d'usage :
    - "Montre-moi la Grande Ourse" → focus_constellation(constellation="Grande Ourse")
    - "Affiche Vénus" / "Où est Vénus ?" → focus_planet(planet="Vénus")
    - "Montre Mars" → focus_planet(planet="Mars")
    - "Affiche Andromède" / "Montre M31" → focus_object(object="M31")
    - "Carte du ciel" / "Affiche les étoiles" → show
    - "Cache le ciel" → hide

    Actions disponibles :
    - show                : affiche le ciel temps réel (Paris par défaut)
    - hide                : masque la vue
    - overview            : retire le focus, dézoom au champ large
    - focus_constellation : centre + zoom + panneau d'infos sur une constellation
                            (params: constellation — "Orion", "Cassiopée",
                             "Grande Ourse", "Cygne", "Scorpion", "Lion",
                             "Andromède", "Persée", "Lyre", "Taureau",
                             "Gémeaux", "Bouvier", "Aigle", "Pégase",
                             "Petite Ourse")
    - focus_planet        : centre + zoom + panneau d'infos sur une planète
                            (params: planet — "Mercure", "Vénus", "Mars",
                             "Jupiter", "Saturne")
    - focus_object        : centre + zoom + panneau d'infos sur un objet du
                            ciel profond
                            (params: object — "M31", "Andromède", "M33",
                             "M42", "Pléiades", "M45", "M13", "M51", "M81",
                             "Nébuleuse Flamme")
    - set_location        : change le lieu de l'observateur
                            (params: lat — float, lon — float)
    - zoom_in / zoom_out  : ajuste le champ de vision
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "astronomy", "params": kwargs})
            return ToolResult(content="Carte du ciel affichée.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "astronomy"})
            return ToolResult(content="Carte du ciel masquée.")

        supported = {
            "overview",
            "focus_constellation",
            "focus_planet",
            "focus_object",
            "focus_dso",
            "set_location",
            "zoom_in",
            "zoom_out",
        }
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(sorted(supported))}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "astronomy",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée à la carte du ciel.")
