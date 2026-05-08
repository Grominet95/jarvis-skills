"""
mode-travail — Routine Jarvis.

Lance l'environnement de travail avec brief des tâches du jour.
Déclencheurs : "lance le mode travail", "mode focus", "on bosse"
Plateformes : mac, windows
"""
from skills.base import RoutineSkill


class ModeTravail(RoutineSkill):
    """
    Lance l'environnement de travail.
    Ouvre Notion et VS Code, musique focus, DND activé.
    Jarvis fait un brief des tâches du jour.
    """
