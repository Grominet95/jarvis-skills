"""Tool backend pour la vue Carte du ciel (id: astronomy)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class AstronomyViewTool(Tool):
    name = "astronomy_view"
    description = """
    Ciel étoilé / planétarium temps réel — affiche le VRAI ciel avec étoiles
    HYG (5000), constellations IAU, Voie lactée, galaxies, nébuleuses,
    et POSITIONS PLANÉTAIRES réelles (Mercure, Vénus, Mars, Jupiter, Saturne).

    ════════════════════════════════════════════════════════════════════════
    >>> RÈGLE ABSOLUE : si l'utilisateur évoque un objet du ciel, c'est CET
        outil qu'il faut appeler. Pas globe-view, pas web-researcher,
        pas Maps. CET outil. <<<
    ════════════════════════════════════════════════════════════════════════

    NE PAS confondre :
    - "Vénus", "Mars", "Jupiter", "Mercure", "Saturne" = PLANÈTES (ce tool)
       NE PAS chercher "Venus High School", "Mars chocolate", "Jupiter FL"
       ni demander des images au web. Toujours focus_planet().
    - "Grande Ourse", "Orion", "Cassiopée", "Cygne", "Lion", "Pégase",
       "Andromède", "Persée", "Lyre", "Scorpion", "Taureau" =
       CONSTELLATIONS (ce tool). NE PAS chercher de lieux homonymes
       (station de ski, école, restaurant, association, etc.).
    - "M31", "M42", "M45", "Pléiades", "Andromède", "Nébuleuse d'Orion",
       "Voie lactée" = OBJETS CÉLESTES (ce tool, focus_object).
    - globe-view sert pour la planète TERRE uniquement (cartes, météo, vols,
       navires). Il n'a RIEN à voir avec l'astronomie ou les autres planètes.

    Exemples d'appels corrects :
    - Utilisateur : « Montre-moi Vénus »
      → astronomy_view(action="focus_planet", planet="Vénus")
    - Utilisateur : « Affiche la Grande Ourse »
      → astronomy_view(action="focus_constellation", constellation="Grande Ourse")
    - Utilisateur : « Montre-moi Andromède » ou « affiche M31 »
      → astronomy_view(action="focus_object", object="M31")
    - Utilisateur : « Affiche les étoiles » ou « carte du ciel »
      → astronomy_view(action="show")
    - Utilisateur : « Cache le ciel »
      → astronomy_view(action="hide")

    Réponse vocale attendue après appel : confirmer brièvement (« Voilà
    Vénus, en plein ciel. ») — NE PAS dire « j'appelle le skill X » ni
    proposer d'utiliser globe-view ou un autre outil. Le ciel s'affiche
    immédiatement après cet appel.

    Actions disponibles :
    - show                : affiche le ciel temps réel
    - hide                : masque la vue
    - overview            : retire le focus, dézoom au champ large
    - focus_constellation : centre + zoom + panneau d'infos sur une
                            constellation (params: constellation — nom FR
                            ou latin, casse et accents libres)
    - focus_planet        : centre + zoom + panneau d'infos sur une planète
                            (params: planet — "Mercure", "Vénus", "Mars",
                             "Jupiter", "Saturne")
    - focus_object        : centre + zoom + panneau d'infos sur un objet du
                            ciel profond (params: object — "M31",
                             "Andromède", "M33", "M42", "Pléiades", "M45",
                             "M13", "M51", "M81", "Nébuleuse Flamme")
    - set_location        : change le lieu de l'observateur
                            (params: lat — float, lon — float)
    - zoom_in / zoom_out  : ajuste le champ de vision
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "astronomy", "params": kwargs})
            return ToolResult(content="Carte du ciel affichée à l'écran.")

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

        # Message de retour explicite — pour éviter que le LLM rappelle un autre tool
        if action == "focus_planet":
            target = kwargs.get("planet") or kwargs.get("name") or "la planète"
            return ToolResult(content=f"{target} centrée et zoomée à l'écran (vue ciel temps réel). Le panneau d'infos s'affiche en bas-gauche.")
        if action == "focus_constellation":
            target = kwargs.get("constellation") or kwargs.get("name") or "la constellation"
            return ToolResult(content=f"Constellation {target} centrée et illuminée à l'écran (vue ciel temps réel). Panneau d'infos affiché.")
        if action in ("focus_object", "focus_dso"):
            target = kwargs.get("object") or kwargs.get("dso") or kwargs.get("name") or "l'objet"
            return ToolResult(content=f"{target} centré et zoomé à l'écran (vue ciel temps réel). Panneau d'infos affiché.")

        return ToolResult(content=f"Commande '{action}' exécutée sur la carte du ciel.")
