from __future__ import annotations

from skills.base import SkillBase


class GlobeViewSkill(SkillBase):
    SYSTEM_PROMPT = (
        'La vue installée s’appelle "Globe", utilise le view_id "globe" et '
        "représente un globe terrestre interactif. NIKYA peut demander "
        "l’ouverture de cette vue avec l’outil d’affichage fourni par son cœur."
    )

    def get_tools(self) -> list:
        return []
