# Contribuer un skill Jarvis

Bienvenue ! Voici comment ajouter ton skill à la bibliothèque.

## Prérequis

- Un compte GitHub
- Jarvis installé et fonctionnel en local pour tester ton skill

## Étapes

### 1. Fork le repo

Clique "Fork" en haut à droite de la page GitHub.

### 2. Crée le dossier de ton skill

```bash
mkdir skills/mon-skill-name
```

Le nom doit être en kebab-case (tirets, pas d'espaces).

### 3. Crée `skill.yaml`

```yaml
name: mon-skill
version: 1.0.0
author: ton-pseudo-github
description: Ce que fait le skill en une phrase claire.
tags: [tag1, tag2]
type: conversational
platforms: [mac, windows, linux]
requires_tools: []
requires_env: []
requires_apps: []
capabilities:
  - "Fait quelque chose d'utile"
  - "Récupère des données depuis une source"
  - "Génère un résultat concret"
```

### 4. Crée `skill.py`

```python
from skills.base import SkillBase

class MonSkill(SkillBase):

    SYSTEM_PROMPT = """
    ## Skill : [Nom]

    [Instructions pour Jarvis]
    """
```

### 5. Teste dans ton Jarvis local

Copie ton dossier dans `JARVIS_V3/skills/installed/mon-skill/`
et vérifie que Jarvis se comporte correctement.

### 6. Ouvre une Pull Request

- Ajoute ton skill dans `index.json`
- Ouvre la PR avec le template fourni

### Champs requires_apps

Si ton skill ou preset nécessite une application tierce installée :

```yaml
requires_apps:
  - name: Nom de l'application
    description: "Pourquoi elle est nécessaire"
    url: https://lien-de-telechargement.com
    mac_bundle: "NomApp"      # nom dans /Applications/
    windows_exe: "app.exe"    # nom du process Windows
    required: true            # true = bloquant, false = optionnel
```

### Champ capabilities

Liste ce que le skill peut faire, en français, en langage naturel.
Maximum 6 points. Chaque point commence par un verbe à la 3ème personne.

```yaml
capabilities:
  - "Fait quelque chose d'utile"
  - "Récupère des données depuis une source"
  - "Génère un résultat concret"
```

## Règles

- Compatible Jarvis v3.0+
- Pas de clés API hardcodées — utiliser `requires_env`
- Pas de données personnelles dans le code
- Tester localement avant de PR
- PRs reviewées sous 48-72h

## Questions ?

Discord Le Labo : https://discord.gg/rSZjtEeZJC

---

## Contribuer une preset

Une preset est un skill qui déclenche une séquence d'actions concrètes sur la machine de l'utilisateur.

### Utiliser le template

```bash
cp -r templates/skill-preset/ skills/ma-preset/
```

### Règles importantes

1. `type: preset` obligatoire dans skill.yaml
2. `"preset"` doit être le premier tag
3. Tester sur toutes les plateformes déclarées dans `platforms`
4. Mettre `null` pour les plateformes non testées
5. Pas de commandes destructives sans `requires_confirmation: true`
6. Mettre à jour `index.json` avec `"type": "preset"`

### Checklist PR

- [ ] skill.yaml valide avec type: preset
- [ ] Testé sur mac OU windows (selon platforms déclaré)
- [ ] Aucune commande destructive non confirmée
- [ ] index.json mis à jour
- [ ] skill.py minimal avec classe héritant de PresetSkill
