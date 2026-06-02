---
id: system-monitor
name: "System Monitor"
version: 1.0.0
author: Grominet95
description: "Dashboard système temps réel — CPU, RAM, disque, cerveau LLM et services Jarvis"
tags: [système, monitoring, dashboard, performance]
glyph: SYS
commands:
  - action: show
    description: Affiche le dashboard système en plein écran
  - action: hide
    description: Masque le dashboard
  - action: focus_metric
    description: Met en avant une métrique précise avec animation de focus
    params:
      metric: string
  - action: refresh
    description: Force un rafraîchissement immédiat de toutes les données
---

Vue cockpit style Iron Man affichant l'état temps réel de la machine et des services Jarvis.

**Métriques supportées pour `focus_metric`** : `cpu`, `ram`, `disk`, `llm`, `missions`.

**Cross-platform** : compatible macOS et Windows. La batterie est masquée automatiquement si absente (desktop Windows).

**Sources de données** (endpoints locaux Jarvis, aucune dépendance externe) :
- `/api/system/perf` — métriques machine (CPU, RAM, disque, uptime, batterie, process) — polling 1,5 s
- `/api/system/stats` — état Jarvis (missions, mémoire, sessions) — polling 7 s
- `/api/proactive/status` — moteur proactif — polling 7 s
- `/api/config/llm-status` — provider LLM actif sur chaque route — polling 7 s
