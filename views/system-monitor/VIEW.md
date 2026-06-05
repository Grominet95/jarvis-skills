---
id: system-monitor
name: System Monitor
version: 2.0.0
author: Grominet95
description: "Cockpit système temps réel — jauges CPU/RAM/disque, cerveau LLM, services, missions"
tags: [système, monitoring, dashboard, performance]
glyph: SYS
commands:
  - action: show
    description: Affiche le cockpit système en plein écran
  - action: hide
    description: Masque la vue
  - action: focus_metric
    description: Met une métrique en avant (surligne + agrandit la jauge)
    params:
      metric: string   # "cpu", "ram", "disk", "llm", "missions"
  - action: overview
    description: Retire le focus, revient à la vue d'ensemble
  - action: refresh
    description: Force un rafraîchissement immédiat des données
---

# System Monitor — vue Jarvis

Parti pris **Cockpit** (validé) : **jauges radiales** à coloration par charge
(bleu < 55 % · or < 80 % · rouge ≥ 80 %), **carte cerveau LLM** (provider,
modèle, badge LOCAL/CLOUD, routes), **cartes de service**, **sparklines** et
uptime. Densité confort.

## Données RÉELLES (inchangées vs version d'origine)

La vue interroge l'API Jarvis sur `window.location.origin` :

| Endpoint | Cadence | Alimente |
|---|---|---|
| `GET /api/system/perf` | 1,5 s | CPU, RAM, disque, uptime, process, batterie |
| `GET /api/system/stats` | 7 s | missions, mémoire, sessions |
| `GET /api/proactive/status` | 7 s | moteur proactif |
| `GET /api/config/llm-status` | 7 s | cerveau LLM (provider / modèle / routes) |

Le **parsing des champs est strictement identique** à la version v1
(tolérant aux variantes : `disk_pct`/`disk_used_pct`, `proc` objet ou liste,
batterie masquée si `null`, etc.). Seule la **présentation** change (cockpit +
chrome Jarvis commun). La batterie est masquée automatiquement sur desktop
sans batterie.

Remplace l'ancienne vue System Monitor en conservant l'**id
`system-monitor`** et le **contrat de commandes** (`focus_metric`, `refresh`).
