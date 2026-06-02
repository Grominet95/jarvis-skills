"""Tool backend pour la vue Astronomy."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class AstronomyViewTool(Tool):
    name = "astronomy_view"
    description = """
    Affiche et contrôle la vue système solaire interactive.

    Utiliser quand l'utilisateur veut :
    - Voir le système solaire ("montre le système solaire", "affiche l'espace")
    - Visualiser une planète ("montre Mars", "affiche Jupiter", "à quoi ressemble Saturne ?")
    - Avoir des infos sur une planète ou un objet céleste ("parle-moi de Neptune", "c'est quoi la taille de la Terre ?")
    - Explorer l'astronomie, les planètes, les orbites, l'espace

    Actions disponibles :
    - show           : affiche la vue système solaire
    - hide           : masque la vue
    - solar_system   : vue d'ensemble du système solaire
    - focus_planet   : zoom sur une planète (params: planet — ex: "Mars", "Jupiter", "Terre")
    - fly_to_object  : navigation animée vers un objet (params: object_name)
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "astronomy", "params": kwargs})
            return ToolResult(content="Vue Astronomy affichée.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "astronomy"})
            return ToolResult(content="Vue Astronomy masquée.")

        supported = {"solar_system", "focus_planet", "fly_to_object"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(supported)}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "astronomy",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée à la vue Astronomy.")
