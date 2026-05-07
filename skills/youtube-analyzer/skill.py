"""youtube-analyzer — Analyse YouTube."""
from skills.base import SkillBase


class YouTubeAnalyzer(SkillBase):

    SYSTEM_PROMPT = """
    ## Skill : Analyse YouTube

    Barth est créateur YouTube sur la chaîne BarthH95 (~3000 abonnés),
    contenu maker/électronique/DIY, vidéos hebdomadaires.

    Quand il demande des analyses ou conseils YouTube :

    1. Utiliser les données disponibles via l'outil analytics si disponible
    2. Analyser les tendances : vues, rétention, croissance abonnés
    3. Identifier les vidéos qui surperforment et pourquoi
    4. Suggérer des sujets basés sur les tendances maker/électronique
    5. Proposer des améliorations concrètes (titres, thumbnails, hooks)

    Toujours baser les suggestions sur les données, pas sur des généralités.
    """
