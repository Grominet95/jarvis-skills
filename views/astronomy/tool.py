"""Tool backend pour la vue Carte du ciel (id: astronomy)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class AstronomyViewTool(Tool):
    name = "astronomy_view"
    description = """
    Affiche et contrôle la carte du ciel (constellations) en plein écran.

    Utiliser quand l'utilisateur veut :
    - Voir le ciel / les étoiles ("affiche-moi le ciel", "montre les étoiles")
    - Visualiser une constellation ("montre Orion", "où est la Grande Ourse ?")
    - Explorer les constellations, les astres, la voûte céleste

    Actions disponibles :
    - show                : affiche la carte du ciel (vue d'ensemble)
    - hide                : masque la vue
    - overview            : revient à la vue d'ensemble (retire le focus)
    - focus_constellation : met une constellation au point
                            (params: constellation — "Orion", "Cassiopée",
                             "Grande Ourse", "Cygne")
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

        supported = {"overview", "focus_constellation"}
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
        return ToolResult(content=f"Commande '{action}' envoyée à la carte du ciel.")
