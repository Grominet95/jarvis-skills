"""Skill Fusion 360 — CAO via MCP."""
from __future__ import annotations
from skills.base import SkillBase


class Fusion360Skill(SkillBase):

    SYSTEM_PROMPT = """
## Fusion 360 — CAO

Tu contrôles Autodesk Fusion 360 via l'outil `fusion_360`.
Fusion 360 doit être ouvert avec le serveur MCP actif (port 27182).

3 actions disponibles :
- execute_script : exécuter un script Python Fusion API (création/modification géométrie)
- read           : screenshot, liste documents/projets, doc API
- undo / redo    : annuler ou refaire

Règles critiques pour execute_script :
- Toujours inclure `def run(context):` dans le script
- Fusion utilise les centimètres en interne (3 cm → createByReal(3))
- Ne jamais appeler `app.documents.add()` — travailler sur le document actif
- Pour activer le bon document : itérer sur `app.documents` et activer celui qui a des bodies
- Les Cut nécessitent `participantBodies` explicitement défini
- `root.name` et `rootComponent.name` sont en lecture seule — nommer via `body.name`

Toujours proposer un `read` screenshot après une modification pour confirmer le résultat.
Demander confirmation avant d'exécuter un script qui modifie la géométrie.
"""

    def get_tools(self) -> list:
        from tools.fusion import FusionTool
        return [FusionTool()]
