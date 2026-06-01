# Jarvis Presets — Standard

Ce document est la **référence unique** pour créer une preset dans Jarvis.
Une preset déclenche une **séquence d'actions concrètes** sur la machine de l'utilisateur : ouvrir des applications, activer Ne pas déranger, lancer Spotify, faire parler Jarvis, appeler un LLM. Une phrase suffit à tout lancer.

Schéma machine-vérifiable : [`schemas/preset.schema.json`](schemas/preset.schema.json)

---

## Structure d'une preset

Chaque preset vit dans son propre dossier sous `skills/` (même répertoire que les skills conversationnels) :

```
skills/
└── ma-preset/
    ├── skill.yaml     ← manifest de la preset (requis)
    ├── skill.py       ← classe Python héritant de PresetSkill (requis)
    └── README.md      ← doc utilisateur (optionnel)
```

Le nom du dossier est en **kebab-case minuscule** : `mode-streameur`, `mode-travail`, `mode-nuit`.

---

## Format `skill.yaml`

### Champs obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string (kebab-case) | Identifiant unique — correspond au nom du dossier |
| `version` | semver | Version `MAJOR.MINOR.PATCH` |
| `author` | string | Pseudo GitHub de l'auteur |
| `description` | string | Description en une phrase claire |
| `tags` | liste de strings | `"preset"` doit être le **premier** élément |
| `type` | `"preset"` | Doit être exactement `preset` |
| `triggers` | liste de strings | Phrases déclencheuses en langage naturel (min 1) |
| `platforms` | liste d'enums | Plateformes testées : `mac`, `windows`, `linux` |
| `requires_env` | liste | Variables d'environnement requises (liste vide autorisée) |
| `requires_tools` | liste de strings | Outils Jarvis requis (liste vide autorisée) |
| `requires_oauth` | liste de strings | Connexions OAuth requises (liste vide autorisée) |
| `requires_apps` | liste | Applications tierces requises (liste vide autorisée) |
| `capabilities` | liste de strings | Ce que la preset fait — 1 à 6 items |
| `steps` | liste d'objets | Séquence d'actions, exécutées dans l'ordre (min 1) |

### Champs optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `jarvis_min_version` | nombre | Version minimale de Jarvis requise (ex: `3.0`) |

### Détail : `triggers`

Phrases que l'utilisateur peut dire pour déclencher la preset.
Jarvis les reconnaît même si la formulation est légèrement différente.

```yaml
triggers:
  - "lance le mode travail"
  - "mode focus"
  - "on bosse"
  - "je commence à travailler"
```

### Détail : `platforms`

Ne lister **que les plateformes testées**. Ne pas déclarer `linux` si la preset n'a pas été testée sur Linux.
Pour chaque step de type `cli`, utiliser la clé de plateforme correspondante ou `null` pour skippper silencieusement.

### Détail : `requires_apps`

Même format que les skills conversationnels. Pour les presets qui ouvrent des applications, inclure `mac_bundle` et `windows_exe` pour permettre à Jarvis de vérifier si l'application est installée.

```yaml
requires_apps:
  - name: OBS Studio
    description: "Logiciel de streaming (doit être installé)"
    url: https://obsproject.com
    mac_bundle: "OBS"
    windows_exe: "obs64.exe"
    required: true
```

---

## Types de steps

Chaque step a obligatoirement un champ `name` (descriptif, affiché dans les logs) et un champ `type`.

### `cli` — Commande shell

Exécute une commande sur la machine de l'utilisateur.

**Forme multi-plateforme** (commandes différentes par OS) :

```yaml
- name: Ouvrir OBS
  type: cli
  platforms:
    mac: "open -a 'OBS'"
    windows: "start '' obs64.exe"
    linux: null          # null = step skippé silencieusement sur Linux
```

**Forme universelle** (même commande sur tous les OS) :

```yaml
- name: Commande universelle
  type: cli
  command: "commande identique sur tous les OS"
```

**Commandes destructives** (fermeture forcée, suppression) :
Ajouter `requires_confirmation: true` pour demander une confirmation à l'utilisateur avant exécution.

```yaml
- name: Fermer VS Code
  type: cli
  requires_confirmation: true
  platforms:
    mac: "osascript -e 'quit app \"Visual Studio Code\"'"
    windows: "taskkill /IM code.exe /F"
    linux: "pkill code"
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `platforms` | oui (ou `command`) | Objet `{mac, windows, linux}` — valeur = commande ou `null` |
| `command` | oui (ou `platforms`) | Commande universelle identique sur tous les OS |
| `requires_confirmation` | non | `true` pour demander confirmation avant une action destructive |

---

### `spotify` — Contrôle Spotify

Contrôle la lecture Spotify. Nécessite `spotify_control` dans `requires_tools`.

```yaml
- name: Lancer musique focus
  type: spotify
  action: search_playlist
  query: "deep focus coding"
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `action` | oui | `search_playlist`, `search_track`, `play`, `pause`, `next` |
| `query` | non | Requête de recherche (requis pour `search_playlist` et `search_track`) |

---

### `tts` — Synthèse vocale

Jarvis dit quelque chose à voix haute. Supporte les templates `{{ var }}` pour injecter des variables capturées par un step `ai` précédent.

```yaml
- name: Message de confirmation
  type: tts
  text: "Mode streameur activé. {{ game_recommendation.text }} Bonne session !"
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `text` | oui | Texte à prononcer (supporte `{{ variable.text }}` et `{{ variable.first_line }}`) |

---

### `ai` — Appel LLM

Jarvis génère une réponse contextualisée et la dit à voix haute. La réponse est aussi affichée dans l'interface.

```yaml
- name: Recommandation de jeu
  type: ai
  prompt: >
    Barth va streamer sur Twitch. Recommande-lui UN seul jeu à streamer ce soir.
    Réponds UNIQUEMENT avec : NOM_DU_JEU suivi d'une description courte en 1 phrase.
  output_var: game_recommendation
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `prompt` | oui | Instruction envoyée au LLM |
| `output_var` | non | Nom de variable pour capturer la réponse — réutilisable dans les steps suivants via `{{ output_var.text }}` et `{{ output_var.first_line }}` |

---

### `wait` — Pause

Pause entre deux steps. Utile pour laisser le temps à une application de démarrer.

```yaml
- name: Attendre OBS
  type: wait
  seconds: 3
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `seconds` | oui | Durée d'attente en secondes (nombre positif) |

---

### `notify` — Notification système

Affiche une notification système macOS ou Windows.

```yaml
- name: Notification de fin
  type: notify
  title: "Mode travail activé"
  body: "Bonne session de travail !"
  platforms:
    mac: true
    windows: true
    linux: null
```

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| `title` | oui | Titre de la notification |
| `body` | oui | Corps de la notification |
| `platforms` | non | Activer/désactiver par plateforme (`true` ou `null`) |

---

## Gestion multi-plateforme

### Règle générale

- `null` dans `platforms` d'un step `cli` ou `notify` → step **skippé silencieusement**
- Ne pas déclarer une plateforme dans `platforms` du yaml racine si elle n'est pas testée
- Un step sans clé `platforms` (forme `command:`) s'exécute sur **toutes les plateformes déclarées**

### Exemple complet d'un step conditionnel

```yaml
- name: Activer Ne pas déranger
  type: cli
  platforms:
    mac: "osascript -e 'tell application \"System Events\" to set doNotDisturb to true'"
    windows: >-
      powershell -NoProfile -Command "
      $ns = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\...';
      Set-ItemProperty -Path $ns -Name 'Data' -Value ..."
    linux: null
```

---

## Format `skill.py`

### Contrat `PresetSkill`

```python
from skills.base import PresetSkill


class MaPreset(PresetSkill):
    """
    Description courte de la preset.
    Le SYSTEM_PROMPT est auto-généré depuis skill.yaml.
    Ce fichier est intentionnellement minimal.
    """

    # SYSTEM_PROMPT est généré automatiquement par PresetSkill à partir de skill.yaml.
    # Le surcharger uniquement pour personnaliser le comportement vocal :
    #
    # SYSTEM_PROMPT = """
    # ## Skill : Mode Streameur
    # Quand l'utilisateur dit "lance le mode streameur" ou similaire,
    # appeler execute_preset('mode-streameur').
    # Tu peux aussi demander : "Quel jeu tu stream ce soir ?"
    # """
```

| Membre | Obligatoire | Description |
|--------|-------------|-------------|
| `SYSTEM_PROMPT` | non | Auto-généré depuis `skill.yaml` — surcharger uniquement pour un comportement vocal personnalisé |

### Règles

1. La classe hérite de `PresetSkill` (pas de `SkillBase`)
2. Toute la logique d'exécution est dans `skill.yaml` — le `.py` reste minimal
3. Surcharger `SYSTEM_PROMPT` uniquement si tu veux que Jarvis pose des questions avant de lancer ou adapte son discours

---

## Exemple complet

```yaml
name: mode-travail
version: 1.1.0
author: BarthH95
description: Lance l'environnement de travail : apps, musique focus, Ne pas déranger.
tags: [preset, travail, focus, productivite]
type: preset
triggers:
  - "lance le mode travail"
  - "mode focus"
  - "on bosse"
  - "je commence à travailler"
platforms: [mac, windows]
requires_env: []
requires_tools: [spotify_control, execute_cli, notion_tasks]
requires_oauth: []
requires_apps:
  - name: Notion
    description: "Application Notion desktop"
    url: https://www.notion.so/desktop
    mac_bundle: "Notion"
    windows_exe: "Notion.exe"
    required: false
  - name: Visual Studio Code
    description: "Éditeur de code"
    url: https://code.visualstudio.com
    mac_bundle: "Visual Studio Code"
    windows_exe: "code.exe"
    required: false
capabilities:
  - "Ouvre Notion et VS Code"
  - "Lance une playlist Spotify deep focus"
  - "Active le mode Ne pas déranger"
  - "Fait un brief vocal des tâches Notion du jour"
steps:

  - name: Ouvrir Notion
    type: cli
    platforms:
      mac: "open -a 'Notion'"
      windows: "start notion.exe"
      linux: null

  - name: Ouvrir VS Code
    type: cli
    platforms:
      mac: "open -a 'Visual Studio Code'"
      windows: "start code.exe"
      linux: "code &"

  - name: Lancer musique focus
    type: spotify
    action: search_playlist
    query: "deep focus coding"

  - name: Activer Ne pas déranger
    type: cli
    platforms:
      mac: "osascript -e 'tell application \"System Events\" to set doNotDisturb to true'"
      windows: "powershell -c \"...\""
      linux: null

  - name: Message de confirmation
    type: tts
    text: "Mode travail activé. Concentration maximale."

  - name: Brief tâches du jour
    type: ai
    prompt: >
      Barth commence une session de travail. Récupère ses tâches Notion
      du jour et donne-lui un brief motivant en 2-3 phrases maximum.
```

---

## Checklist avant PR

- [ ] `skill.yaml` valide avec `type: preset`
- [ ] `"preset"` est le premier élément des `tags`
- [ ] `triggers` non vide (au moins une phrase déclencheuse)
- [ ] `capabilities` : 1 à 6 items, chacun commence par un verbe
- [ ] Chaque step `cli` destructif a `requires_confirmation: true`
- [ ] `platforms` du yaml racine correspond aux plateformes réellement testées
- [ ] `skill.py` hérite de `PresetSkill`
- [ ] Testé sur mac **ou** windows (selon les plateformes déclarées)
- [ ] `index.json` mis à jour avec `"type": "preset"` et `"triggers": [...]`

---

## Voir aussi

- [Schéma JSON : schemas/preset.schema.json](schemas/preset.schema.json)
- [Template à copier : templates/skill-preset/](templates/skill-preset/)
- [Preset de référence : mode-streameur](skills/mode-streameur/)
- [Standard skills conversationnels : SKILLS_STANDARD.md](SKILLS_STANDARD.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
