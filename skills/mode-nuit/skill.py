"""
mode-nuit — Preset Jarvis.

Prépare la fin de journée et fait un bilan.
Déclencheurs : "bonne nuit", "fin de journée", "je vais dormir"
Plateformes : mac, windows
"""
from skills.base import PresetSkill


class ModeNuit(PresetSkill):
    """
    Preset de fin de journée.
    Ferme les apps de travail, lance une playlist douce,
    Jarvis fait un bilan motivant de la journée.
    """
