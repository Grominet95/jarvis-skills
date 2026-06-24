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
---
