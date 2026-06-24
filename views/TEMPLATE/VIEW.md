---
# ── Identifiant unique (kebab-case minuscule) ──────────────────────────────
# Doit correspondre EXACTEMENT à l'id dans Jarvis.views.register()
id: ma-vue

# ── Métadonnées ────────────────────────────────────────────────────────────
name: Ma Vue                                   # Nom affiché dans le marketplace
version: 1.0.0                                 # semver
author: ton-pseudo-github                      # ton pseudo GitHub — sert à te créditer dans le marketplace
description: Ce que fait la vue en une phrase claire.
tags: [tag1, tag2]                             # mots-clés pour le filtre
glyph: MV                                      # 2-4 lettres pour le badge (ex: GLB, MAP, CAM)

# ── Variables d'environnement requises ─────────────────────────────────────
# Supprimer cette section si aucune variable n'est nécessaire.
requires_env:
  - name: MON_TOKEN
    description: Description de la variable et pourquoi elle est nécessaire
    example: "sk-..."
    sensitive: true   # true si secret (API key, token), false si non sensible

# ── Commandes supportées ───────────────────────────────────────────────────
# Liste des actions que command() peut recevoir.
# Supprimer cette section si la vue ne supporte que show/hide.
commands:
  - action: ma-commande
    description: Description de ce que fait la commande
    params:
      param1: string   # type et nom du paramètre
      param2: int
  - action: autre-commande
    description: Description

# ── Bindings gestuels (optionnel) ──────────────────────────────────────────
# Mappe un geste standard MediaPipe → une de TES commandes ci-dessus, quand la
# vue a le focus. La vue ne pilote JAMAIS MediaPipe : elle déclare une intention
# d'interaction ("tel geste → telle commande"). Le routeur de jarvis-OS lit ce
# bloc ; si aucune vue active ne capte le geste, il retombe sur le fallback
# global (musique / assistant).
#
# Le `on` doit appartenir au vocabulaire standard (cf. VIEWS_STANDARD.md) et
# chaque `command` doit figurer dans `commands:` ci-dessus (sinon le validateur
# échoue). Reflète ce bloc dans l'objet `gestures` de view.js (forme runtime).
#
# Gestes émis aujourd'hui par l'OS : discrets Open_Palm / Victory / Thumb_Up /
# Thumb_Down / Pointing_Up ; continu pinch_y (payload `delta` ±10).
#
# ⚠ Quoter la clé "on" : `on` est un mot réservé booléen en YAML 1.1.
# Décommenter et adapter — supprimer si la vue n'utilise pas les gestes.
#
# gestures:
#   - "on": pinch_y          # continu — `delta` transmis dans params à command()
#     command: ma-commande   # doit exister dans `commands:`
#     mode: continuous
#     throttle_ms: 80        # cadence de throttle (50-100 ms) pour un flux fluide
#   - "on": Victory          # discret — one-shot
#     command: autre-commande
#     mode: discrete
#   - "on": Thumb_Down       # action standard du routeur : ferme la vue
#     action: hide_view      # exclusif avec `command`
#     mode: discrete
---
