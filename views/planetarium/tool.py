"""Tool backend pour la vue Planétarium (id: planetarium).

Vue alternative à astronomy : embarque Stellarium Web via iframe.
Rendu pro mais design Stellarium imposé.
"""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class PlanetariumViewTool(Tool):
    name = "planetarium_view"
    description = """
    Planétarium réaliste via Stellarium Web embarqué (iframe).

    Vue ALTERNATIVE à astronomy_view : rendu plus pro (vrai moteur Stellarium),
    mais l'UI Stellarium s'impose à l'intérieur — design moins Jarvis.

    UTILISER QUAND l'utilisateur demande EXPLICITEMENT :
    - « Stellarium » / « planétarium » / « vrai planétarium »
    - « le ciel en mode pro » / « la vue astronomy 2 »
    - « le rendu réaliste »

    SINON utiliser astronomy_view (design 100% Jarvis, plus intégré).

    Actions disponibles :
    - show         : affiche le planétarium
    - hide         : masque la vue
    - focus_object : centre Stellarium sur un objet
                     (params: object — nom en anglais ou catalogue : "Mars",
                      "Vega", "M31", "Andromeda", "Orion", "Sirius", etc.)
    - reload       : recharge l'iframe Stellarium (utile si plantage)
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "planetarium", "params": kwargs})
            return ToolResult(content="Planétarium Stellarium affiché.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "planetarium"})
            return ToolResult(content="Planétarium masqué.")

        supported = {"focus_object", "focus_planet", "focus_constellation", "reload"}
        if action not in supported:
            return ToolResult(
                content=f"Action inconnue '{action}'. Supportées : show, hide, {', '.join(sorted(supported))}",
                is_error=True,
            )

        self._broadcast({
            "type": "view_command",
            "view_id": "planetarium",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Commande '{action}' envoyée au planétarium.")
