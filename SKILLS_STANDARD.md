# Jarvis Skills — Standard conversationnel

Ce document est la **référence unique** pour créer un skill conversationnel dans Jarvis.
Un skill conversationnel injecte un `SYSTEM_PROMPT` spécialisé dans le contexte de Jarvis pour lui donner une nouvelle compétence : recherche web, analyse de données, contrôle d'API, etc.

Schéma machine-vérifiable : [`schemas/skill.schema.json`](schemas/skill.schema.json)

---

## Structure d'un skill

Chaque skill vit dans son propre dossier sous `skills/` :

```
skills/
└── mon-skill/
    ├── skill.yaml     ← manifest du skill (requis)
    ├── skill.py       ← classe Python héritant de SkillBase (requis)
    └── README.md      ← doc utilisateur (optionnel)
```

Le nom du dossier est en **kebab-case minuscule** : `web-researcher`, `bambulab-printer`, `youtube-analyzer`.

---

## Format `skill.yaml`

### Champs obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string (kebab-case) | Identifiant unique — correspond au nom du dossier |
| `version` | semver | Version `MAJOR.MINOR.PATCH` |
| `author` | string | Pseudo GitHub de l'auteur |
| `description` | string | Description en une phrase claire |
| `tags` | liste de strings | Mots-clés pour le filtre du marketplace (min 1) |
| `type` | `"conversational"` | Doit être exactement `conversational` |
| `platforms` | liste d'enums | Plateformes supportées : `mac`, `windows`, `linux` |
| `requires_env` | liste | Variables d'environnement requises (liste vide autorisée) |
| `requires_tools` | liste de strings | Outils Jarvis requis (liste vide autorisée) |
| `requires_oauth` | liste de strings | Connexions OAuth requises (liste vide autorisée) |
| `requires_apps` | liste | Applications tierces requises (liste vide autorisée) |
| `capabilities` | liste de strings | Ce que le skill peut faire — 1 à 6 items |

### Champs optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `jarvis_min_version` | nombre | Version minimale de Jarvis requise (ex: `3.0`) |
| `triggers` | liste de strings | Toujours vide `[]` pour les skills conversationnels |

### Détail : `requires_env`

Deux formats acceptés — simple (nom seul) ou enrichi (avec description) :

```yaml
# Forme courte
requires_env:
  - YOUTUBE_API_KEY
  - YOUTUBE_CHANNEL_ID

# Forme enrichie (recommandée pour les variables sensibles)
requires_env:
  - name: PRINTER_ACCESS_CODE
    description: "Code d'accès 8 chiffres (Bambu Studio → Settings → Printer)"
    example: "12345678"
    sensitive: true
```

| Sous-champ | Obligatoire | Description |
|------------|-------------|-------------|
| `name` | oui | Nom de la variable d'environnement |
| `description` | oui | Contexte et où la trouver |
| `example` | non | Valeur d'exemple (tronquée si sensible) |
| `sensitive` | non | `true` si secret (API key, token, mot de passe) |

### Détail : `requires_apps`

Liste d'objets décrivant chaque application tierce :

```yaml
requires_apps:
  - name: Autodesk Fusion 360
    description: "Doit être ouvert avec l'add-in FusionMCP actif"
    url: https://www.autodesk.com/products/fusion-360
    mac_bundle: "Autodesk Fusion 360"   # nom dans /Applications/
    windows_exe: "Fusion360.exe"         # nom du processus Windows
    required: true
```

| Sous-champ | Obligatoire | Description |
|------------|-------------|-------------|
| `name` | oui | Nom affiché de l'application |
| `description` | oui | Pourquoi elle est nécessaire |
| `url` | oui | URL de téléchargement |
| `mac_bundle` | non | Nom dans `/Applications/` |
| `windows_exe` | non | Nom du processus Windows |
| `required` | oui | `true` = bloquant, `false` = optionnel |

### Détail : `capabilities`

Liste de ce que le skill sait faire, en français, en langage naturel.
Maximum **6 points**. Chaque point **commence par un verbe à la 3e personne**.

```yaml
capabilities:
  - "Recherche sur le web avec DuckDuckGo ou Google"
  - "Synthétise les résultats en 2-3 paragraphes clairs"
  - "Cite systématiquement les sources avec leurs URLs"
  - "Indique la fraîcheur des informations trouvées"
```

### Exemple complet

```yaml
name: web-researcher
version: 1.1.0
author: BarthH95
description: Recherche web avancée avec synthèse structurée et citations sources.
tags: [research, web, search]
type: conversational
jarvis_min_version: 3.0
platforms: [mac, windows, linux]
requires_env: []
requires_tools: [browser]
requires_oauth: []
requires_apps: []
capabilities:
  - "Recherche sur le web avec DuckDuckGo ou Google"
  - "Synthétise les résultats en 2-3 paragraphes clairs"
  - "Cite systématiquement les sources avec leurs URLs"
  - "Indique la fraîcheur des informations trouvées"
```

---

## Format `skill.py`

### Contrat `SkillBase`

```python
from skills.base import SkillBase

class MonSkill(SkillBase):

    SYSTEM_PROMPT = """
    ## Skill : [Nom]

    Instructions pour Jarvis — quand l'utiliser, comment répondre,
    quels outils appeler, quel format de réponse produire.
    """

    def get_tools(self) -> list:
        # Optionnel — retourne les outils Python à enregistrer
        from tools.mon_tool import MonTool
        return [MonTool()]
```

| Membre | Obligatoire | Description |
|--------|-------------|-------------|
| `SYSTEM_PROMPT` | oui | Prompt système injecté dans le contexte Jarvis quand le skill est actif |
| `get_tools()` | non | Retourne la liste des outils Python que ce skill apporte |

### Règles du `SYSTEM_PROMPT`

1. **En-tête** `## Skill : [Nom]` en première ligne
2. **Déclenchement** — expliquer quand Jarvis doit activer ce skill
3. **Instructions** — comment raisonner, quels outils appeler, dans quel ordre
4. **Format de sortie** — structure de la réponse attendue
5. **Pas de clés API hardcodées** — utiliser les variables d'environnement déclarées dans `requires_env`

### Exemple complet

```python
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
```

---

## Checklist avant PR

- [ ] `skill.yaml` rempli avec tous les champs obligatoires
- [ ] `name` en kebab-case correspond au nom du dossier
- [ ] `type: conversational` présent
- [ ] `capabilities` : 1 à 6 items, chacun commence par un verbe
- [ ] Pas de clé API dans le code — utiliser `requires_env`
- [ ] `skill.py` hérite de `SkillBase` avec `SYSTEM_PROMPT` défini
- [ ] Testé localement dans Jarvis avant la PR
- [ ] `index.json` mis à jour avec l'entrée du skill

---

## Voir aussi

- [Schéma JSON : schemas/skill.schema.json](schemas/skill.schema.json)
- [Skill de référence : web-researcher](skills/web-researcher/)
- [Standard vues : VIEWS_STANDARD.md](VIEWS_STANDARD.md)
- [Standard presets : PRESETS_STANDARD.md](PRESETS_STANDARD.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
