"""Tool backend pour la vue Clock (id: clock)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class ClockViewTool(Tool):
    name = "clock_view"
    description = """
    Affiche et contrôle l'horloge solaire (cadran 24 h) en plein écran.

    Utiliser quand l'utilisateur veut :
    - Savoir l'heure ("quelle heure il est ?", "affiche l'horloge")
    - L'heure dans une autre ville ("quelle heure à Tokyo / New York / Londres ?")
    - Voir le cycle jour/nuit, la course du soleil

    Actions disponibles :
    - show          : affiche l'horloge (cadran + heure locale)
    - hide          : masque la vue
    - local         : recentre sur l'heure locale
    - show_timezone : met en avant un fuseau secondaire
                      (params: city — "Tokyo", "New York", "Londres")
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "clock", "params": kwargs})
            return ToolResult(content="Horloge affichée.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "clock"})
            return ToolResult(content="Horloge masquée.")

        supported = {"local", "show_timezone", "add_timezone"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, local, show_timezone",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "clock",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée à l'horloge.")
