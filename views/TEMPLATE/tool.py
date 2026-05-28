"""
Tool backend pour la vue [NOM].

TODO: Renommer la classe, changer `name` et adapter `description`.
"""
from __future__ import annotations
from typing import Callable
from tools.base import Tool, ToolResult


class MyViewTool(Tool):
    # TODO: Remplacer "my_view" par un nom snake_case unique dans Jarvis
    name = "my_view"

    # TODO: Rédiger une description en langage naturel qui explique QUAND
    # Jarvis doit utiliser cet outil. C'est ce texte qui guide le LLM.
    # Exemple de bonne description :
    #   "Affiche le globe terrestre quand l'utilisateur veut voir une carte
    #    ou naviguer vers un lieu géographique."
    description = """
    TODO: Décrire ici quand Jarvis doit utiliser cet outil.

    Actions disponibles :
    - show   : affiche la vue
    - hide   : masque la vue
    - TODO   : ajouter les autres actions
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        # ── show ──────────────────────────────────────────────────────────
        if action == "show":
            self._broadcast({
                "type": "show_view",
                "view": "ma-vue",    # TODO: Remplacer par l'id de ta vue
                "params": kwargs,
            })
            return ToolResult(success=True, data={"status": "shown"})

        # ── hide ──────────────────────────────────────────────────────────
        if action == "hide":
            self._broadcast({
                "type": "hide_view",
                "view": "ma-vue",    # TODO: Remplacer par l'id de ta vue
            })
            return ToolResult(success=True, data={"status": "hidden"})

        # ── Commandes custom ──────────────────────────────────────────────
        # TODO: Ajouter les actions spécifiques à ta vue.
        # Pour chaque action, envoyer un event "view_command" :
        #
        # if action == "mon-action":
        #     self._broadcast({
        #         "type": "view_command",
        #         "view": "ma-vue",
        #         "command": action,
        #         "params": kwargs,
        #     })
        #     return ToolResult(success=True, data={"action": action})

        # ── Action inconnue ───────────────────────────────────────────────
        # TODO: Mettre à jour la liste des actions supportées dans le message d'erreur
        return ToolResult(
            success=False,
            error=f"Unknown action '{action}'. Supported: show, hide",
        )
