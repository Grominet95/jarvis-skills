"""Tool backend pour la vue Memory Map."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class MemoryMapViewTool(Tool):
    name = "memory_map_view"
    description = """
    Affiche ou contrôle la carte visuelle de la mémoire de Jarvis.

    Utiliser quand l'utilisateur veut :
    - Voir ce que Jarvis sait sur lui ("qu'est-ce que tu sais sur moi ?",
      "montre ta mémoire", "affiche ce dont tu te souviens")
    - Explorer les sujets mémorisés ("quels sujets as-tu en mémoire ?",
      "montre-moi la carte de ta mémoire")
    - Consulter un sujet précis ("affiche ce que tu sais sur X",
      "ouvre le sujet user dans ta mémoire")
    - Recharger la mémoire ("rafraîchis ta mémoire", "recharge les données")
    - Masquer la carte mémoire

    Actions disponibles :
    - show          : affiche la carte mémoire
    - hide          : masque la carte mémoire
    - focus_topic   : ouvre un sujet dans le panneau latéral (params: name)
    - refresh       : recharge les données depuis les APIs mémoire
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "memory-map", "params": kwargs})
            return ToolResult(content="Memory map affichée.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "memory-map"})
            return ToolResult(content="Memory map masquée.")

        supported = {"focus_topic", "refresh"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(supported)}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "memory-map",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée à la memory map.")
