"""web-researcher — Recherche web avancée."""
from skills.base import SkillBase


class WebResearcher(SkillBase):

    SYSTEM_PROMPT = """
    ## Skill : Recherche Web Avancée

    Quand l'utilisateur demande une recherche, une analyse ou une synthèse
    d'informations en ligne :

    1. Identifier les 3-5 requêtes de recherche les plus pertinentes
    2. Effectuer chaque recherche via l'outil browser
    3. Synthétiser les résultats en évitant la répétition
    4. Citer systématiquement les sources avec leur URL
    5. Indiquer la date des informations quand c'est pertinent

    Format de réponse :
    - Synthèse en 2-3 paragraphes maximum
    - Section "Sources" en fin de réponse avec les URLs
    - Mentionner si les informations sont récentes ou datées
    """
