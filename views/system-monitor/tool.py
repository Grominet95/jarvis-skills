"""Tool backend pour la vue System Monitor (id: system-monitor)."""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class SystemMonitorViewTool(Tool):
    name = "system_monitor_view"
    description = """
    Affiche et contrôle le cockpit système temps réel en plein écran.
    Données réelles via l'API Jarvis (/api/system/perf, /api/system/stats,
    /api/proactive/status, /api/config/llm-status).

    Utiliser quand l'utilisateur veut :
    - L'état du système ("comment va le système ?", "montre le monitoring")
    - Voir CPU / RAM / disque / uptime / le cerveau LLM actif
    - Se concentrer sur une métrique ("focus sur la RAM")

    Actions disponibles :
    - show         : affiche le cockpit
    - hide         : masque la vue
    - focus_metric : met une métrique en avant
                     (params: metric — "cpu", "ram", "disk", "llm", "missions")
    - overview     : retire le focus
    - refresh      : force un rafraîchissement immédiat
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "system-monitor", "params": kwargs})
            return ToolResult(content="Cockpit système affiché.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "system-monitor"})
            return ToolResult(content="Cockpit système masqué.")

        supported = {"focus_metric", "overview", "refresh"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(supported)}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "system-monitor",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée au cockpit système.")
