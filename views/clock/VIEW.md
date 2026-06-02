---
id: clock
name: Clock
version: 1.0.0
author: Grominet95
description: "Horloge solaire — cadran 24 h, course du soleil, fuseaux Tokyo/New York/Londres"
tags: [horloge, temps, fuseaux, soleil]
glyph: TPS
commands:
  - action: show
    description: Affiche l'horloge en plein écran (cadran 24 h + heure locale)
  - action: hide
    description: Masque la vue
  - action: local
    description: Recentre sur l'heure locale
  - action: show_timezone
    description: Met en avant un fuseau secondaire (surligne sa carte)
    params:
      city: string   # "Tokyo", "New York", "Londres"
---

# Clock — vue Jarvis

Parti pris **Cadran** (validé) : un anneau 24 h trace l'**arc du jour**
(lever → coucher) et la **course du soleil** ; l'**heure locale** vit au
centre, en grand. Une rangée de **fuseaux secondaires** (Tokyo · New York ·
Londres) se pose en bas.

Combinaison figée : **arc OR**, **secondes affichées**, **phase lunaire
masquée**, **grand cadran**.

## Temps & soleil

- Heure locale = horloge du navigateur (machine Jarvis). Tick **1 s**.
- Fuseaux secondaires via `Intl.DateTimeFormat({ timeZone })` →
  `Asia/Tokyo`, `America/New_York`, `Europe/London`. **DST géré** nativement.
- Lever / coucher / arc du jour : calcul solaire embarqué (déclinaison +
  angle horaire) pour le lieu local (Paris par défaut : `lat 48.8566`,
  `lon 2.3522` dans `LOCAL` de `view.js`). Aucun réseau.

Étendre les fuseaux = ajouter une entrée `{ name, tz }` dans `ZONES`.
