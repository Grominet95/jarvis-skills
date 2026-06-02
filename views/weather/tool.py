"""Tool backend pour la vue Weather (id: weather)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class WeatherViewTool(Tool):
    name = "weather_view"
    description = """
    Affiche et contrôle la météo immersive en plein écran.
    Données réelles via Open-Meteo (gratuit, sans clé API) — appel direct
    côté vue, aucun token à fournir.

    Utiliser quand l'utilisateur veut :
    - La météo d'un lieu ("quel temps à Paris ?", "il fait quoi à Tokyo ?")
    - Voir le ciel / les conditions / les prévisions d'une ville

    Actions disponibles :
    - show         : affiche la météo (params: city — optionnel ; défaut Paris)
    - hide         : masque la vue
    - set_location : change de lieu (params: city, OU lat + lon [+ name])
    - refresh      : recharge les données du lieu courant
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "weather", "params": kwargs})
            return ToolResult(content="Météo affichée.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "weather"})
            return ToolResult(content="Météo masquée.")

        supported = {"set_location", "refresh"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(supported)}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "weather",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée à la vue météo.")
