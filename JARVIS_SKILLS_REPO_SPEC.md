# Cahier des charges — Repo `jarvis-skills`

> Repo GitHub public à créer manuellement.
> URL cible : github.com/Grominet95/jarvis-skills
> Visibilité : Public — Licence : MIT
> Ce repo est la bibliothèque communautaire de skills pour Jarvis.

---

## Concept

Chaque skill est un dossier dans `skills/` contenant deux fichiers :
- `skill.yaml` : metadata (nom, version, auteur, description, tags)
- `skill.py` : code Python avec un `SYSTEM_PROMPT` injecté dans Jarvis

N'importe qui peut contribuer un skill via Pull Request.
Jarvis fetch le catalogue depuis `index.json` et télécharge les skills à la demande.

---

## Structure complète du repo

```
jarvis-skills/
├── README.md
├── CONTRIBUTING.md
├── index.json
├── skills/
│   ├── web-researcher/
│   │   ├── skill.yaml
│   │   └── skill.py
│   ├── youtube-analyzer/
│   │   ├── skill.yaml
│   │   └── skill.py
│   └── impulsion-veille/
│       ├── skill.yaml
│       └── skill.py
└── .github/
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Format `skill.yaml`

```yaml
name: web-researcher           # slug kebab-case unique
version: 1.0.0
author: BarthH95               # pseudo GitHub de l'auteur
description: Recherche web avancée avec synthèse structurée et citations sources.
tags: [research, web, search]
jarvis_min_version: 3.0
requires_tools: []             # outils Jarvis requis (ex: browser, cli, spotify)
requires_env: []               # variables .env requises (ex: YOUTUBE_API_KEY)
```

Champs obligatoires : `name`, `version`, `author`, `description`, `tags`
Champs optionnels : `jarvis_min_version`, `requires_tools`, `requires_env`

---

## Format `skill.py`

```python
"""
Nom du skill et description courte.
"""
from skills.base import SkillBase


class NomDuSkill(SkillBase):
    """Docstring courte."""

    SYSTEM_PROMPT = """
    ## Skill : [Nom]

    [Instructions pour Jarvis — quand utiliser ce skill,
    comment se comporter, quel format de réponse adopter]
    """
```

---

## Contenu des 3 skills initiaux

### `skills/web-researcher/skill.yaml`

```yaml
name: web-researcher
version: 1.0.0
author: BarthH95
description: Recherche web avancée avec synthèse structurée et citations sources.
tags: [research, web, search]
jarvis_min_version: 3.0
requires_tools: [browser]
requires_env: []
```

### `skills/web-researcher/skill.py`

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

### `skills/youtube-analyzer/skill.yaml`

```yaml
name: youtube-analyzer
version: 1.0.0
author: BarthH95
description: Analyse les performances YouTube et suggère des améliorations de contenu.
tags: [youtube, analytics, content, creator]
jarvis_min_version: 3.0
requires_tools: []
requires_env: [YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID]
```

### `skills/youtube-analyzer/skill.py`

```python
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
```

### `skills/impulsion-veille/skill.yaml`

```yaml
name: impulsion-veille
version: 1.0.0
author: BarthH95
description: Veille tech pour Impulsion — surveille les actus IA, hardware et maker.
tags: [impulsion, veille, tech, news, ai, hardware]
jarvis_min_version: 3.0
requires_tools: [browser]
requires_env: []
```

### `skills/impulsion-veille/skill.py`

```python
"""impulsion-veille — Veille tech pour Impulsion."""
from skills.base import SkillBase


class ImpulsionVeille(SkillBase):

    SYSTEM_PROMPT = """
    ## Skill : Veille Tech Impulsion

    Impulsion est un média tech francophone (Instagram carousels + posts flash).
    Audience : makers, développeurs, passionnés de tech française et internationale.

    Quand Barth demande de la veille ou des sujets pour Impulsion :

    Catégories à surveiller en priorité :
    - IA générative et LLMs (nouveaux modèles, benchmarks, usages)
    - Hardware maker (ESP32, Raspberry Pi, nouveaux composants)
    - Tech française et européenne (startups, politique tech)
    - Robotique et automatisation

    Format de réponse pour un post Impulsion :
    - Titre accrocheur en 8 mots max
    - 3-5 points clés en bullets courts
    - Angle différenciant par rapport aux autres médias tech
    - Hashtags pertinents (5-8 max)

    Angle éditorial : accessible mais pas simplifié à l'excès,
    perspective maker/builder, pas juste consommateur.
    """
```

---

## `index.json`

```json
{
  "version": "1.0",
  "updated_at": "2026-05-07",
  "skills": [
    {
      "name": "web-researcher",
      "version": "1.0.0",
      "author": "BarthH95",
      "description": "Recherche web avancée avec synthèse structurée et citations sources.",
      "tags": ["research", "web", "search"],
      "path": "skills/web-researcher",
      "requires_tools": ["browser"],
      "requires_env": []
    },
    {
      "name": "youtube-analyzer",
      "version": "1.0.0",
      "author": "BarthH95",
      "description": "Analyse les performances YouTube et suggère des améliorations.",
      "tags": ["youtube", "analytics", "content", "creator"],
      "path": "skills/youtube-analyzer",
      "requires_tools": [],
      "requires_env": ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"]
    },
    {
      "name": "impulsion-veille",
      "version": "1.0.0",
      "author": "BarthH95",
      "description": "Veille tech pour Impulsion — IA, hardware, maker.",
      "tags": ["impulsion", "veille", "tech", "news"],
      "path": "skills/impulsion-veille",
      "requires_tools": ["browser"],
      "requires_env": []
    }
  ]
}
```

---

## `README.md`

```markdown
# Jarvis Skills

Bibliothèque communautaire de skills pour
[Jarvis](https://github.com/Grominet95/jarvis-OS) —
l'assistant IA personnel open source.

## Qu'est-ce qu'un skill ?

Un skill est une extension de capacité pour Jarvis.
Il enseigne à Jarvis comment se comporter dans un contexte précis :
recherche web avancée, analyse YouTube, veille tech, etc.

Techniquement c'est un fichier Python avec un `SYSTEM_PROMPT`
qui s'injecte automatiquement dans le contexte de Jarvis.

## Installer un skill

Dans Jarvis → ⚙ SYSTÈME → Outils → Marketplace,
recherche le skill et clique "Installer".

## Skills disponibles

| Skill | Description | Auteur | Tags |
|-------|-------------|--------|------|
| web-researcher | Recherche web avancée avec synthèse | BarthH95 | research, web |
| youtube-analyzer | Analyse performances YouTube | BarthH95 | youtube, analytics |
| impulsion-veille | Veille tech pour Impulsion | BarthH95 | veille, tech |

## Contribuer un skill

Tu veux ajouter une capacité à Jarvis et la partager ?
Lis [CONTRIBUTING.md](CONTRIBUTING.md) — c'est rapide.

## Communauté

Discord Le Labo : [lien discord]
GitHub Jarvis : [lien repo principal]
```

---

## `CONTRIBUTING.md`

```markdown
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
requires_tools: []
requires_env: []
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

## Règles

- Compatible Jarvis v3.0+
- Pas de clés API hardcodées — utiliser `requires_env`
- Pas de données personnelles dans le code
- Tester localement avant de PR
- PRs reviewées sous 48-72h

## Questions ?

Discord Le Labo : [lien]
```

---

## `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Nouveau skill : [nom-du-skill]

### Description
<!-- Ce que fait le skill en 2-3 phrases -->

### Pourquoi c'est utile pour Jarvis
<!-- Quel cas d'usage ça résout -->

### Testé avec
- [ ] Jarvis v3.0+
- [ ] Fonctionne avec les tools déclarés dans requires_tools
- [ ] Variables .env documentées dans requires_env

### Tags
<!-- ex: research, web, productivity, music, code -->

### Notes pour la review
<!-- Tout ce qui serait utile -->
```

---

## Mise à jour de `index.json` après chaque PR mergée

Quand une PR est acceptée, mettre à jour manuellement `index.json`
en ajoutant l'entrée du nouveau skill.

À terme : un script GitHub Action peut automatiser ça.

---

*2026-05-07 — jarvis-skills*
