---
id: memory-map
name: Memory Map
version: 1.0.0
author: Grominet95
description: "Carte visuelle de la mémoire de Jarvis : sujets, souvenirs et données personnelles"
tags: [mémoire, memory, knowledge, privacy]
glyph: MEM
commands:
  - action: show
    description: Affiche la carte mémoire en plein écran
  - action: hide
    description: Masque la carte mémoire
  - action: focus_topic
    description: Ouvre un sujet mémorisé dans le panneau latéral
    params:
      name: string
  - action: refresh
    description: Recharge les données depuis les APIs mémoire
---
