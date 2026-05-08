"""
[Nom de la routine] — skill routine pour Jarvis.

Description courte de ce que fait la routine.
Déclencheurs : "phrase 1", "phrase 2"
Plateformes : mac, windows
"""
from skills.base import RoutineSkill


class MaRoutine(RoutineSkill):
    """
    Nom de la routine.

    Description plus détaillée si nécessaire.
    Ce fichier est minimal — toute la logique est dans skill.yaml.
    La classe hérite de RoutineSkill qui gère l'exécution des steps.
    """

    # SYSTEM_PROMPT est auto-généré depuis skill.yaml par RoutineSkill.
    # Le surcharger uniquement si tu veux un comportement vocal personnalisé.
    #
    # Exemple de surcharge :
    # SYSTEM_PROMPT = """
    # ## Skill : Mode Streameur
    # Quand l'utilisateur dit "lance le mode streameur" ou similaire,
    # appeler execute_routine('mode-streameur').
    # Tu peux aussi demander des précisions : "Quel jeu tu stream ce soir ?"
    # """
