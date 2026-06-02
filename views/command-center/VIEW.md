---
id: command-center
name: Command Center
version: 1.0.0
author: Grominet95
description: "Centre de commande proactif — initiatives en attente, missions actives et journal d'audit temps réel"
tags: [initiatives, missions, proactif, dashboard]
glyph: CMD
commands:
  - action: show
    description: Affiche le centre de commande en plein écran
  - action: hide
    description: Masque le centre de commande
  - action: focus_initiative
    description: Met en évidence une initiative spécifique dans la colonne gauche
    params:
      initiative_id: string
  - action: refresh
    description: Recharge les initiatives et missions depuis l'API proactive
---

## Ce qu'affiche la vue

La vue est divisée en trois colonnes verticales :

**Initiatives** (colonne gauche, la plus large) — cartes des initiatives en attente renvoyées par
`GET /api/proactive/initiatives?status=pending`. Chaque carte montre :
- le type d'initiative (badge), la suggestion en clair, et surtout le **raisonnement** (pourquoi
  Jarvis propose cette action)
- des boutons d'action : **Lancer** (`POST …/run`), **Confirmer** (`POST …/confirm`, après un run
  d'e-mail en deux temps), **Ignorer** (`POST …/dismiss`)

**Missions en cours** (colonne centrale) — état des missions actives issues de
`GET /api/proactive/status`, avec un indicateur de statut animé et une barre de progression.

**Journal d'audit** (colonne droite) — flux chronologique inverse des événements `proactive_audit` :
décision (RUN / SKIP / CONFIRM / DISMISS), justification, horodatage.

## Comment Jarvis invoque la vue

Jarvis utilise le tool `command_center_view` :
- `action="show"` pour ouvrir le centre de commande ("montre tes initiatives", "qu'est-ce que tu
  proposes", "affiche le centre de commande")
- `action="focus_initiative"` avec `initiative_id` pour mettre en évidence une initiative précise
- `action="refresh"` pour forcer un rechargement des données

## Événements WebSocket temps réel

La vue répond aussi aux `view_command` envoyés par le backend :
- `initiative_pending` (params : `initiative` objet) → insère une nouvelle carte en haut de la
  liste avec une animation d'entrée sobre
- `proactive_audit` (params : `audit` objet) → insère une ligne en tête du journal
- `initiatives_restored` → déclenche un rechargement complet depuis l'API
