# Cahier des charges — Routine Skills
# Repo : github.com/Grominet95/jarvis-skills

> Modifications à apporter dans le repo `jarvis-skills` uniquement.
> Ce document couvre la structure, les templates, les règles et les
> premières routines de démonstration.

---

## Concept

Une **Routine** est un skill spécial qui déclenche une séquence
d'actions concrètes sur la machine de l'utilisateur.

Différence avec un skill conversationnel :
- Skill conversationnel → enrichit le SYSTEM_PROMPT de Jarvis
- Routine → exécute une liste de steps (CLI, Spotify, TTS, IA...)

Les deux sont des skills à part entière dans `skills/` — même
structure, même installation, même marketplace.

---

## 1. Modifications de la structure du repo

### Arborescence finale

```
jarvis-skills/
├── README.md                          ← mettre à jour
├── CONTRIBUTING.md                    ← mettre à jour
├── index.json                         ← mettre à jour
├── templates/
│   ├── skill-conversationnel/         ← existant, renommer
│   │   ├── skill.yaml
│   │   └── skill.py
│   └── skill-routine/                 ← NOUVEAU
│       ├── skill.yaml
│       ├── skill.py
│       └── README.md
└── skills/
    ├── web-researcher/                ← existant
    ├── youtube-analyzer/              ← existant
    ├── impulsion-veille/              ← existant
    ├── bambulab-printer/              ← existant
    ├── fusion360/                     ← existant
    ├── mode-streameur/                ← NOUVEAU
    │   ├── skill.yaml
    │   └── skill.py
    ├── mode-travail/                  ← NOUVEAU
    │   ├── skill.yaml
    │   └── skill.py
    └── mode-nuit/                     ← NOUVEAU
        ├── skill.yaml
        └── skill.py
```

---

## 2. Template skill-routine

### `templates/skill-routine/skill.yaml`

```yaml
# ─────────────────────────────────────────────────────────────
# TEMPLATE ROUTINE SKILL — jarvis-skills
# Copier ce dossier dans skills/nom-de-ta-routine/
# Renommer "name" et remplir tous les champs.
# ─────────────────────────────────────────────────────────────

# ── Metadata ──────────────────────────────────────────────────
name: ma-routine                    # slug kebab-case unique, pas d'espaces
version: 1.0.0
author: ton-pseudo-github
description: Ce que fait la routine en une phrase claire.
tags: [routine, tag1, tag2]         # toujours inclure "routine" comme premier tag
type: routine                       # OBLIGATOIRE pour les routines

# ── Déclencheurs vocaux ───────────────────────────────────────
# Phrases que l'utilisateur peut dire pour déclencher la routine.
# Jarvis les reconnaît même si la formulation est légèrement différente.
triggers:
  - "phrase principale"
  - "variante 1"
  - "variante 2"

# ── Compatibilité plateforme ──────────────────────────────────
# Lister les plateformes supportées.
# Valeurs possibles : mac, windows, linux
# Si un step n'est pas supporté sur une plateforme, le mettre à null.
platforms: [mac, windows]          # ne pas lister linux si non testé

# ── Prérequis ─────────────────────────────────────────────────
requires_env: []                    # variables .env nécessaires
requires_tools: []                  # outils Jarvis nécessaires
requires_oauth: []                  # connexions OAuth nécessaires

# ── Steps ─────────────────────────────────────────────────────
# Liste des actions à exécuter dans l'ordre.
# Types disponibles : cli, spotify, tts, ai, wait, notify
steps:

  # ── Type : cli ──────────────────────────────────────────────
  # Exécute une commande shell.
  # Utiliser "platforms" pour les commandes qui diffèrent par OS.
  # Si une plateforme est null → step skippé silencieusement.
  - name: "Nom descriptif du step"
    type: cli
    platforms:
      mac: "commande macOS ici"
      windows: "commande Windows ici"
      linux: null                   # null = non supporté = skippé

  # ── Type : cli universel ────────────────────────────────────
  # Si la commande est identique sur tous les OS.
  - name: "Commande universelle"
    type: cli
    command: "commande identique sur tous les OS"

  # ── Type : spotify ──────────────────────────────────────────
  # Contrôle Spotify. Nécessite le tool spotify_control.
  - name: "Lancer une playlist"
    type: spotify
    action: search_playlist         # search_playlist | search_track | play | pause | next
    query: "Nom de la playlist"

  # ── Type : tts ──────────────────────────────────────────────
  # Jarvis dit quelque chose à voix haute.
  - name: "Message vocal"
    type: tts
    text: "Ce que Jarvis dit."

  # ── Type : ai ───────────────────────────────────────────────
  # Appel LLM — Jarvis génère une réponse contextuelle et la dit.
  # La réponse est aussi affichée dans l'interface.
  - name: "Conseil IA"
    type: ai
    prompt: "Instruction pour Jarvis — contexte + ce qu'il doit faire."

  # ── Type : wait ─────────────────────────────────────────────
  # Pause entre deux steps.
  - name: "Attendre"
    type: wait
    seconds: 2

  # ── Type : notify ────────────────────────────────────────────
  # Notification système (macOS/Windows).
  - name: "Notification"
    type: notify
    title: "Titre de la notif"
    body: "Corps de la notification."
    platforms:
      mac: true
      windows: true
      linux: null
```

---

### `templates/skill-routine/skill.py`

```python
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
```

---

### `templates/skill-routine/README.md`

```markdown
# Template Routine Skill

Utilise ce template pour créer une nouvelle routine Jarvis.

## Qu'est-ce qu'une routine ?

Une routine déclenche une séquence d'actions sur la machine de l'utilisateur.
Elle peut ouvrir des apps, contrôler Spotify, faire parler Jarvis,
ou appeler un LLM pour des suggestions intelligentes.

## Comment utiliser ce template

1. Copier ce dossier dans `skills/nom-de-ta-routine/`
2. Modifier `skill.yaml` — remplir tous les champs
3. Modifier `skill.py` — renommer la classe (optionnel)
4. Tester localement dans Jarvis
5. Ouvrir une Pull Request

## Règles importantes

- Toujours inclure `type: routine` dans skill.yaml
- Toujours inclure `"routine"` dans les tags
- Toujours tester sur les plateformes déclarées dans `platforms`
- Pour les commandes CLI : tester sur Mac ET Windows si les deux sont listés
- Si une plateforme n'est pas testée : ne pas la lister, mettre `null`
- Pas de commandes destructives sans confirmation (rm -rf, format, etc.)

## Plateformes

| Plateforme | Valeur yaml | Système détecté |
|-----------|-------------|-----------------|
| macOS     | mac         | darwin          |
| Windows   | windows     | windows         |
| Linux     | linux       | linux           |

## Types de steps disponibles

| Type    | Description                              |
|---------|------------------------------------------|
| cli     | Commande shell (avec variantes par OS)   |
| spotify | Contrôle Spotify                         |
| tts     | Jarvis parle                             |
| ai      | Appel LLM contextuel                     |
| wait    | Pause en secondes                        |
| notify  | Notification système                     |
```

---

## 3. Règles officielles pour les routines

### Règles obligatoires

```
R1. Le champ "type: routine" est OBLIGATOIRE dans skill.yaml.
    Sans ce champ, Jarvis traite le skill comme un skill conversationnel.

R2. Le tag "routine" doit être le PREMIER tag dans la liste.
    tags: [routine, stream, gaming] ✓
    tags: [stream, gaming, routine] ✗

R3. Au moins un trigger doit être défini.
    Un skill de routine sans trigger ne peut pas être déclenché vocalement.

R4. Le champ "platforms" au niveau racine doit lister les plateformes
    TESTÉES par l'auteur. Ne pas lister une plateforme non testée.

R5. Chaque step de type "cli" DOIT avoir soit :
    - un champ "command" (universel)
    - un champ "platforms" avec au moins une entrée non-null

R6. Les commandes potentiellement destructives (rm, del, format, shutdown,
    drop, truncate, kill) DOIVENT avoir "requires_confirmation: true".
    Jarvis demandera confirmation avant d'exécuter ce step.

R7. Les variables d'environnement requises DOIVENT être déclarées dans
    "requires_env". Ne jamais hardcoder des valeurs sensibles.
```

### Règles de nommage

```
R8. Le nom de la routine (champ "name") doit être en kebab-case.
    mode-streameur ✓
    Mode Streameur ✗
    mode_streameur ✗

R9. Les noms de steps (champ "name" dans chaque step) sont libres
    mais doivent être descriptifs en français ou en anglais.
```

### Règles cross-plateforme

```
R10. Si une commande est identique sur tous les OS → utiliser "command"
     (pas "platforms"). C'est plus simple et plus maintenable.

R11. Si une commande n'existe pas sur une plateforme → mettre null.
     Le step sera skippé silencieusement, pas d'erreur.

R12. Si TOUTES les plateformes d'un step sont null → erreur à l'installation.
     Au moins une plateforme doit être non-null par step.

R13. Les commandes Windows utilisent cmd.exe ou PowerShell.
     Préférer PowerShell pour les opérations complexes.
     Préférer cmd pour les commandes simples (start, echo, etc.)

R14. Les chemins de fichiers dans les commandes doivent utiliser
     des chemins relatifs ou des variables d'environnement.
     Jamais de chemins absolus codés en dur (/Users/barth/... ✗)
```

### Règles de sécurité

```
R15. Pas de commandes qui modifient des fichiers système.
R16. Pas de commandes réseau non déclarées dans requires_env.
R17. Pas d'accès à des APIs externes sans déclarer requires_env.
R18. Pas de scripts qui s'exécutent en arrière-plan indéfiniment
     (boucles infinies, daemons) — utiliser les outils Jarvis pour ça.
```

---

## 4. Mettre à jour `index.json`

Ajouter les 3 nouvelles routines + le champ `type` pour tous les skills :

```json
{
  "version": "1.2",
  "updated_at": "2026-05-08",
  "skills": [
    {
      "name": "web-researcher",
      "version": "1.0.0",
      "type": "conversational",
      "author": "BarthH95",
      "description": "Recherche web avancée avec synthèse structurée et citations sources.",
      "tags": ["research", "web", "search"],
      "path": "skills/web-researcher",
      "requires_env": [],
      "requires_tools": ["browser"],
      "requires_oauth": [],
      "platforms": ["mac", "windows", "linux"]
    },
    {
      "name": "youtube-analyzer",
      "version": "1.0.0",
      "type": "conversational",
      "author": "BarthH95",
      "description": "Analyse les performances YouTube et suggère des améliorations.",
      "tags": ["youtube", "analytics", "content", "creator"],
      "path": "skills/youtube-analyzer",
      "requires_env": ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"],
      "requires_tools": [],
      "requires_oauth": [],
      "platforms": ["mac", "windows", "linux"]
    },
    {
      "name": "impulsion-veille",
      "version": "1.0.0",
      "type": "conversational",
      "author": "BarthH95",
      "description": "Veille tech pour Impulsion — IA, hardware, maker.",
      "tags": ["impulsion", "veille", "tech", "news"],
      "path": "skills/impulsion-veille",
      "requires_env": [],
      "requires_tools": ["browser"],
      "requires_oauth": [],
      "platforms": ["mac", "windows", "linux"]
    },
    {
      "name": "bambulab-printer",
      "version": "1.0.1",
      "type": "conversational",
      "author": "BarthH95",
      "description": "Contrôle une imprimante 3D BambuLab via MQTT.",
      "tags": ["hardware", "3d-print", "bambu"],
      "path": "skills/bambulab-printer",
      "requires_env": ["PRINTER_IP", "PRINTER_SERIAL", "PRINTER_ACCESS_CODE"],
      "requires_tools": [],
      "requires_oauth": [],
      "platforms": ["mac", "windows", "linux"]
    },
    {
      "name": "fusion360",
      "version": "1.0.1",
      "type": "conversational",
      "author": "BarthH95",
      "description": "Contrôle Autodesk Fusion 360 via MCP.",
      "tags": ["hardware", "cad", "3d", "fusion"],
      "path": "skills/fusion360",
      "requires_env": [],
      "requires_tools": [],
      "requires_oauth": [],
      "platforms": ["mac", "windows"]
    },
    {
      "name": "mode-streameur",
      "version": "1.0.0",
      "type": "routine",
      "author": "BarthH95",
      "description": "Lance l'environnement stream — OBS, Spotify, Ne pas déranger.",
      "tags": ["routine", "stream", "gaming", "obs"],
      "path": "skills/mode-streameur",
      "requires_env": [],
      "requires_tools": ["spotify_control", "execute_cli"],
      "requires_oauth": [],
      "platforms": ["mac", "windows"],
      "triggers": ["lance le mode streameur", "démarre le stream", "on stream"]
    },
    {
      "name": "mode-travail",
      "version": "1.0.0",
      "type": "routine",
      "author": "BarthH95",
      "description": "Lance l'environnement de travail — apps, musique focus, DND.",
      "tags": ["routine", "travail", "focus", "productivite"],
      "path": "skills/mode-travail",
      "requires_env": [],
      "requires_tools": ["spotify_control", "execute_cli"],
      "requires_oauth": [],
      "platforms": ["mac", "windows"],
      "triggers": ["lance le mode travail", "mode focus", "on bosse"]
    },
    {
      "name": "mode-nuit",
      "version": "1.0.0",
      "type": "routine",
      "author": "BarthH95",
      "description": "Prépare l'environnement nuit — ferme les apps, musique douce, rappels.",
      "tags": ["routine", "nuit", "veille", "fin-de-journee"],
      "path": "skills/mode-nuit",
      "requires_env": [],
      "requires_tools": ["spotify_control", "execute_cli"],
      "requires_oauth": [],
      "platforms": ["mac", "windows"],
      "triggers": ["lance le mode nuit", "bonne nuit", "fin de journée", "je vais dormir"]
    }
  ]
}
```

---

## 5. Les 3 routines de démonstration

### `skills/mode-streameur/skill.yaml`

```yaml
name: mode-streameur
version: 1.0.0
author: BarthH95
description: Lance l'environnement stream — OBS, Spotify, Ne pas déranger.
tags: [routine, stream, gaming, obs]
type: routine
triggers:
  - "lance le mode streameur"
  - "démarre le stream"
  - "on stream"
  - "je vais streamer"
platforms: [mac, windows]
requires_env: []
requires_tools: [spotify_control, execute_cli]
requires_oauth: []
steps:

  - name: Ouvrir OBS
    type: cli
    platforms:
      mac: "open -a 'OBS'"
      windows: "start obs64.exe"
      linux: null

  - name: Attendre OBS
    type: wait
    seconds: 2

  - name: Lancer playlist stream
    type: spotify
    action: search_playlist
    query: "lo-fi hip hop stream"

  - name: Activer Ne pas déranger
    type: cli
    platforms:
      mac: "osascript -e 'tell application \"System Events\" to set doNotDisturb to true'"
      windows: "powershell -c \"$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.notifications.quiethourssettings'; New-Item -Path $path -Force\""
      linux: null

  - name: Message de confirmation
    type: tts
    text: "Mode streameur activé. Bonne session !"

  - name: Suggestion de jeu
    type: ai
    prompt: >
      Barth va streamer. Donne-lui une suggestion courte et motivante
      sur quoi streamer ce soir — un jeu tendance, un projet maker,
      ou une idée originale. Maximum 2 phrases, ton décontracté.
```

---

### `skills/mode-streameur/skill.py`

```python
"""
mode-streameur — Routine Jarvis.

Lance l'environnement stream : OBS, Spotify lo-fi, Ne pas déranger.
Déclencheurs : "lance le mode streameur", "démarre le stream", "on stream"
Plateformes : mac, windows
"""
from skills.base import RoutineSkill


class ModeStreameur(RoutineSkill):
    """
    Lance l'environnement de streaming.
    Ouvre OBS, met de la musique lo-fi et active le mode Ne pas déranger.
    Termine avec une suggestion IA de contenu à streamer.
    """
```

---

### `skills/mode-travail/skill.yaml`

```yaml
name: mode-travail
version: 1.0.0
author: BarthH95
description: Lance l'environnement de travail — apps, musique focus, Ne pas déranger.
tags: [routine, travail, focus, productivite]
type: routine
triggers:
  - "lance le mode travail"
  - "mode focus"
  - "on bosse"
  - "je commence à travailler"
  - "démarre la session de travail"
platforms: [mac, windows]
requires_env: []
requires_tools: [spotify_control, execute_cli, notion_tasks]
requires_oauth: []
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
      windows: "powershell -c \"$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.notifications.quiethourssettings'; New-Item -Path $path -Force\""
      linux: null

  - name: Message de confirmation
    type: tts
    text: "Mode travail activé. Concentration maximale."

  - name: Brief tâches du jour
    type: ai
    prompt: >
      Barth commence une session de travail. Récupère ses tâches Notion
      du jour et donne-lui un brief motivant en 2-3 phrases maximum.
      Mentionne les 2-3 tâches les plus importantes. Sois direct et concis.
```

---

### `skills/mode-travail/skill.py`

```python
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
```

---

### `skills/mode-nuit/skill.yaml`

```yaml
name: mode-nuit
version: 1.0.0
author: BarthH95
description: Prépare la fin de journée — ferme les apps de travail, musique douce.
tags: [routine, nuit, veille, fin-de-journee]
type: routine
triggers:
  - "lance le mode nuit"
  - "bonne nuit"
  - "fin de journée"
  - "je vais dormir"
  - "on arrête pour ce soir"
platforms: [mac, windows]
requires_env: []
requires_tools: [spotify_control, execute_cli]
requires_oauth: []
steps:

  - name: Fermer VS Code
    type: cli
    platforms:
      mac: "osascript -e 'quit app \"Visual Studio Code\"'"
      windows: "taskkill /IM code.exe /F"
      linux: "pkill code"

  - name: Fermer Notion
    type: cli
    platforms:
      mac: "osascript -e 'quit app \"Notion\"'"
      windows: "taskkill /IM Notion.exe /F"
      linux: null

  - name: Musique douce
    type: spotify
    action: search_playlist
    query: "chill evening wind down"

  - name: Désactiver Ne pas déranger
    type: cli
    platforms:
      mac: "osascript -e 'tell application \"System Events\" to set doNotDisturb to false'"
      windows: "powershell -c \"Remove-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.data.notifications.quiethourssettings' -Force -ErrorAction SilentlyContinue\""
      linux: null

  - name: Message de fin
    type: tts
    text: "Bonne soirée Barth. À demain !"

  - name: Bilan de journée
    type: ai
    prompt: >
      C'est la fin de journée pour Barth. Donne-lui un bilan
      motivant en 2 phrases : encourage-le sur ce qu'il a accompli
      et donne-lui une seule chose à garder en tête pour demain.
      Ton chaleureux, pas condescendant.
```

---

### `skills/mode-nuit/skill.py`

```python
"""
mode-nuit — Routine Jarvis.

Prépare la fin de journée et fait un bilan.
Déclencheurs : "bonne nuit", "fin de journée", "je vais dormir"
Plateformes : mac, windows
"""
from skills.base import RoutineSkill


class ModeNuit(RoutineSkill):
    """
    Routine de fin de journée.
    Ferme les apps de travail, lance une playlist douce,
    Jarvis fait un bilan motivant de la journée.
    """
```

---

## 6. Mettre à jour `CONTRIBUTING.md`

Ajouter une section Routines :

```markdown
## Contribuer une routine

Une routine est un skill qui déclenche une séquence d'actions.

### Utiliser le template

```bash
cp -r templates/skill-routine/ skills/ma-routine/
```

### Règles importantes

1. `type: routine` obligatoire dans skill.yaml
2. `"routine"` doit être le premier tag
3. Tester sur toutes les plateformes déclarées dans `platforms`
4. Mettre `null` pour les plateformes non testées
5. Pas de commandes destructives sans `requires_confirmation: true`
6. Mettre à jour `index.json` avec `"type": "routine"`

### Checklist PR

- [ ] skill.yaml valide avec type: routine
- [ ] Testé sur mac OU windows (selon platforms déclaré)
- [ ] Aucune commande destructive non confirmée
- [ ] index.json mis à jour
- [ ] skill.py minimal avec classe héritant de RoutineSkill
```

---

## 7. Mettre à jour `README.md`

Ajouter une section Routines dans le tableau des skills :

```markdown
## Skills disponibles

### Skills conversationnels

| Skill | Description | Auteur | Tags |
|-------|-------------|--------|------|
| web-researcher | Recherche web avancée | BarthH95 | research, web |
| youtube-analyzer | Analyse YouTube | BarthH95 | youtube |
| impulsion-veille | Veille tech | BarthH95 | veille, tech |
| bambulab-printer | Imprimante 3D BambuLab | BarthH95 | hardware |
| fusion360 | Modélisation Fusion 360 | BarthH95 | cad, 3d |

### Routines

| Routine | Description | Auteur | Plateformes |
|---------|-------------|--------|-------------|
| mode-streameur | Env. stream — OBS, Spotify, DND | BarthH95 | mac, windows |
| mode-travail | Env. travail — Notion, VS Code, focus | BarthH95 | mac, windows |
| mode-nuit | Fin de journée — bilan, musique douce | BarthH95 | mac, windows |
```

---

## 8. Résumé des fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `templates/skill-routine/skill.yaml` | Créer |
| `templates/skill-routine/skill.py` | Créer |
| `templates/skill-routine/README.md` | Créer |
| `skills/mode-streameur/skill.yaml` | Créer |
| `skills/mode-streameur/skill.py` | Créer |
| `skills/mode-travail/skill.yaml` | Créer |
| `skills/mode-travail/skill.py` | Créer |
| `skills/mode-nuit/skill.yaml` | Créer |
| `skills/mode-nuit/skill.py` | Créer |
| `index.json` | Modifier — ajouter type + 3 nouvelles routines |
| `CONTRIBUTING.md` | Modifier — ajouter section Routines |
| `README.md` | Modifier — ajouter tableau Routines |

---

*2026-05-08 — jarvis-skills Routine Skills*
