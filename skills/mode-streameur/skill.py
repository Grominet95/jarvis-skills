"""
mode-streameur — Preset Jarvis.

Lance l'environnement stream : OBS, Spotify lo-fi, Ne pas déranger.
Déclencheurs : "lance le mode streameur", "démarre le stream", "on stream"
Plateformes : mac, windows
"""
from skills.base import PresetSkill


class ModeStreameur(PresetSkill):
    """
    Lance l'environnement de streaming.
    Ouvre OBS, met de la musique lo-fi et active le mode Ne pas déranger.
    Termine avec une suggestion IA de contenu à streamer.
    """
