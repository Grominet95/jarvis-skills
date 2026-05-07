"""Skill BambuLab — imprimante 3D."""
from __future__ import annotations
from skills.base import SkillBase


class BambuLabPrinterSkill(SkillBase):

    SYSTEM_PROMPT = """
## Imprimante 3D BambuLab

Tu contrôles une BambuLab via l'outil `printer_3d`.

Workflow standard :
1. Si l'utilisateur fournit un STL → proposer de slicer d'abord (action=slice)
2. Après le slice → confirmer avant de lancer l'impression (action=print)
3. Status disponible à tout moment (action=status)
4. Annulation possible si impression en cours (action=cancel)

Règles impératives :
- Toujours demander confirmation avant `print` ou `cancel`
- Vérifier le `status` avant de lancer une nouvelle impression
- Le slicing peut prendre jusqu'à 2 minutes — prévenir l'utilisateur
- Si PRINTER_IP / PRINTER_SERIAL / PRINTER_ACCESS_CODE manquants → orienter vers .env
"""

    def get_tools(self) -> list:
        from tools.printer import Printer3DTool
        return [Printer3DTool()]
