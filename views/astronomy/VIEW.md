---
id: astronomy
name: Astronomy
version: 1.0.0
author: Grominet95
description: "Système solaire interactif 3D — visualise planètes, orbites et faits astronomiques"
tags: [astronomie, espace, planètes, 3D]
glyph: AST
commands:
  - action: show
    description: Affiche le système solaire en plein écran
  - action: hide
    description: Masque la vue astronomie
  - action: solar_system
    description: Vue d'ensemble du système solaire avec toutes les planètes en orbite
  - action: focus_planet
    description: Zoom et centre sur une planète avec panneau d'informations
    params:
      planet: string
  - action: fly_to_object
    description: Navigation animée vers un objet céleste nommé
    params:
      object_name: string
---
