---
id: astronomy
name: Carte du ciel
version: 2.0.0
author: Grominet95
description: "Voûte céleste immersive — constellations qui s'illuminent au focus, faits stellaires"
tags: [astronomie, ciel, constellations, étoiles]
glyph: SKY
commands:
  - action: show
    description: Affiche la carte du ciel en plein écran (vue d'ensemble, constellations tracées faiblement)
  - action: hide
    description: Masque la vue
  - action: overview
    description: Revient à la vue d'ensemble du ciel (dézoom, retire le focus)
  - action: focus_constellation
    description: Met une constellation au point — le reste du ciel s'assombrit, ses lignes s'illuminent, son nom s'écrit en grand
    params:
      constellation: string   # "Orion", "Cassiopée", "Grande Ourse", "Cygne"
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
