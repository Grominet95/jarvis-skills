"""Tool backend pour la vue System Monitor."""
from __future__ import annotations

from typing import Callable

from tools.base import Tool, ToolResult


class SystemMonitorViewTool(Tool):
    """Affiche le dashboard système temps réel de Jarvis en plein écran."""

    name = "system_monitor_view"
    description = """
    Affiche ou contrôle le dashboard système temps réel de Jarvis.

    Utiliser quand l'utilisateur veut :
    - Voir l'état général du système ("affiche-moi l'état du système", "montre le dashboard")
    - Surveiller le CPU ("comment va le CPU ?", "charge processeur", "utilisation CPU")
    - Surveiller la RAM ("quelle est la mémoire ?", "comment va la RAM ?", "utilisation mémoire")
    - Vérifier le disque ("espace disque", "utilisation du disque", "stockage")
    - Voir le provider LLM actif ("quel modèle tourne ?", "quel provider ?", "cerveau actif")
    - Voir les missions en cours, l'état du moteur proactif, la mémoire Jarvis
    - Voir l'uptime, les performances du processus Jarvis, la batterie

    Actions disponibles :
    - show          : affiche le dashboard système
    - hide          : masque le dashboard
    - focus_metric  : met en avant une métrique (params: metric — cpu, ram, disk, llm, missions)
    - refresh       : force un rafraîchissement immédiat des données
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        """Diffuse un événement WebSocket vers la vue system-monitor.

        Le tool ne consulte pas psutil ni les endpoints système directement :
        il broadcaster l'action, le frontend se charge du fetch des données.
        """
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "system-monitor", "params": kwargs})
            return ToolResult(content="System Monitor affiché.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "system-monitor"})
            return ToolResult(content="System Monitor masqué.")

        supported = {"focus_metric", "refresh"}
        if action not in supported:
            return ToolResult(
                content=(
                    f"Action inconnue '{action}'. "
                    f"Actions supportées : show, hide, {', '.join(sorted(supported))}"
                ),
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "system-monitor",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée au System Monitor.")
