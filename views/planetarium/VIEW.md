---
id: planetarium
name: Planétarium
version: 1.0.0
author: Grominet95
description: "Planétarium Stellarium Web — vue réaliste du ciel (embed, design Stellarium)"
tags: [astronomie, ciel, planétarium, stellarium]
glyph: PLA
commands:
  - action: show
    description: Affiche le planétarium Stellarium Web en plein écran
  - action: hide
    description: Masque la vue
  - action: focus_object
    description: Centre sur un objet (planète, étoile, galaxie, nébuleuse)
    params:
      object: string   # "Mars", "Vega", "M31", "Andromeda", "Orion", etc.
  - action: reload
    description: Recharge l'iframe Stellarium
---

# Planétarium — vue Jarvis (v2 astronomy)

Vue alternative à `astronomy` utilisant **Stellarium Web** en iframe.

## Pourquoi cette vue

`astronomy` est entièrement codée maison (Canvas 2D + HYG + projections),
design 100% Jarvis. `planetarium` embarque le vrai moteur Stellarium Web :
rendu plus pro, catalogues plus larges, **mais l'UI Stellarium s'impose** —
seul le chrome Jarvis autour de l'iframe est personnalisable.

## Limites du design

- L'intérieur de l'iframe (panneaux, polices, couleurs, contrôles) est figé
  par Stellarium Web.
- Le chrome Jarvis (coins / bords) est superposé via overlay z-index, sans
  capter les événements (`pointer-events: none`).
- Pour un design 100% Jarvis sur rendu pro, il faut basculer sur
  **Stellarium Web Engine** (wasm) — beaucoup plus de travail mais
  rendu pro + UI Jarvis libre.

## Navigation

- Les contrôles Stellarium s'utilisent normalement (souris, recherche).
- La commande `focus_object` charge l'objet via l'URL `/skysource/<name>`.
- `reload` recharge l'iframe (utile si Stellarium plante).
