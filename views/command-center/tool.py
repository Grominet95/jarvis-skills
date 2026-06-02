"""Tool backend pour la vue Command Center."""
from __future__ import annotations

from typing import Callable

from tools.base import Tool, ToolResult


class CommandCenterViewTool(Tool):
    name = "command_center_view"
    description = """
    Affiche ou contrôle le centre de commande proactif de Jarvis.

    Utiliser quand l'utilisateur veut :
    - Voir ce que Jarvis propose ("montre tes initiatives", "qu'est-ce que tu proposes",
      "affiche le centre de commande", "montre tes suggestions")
    - Suivre les missions en cours ("quelles missions tournent", "montre l'avancement")
    - Consulter le journal d'audit proactif ("tes dernières décisions", "qu'est-ce que
      tu as décidé de faire")
    - Donner ou refuser son accord sur une initiative spécifique

    Actions disponibles :
    - show             : affiche le centre de commande
    - hide             : masque le centre de commande
    - focus_initiative : met en évidence une initiative (param: initiative_id)
    - refresh          : recharge les données depuis l'API proactive
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        """Exécute une action sur la vue Command Center.

        Paramètres
        ----------
        action:
            ``show`` — affiche la vue.
            ``hide`` — masque la vue.
            ``focus_initiative`` — met en évidence une initiative (``initiative_id`` requis).
            ``refresh`` — recharge les initiatives et missions depuis l'API.
        """
        if action == "show":
            self._broadcast({
                "type": "show_view",
                "view_id": "command-center",
                "params": kwargs,
            })
            return ToolResult(content="Centre de commande affiché.")

        if action == "hide":
            self._broadcast({
                "type": "hide_view",
                "view_id": "command-center",
            })
            return ToolResult(content="Centre de commande masqué.")

        supported = {"focus_initiative", "refresh"}
        if action not in supported:
            return ToolResult(
                content=(
                    f"Action inconnue '{action}'. "
                    f"Actions supportées : show, hide, {', '.join(supported)}"
                ),
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "command-center",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée au centre de commande.")
