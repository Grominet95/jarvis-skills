---
id: weather
schema_version: "1.0"
name: Weather
version: 1.0.0
author: Grominet95
description: "Météo immersive — scène de ciel animée, conditions et prévisions horaires (Open-Meteo)"
tags: [météo, climat, prévisions, ciel]
glyph: MTO
commands:
  - action: show
    description: Affiche la météo en plein écran (lieu par défaut Paris, ou params lat/lon/city)
    params:
      city: string     # optionnel — nom de ville (géocodé via Open-Meteo)
  - action: hide
    description: Masque la vue
  - action: set_location
    description: Change le lieu affiché (par nom de ville, ou par coordonnées)
    params:
      city: string     # soit city…
      lat: float        # … soit lat + lon (+ name optionnel)
      lon: float
      name: string
  - action: refresh
    description: Recharge les données météo du lieu courant
---

# Weather — vue Jarvis

Parti pris **Plein ciel** (validé) : une scène météo animée (Canvas) occupe
tout l'écran ; **température géante** en bas-gauche, **bandeau de prévisions
horaires** en bas, **widget « Conditions »** (ressenti, vent, humidité,
visibilité) en haut-droite.

## Données — Open-Meteo (gratuit, sans clé API)

Appel direct depuis la vue (CORS ouvert), aucun token requis :

- Géocodage : `https://geocoding-api.open-meteo.com/v1/search?name=<ville>`
- Prévisions : `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…`
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day`
  `&hourly=temperature_2m,weather_code,visibility&forecast_days=2&timezone=auto`

Les codes météo **WMO** sont mappés vers 4 scènes (`clear`, `night`, `clouds`,
`rain`) + un libellé FR. Une donnée de repli (Paris) s'affiche instantanément,
puis le fetch réel l'écrase — la vue n'est jamais vide, même hors-ligne.
