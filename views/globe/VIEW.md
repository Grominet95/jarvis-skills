---
id: globe
schema_version: "1.0"
name: Globe
version: 1.1.0
author: BarthH95
description: Globe terrestre interactif temps réel — navigation vocale et vols animés
tags: [geo, realtime, map, globe, navigation]
glyph: GLB
requires_env:
  - name: MAPBOX_TOKEN
    description: Token public Mapbox GL JS (commence par "pk.")
    example: "pk.eyJ1IjoiYmFydGgtOTUiLCJhIjoiY..."
    sensitive: true
commands:
  - action: show
    description: Affiche le globe en plein écran avec auto-rotation
  - action: hide
    description: Masque le globe
  - action: fly_to
    description: Vol animé vers un lieu ou des coordonnées
    params:
      location: string   # nom du lieu OU "lat,lon"
      lat: float         # latitude (alternative à location)
      lon: float         # longitude (alternative à location)
      zoom: int          # niveau de zoom 0-20, défaut 4
      location_name: string  # nom affiché dans le toast (optionnel)
  - action: zoom_in
    description: Zoome de 3 niveaux
  - action: zoom_out
    description: Dézoome de 3 niveaux
  - action: globe_view
    description: Réinitialise vers la vue globe entière (center [10,20] zoom 1.5)
  - action: zoom_by
    description: Zoom continu relatif (gesture pincement)
    params:
      delta: float   # pas de zoom signé
  - action: toggle_rotation
    description: Active/désactive l'auto-rotation du globe
gestures:
  - "on": pinch_y      # 'on' quoté : mot réservé booléen en YAML 1.1
    command: zoom_by
    mode: continuous
    throttle_ms: 80
  - "on": Open_Palm
    command: toggle_rotation
    mode: discrete
  - "on": Victory
    command: globe_view
    mode: discrete
  - "on": Thumb_Down
    action: hide_view
    mode: discrete
---
