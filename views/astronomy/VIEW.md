---
id: astronomy
name: Carte du ciel
version: 3.0.0
author: Grominet95
description: "Vrai ciel temps réel — HYG 5000 étoiles, constellations IAU, Voie lactée, DSO, planètes, navigation pan/zoom"
tags: [astronomie, ciel, étoiles, planètes, constellations]
glyph: SKY
commands:
  - action: show
    description: Affiche le vrai ciel (Paris, heure courante)
  - action: hide
    description: Masque la vue
  - action: overview
    description: Réinitialise la vue (plein Sud, alt 45°, FOV 90°)
  - action: focus_constellation
    description: Centre sur une constellation
    params:
      constellation: string   # "Orion", "Cassiopée", "Grande Ourse", "Cygne", "Scorpion", "Lion"
  - action: focus_planet
    description: Centre sur une planète
    params:
      planet: string   # "Mars", "Jupiter", "Saturne", "Vénus", "Mercure"
  - action: set_location
    description: Change le lieu de l'observateur
    params:
      lat: float
      lon: float
  - action: zoom_in
    description: Réduit le champ (zoom avant)
  - action: zoom_out
    description: Élargit le champ (zoom arrière)
---

# Carte du ciel — vue Jarvis

Parti pris **Focus** (validé) : au repos les constellations sont tracées
faiblement sur une voûte d'étoiles ; sur commande ou survol, **une**
constellation s'illumine, le reste du ciel s'assombrit (voile léger), et son
nom s'inscrit en grand (serif géant) avec ses statistiques.

- `show` ouvre en **vue d'ensemble**. `show` avec `constellation` ouvre
  directement sur le focus correspondant.
- 4 constellations embarquées (zéro réseau) : Orion, Cassiopée, Grande Ourse,
  Cygne. Étendre = ajouter une entrée dans la table `CONST` de `view.js`.
- Clic sur une constellation → focus ; clic ailleurs / `esc` → vue d'ensemble.

Remplace l'ancienne vue « système solaire » tout en conservant l'**id
`astronomy`** (les références backend restent valides).
