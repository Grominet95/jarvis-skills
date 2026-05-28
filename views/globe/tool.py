"""Tool backend pour la vue Globe."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class GlobeViewTool(Tool):
    name = "globe_view"
    description = """
    Affiche ou contrôle le globe terrestre interactif.

    Utiliser quand l'utilisateur veut :
    - Voir le monde, une carte, un globe ("montre le monde", "affiche la carte")
    - Naviguer vers un lieu ("va à Paris", "montre-moi Tokyo", "fly to New York")
    - Zoomer / dézoomer sur le globe
    - Revenir à la vue globe complète

    Actions disponibles :
    - show          : affiche le globe
    - hide          : masque le globe
    - fly_to        : vol animé vers un lieu (params: lat, lon, zoom, location_name)
    - zoom_in       : zoome de 3 niveaux
    - zoom_out      : dézoome de 3 niveaux
    - globe_view    : reset vers la vue globe entière
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "globe", "params": kwargs})
            return ToolResult(content="Globe shown.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "globe"})
            return ToolResult(content="Globe hidden.")

        supported = {"fly_to", "zoom_in", "zoom_out", "globe_view"}
        if action not in supported:
            return ToolResult(
                content=f"Unknown action '{action}'. Supported: show, hide, {', '.join(supported)}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "globe",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Globe command '{action}' sent.")
