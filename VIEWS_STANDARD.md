# Jarvis Views — Standard

Ce document est la **référence unique** pour créer une vue installable dans Jarvis.
Une vue est un composant visuel full-screen piloté par le backend via WebSocket.

---

## Structure d'une vue

Chaque vue vit dans son propre dossier sous `views/` :

```
views/
└── nom-de-la-vue/
    ├── VIEW.md        ← manifest de la vue (requis)
    ├── view.js        ← frontend : enregistrement dans Jarvis.views (requis)
    ├── tool.py        ← backend tool Python (optionnel)
    ├── preview.png    ← screenshot 800×500 (optionnel)
    └── README.md      ← doc utilisateur (optionnel)
```

L'ID d'une vue est en **kebab-case minuscule** : `globe`, `star-map`, `weather-radar`.

---

## Format `VIEW.md`

```yaml
---
id: globe
name: Globe
version: 1.0.0
author: BarthH95
description: Globe terrestre temps réel
tags: [geo, realtime, map]
glyph: GLB
requires_env:
  - name: MAPBOX_TOKEN
    description: Token Mapbox GL JS
    example: "pk.eyJ..."
    sensitive: true
commands:
  - action: fly_to
    description: Naviguer vers un lieu
    params: { location: string, zoom: int }
  - action: zoom_in
    description: Zoomer
  - action: zoom_out
    description: Dézoomer
  - action: globe_view
    description: Vue globe entière
---
```

### Champs obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique kebab-case, correspond à `Jarvis.views.register(id, …)` |
| `name` | string | Nom affiché dans l'UI |
| `version` | semver | Version de la vue |
| `author` | string | Pseudo GitHub de l'auteur |
| `description` | string | Description en une phrase |
| `glyph` | string | 2-4 lettres affichées dans le badge de la carte skill |

### Champs optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `tags` | list | Mots-clés pour le filtre du marketplace |
| `requires_env` | list | Variables d'environnement requises |
| `commands` | list | Commandes supportées par `command()` |

---

## Format `view.js`

```js
// Prérequis : Jarvis.views doit exister (chargé depuis _shared.js)
// Ce fichier est chargé APRÈS _shared.js dans home.html
(function() {
  if (!window.Jarvis?.views) return;

  Jarvis.views.register('mon-id', {
    meta: {
      name: 'Nom affiché',
      desc: 'Description courte',
      glyph: 'ABC',
      tags: ['tag1', 'tag2'],
    },

    show(params) {
      // Afficher la vue (créer un #mon-id-container, etc.)
      // Doit être idempotent (safe si appelé deux fois)
    },

    hide() {
      // Masquer / nettoyer
      // Doit supprimer tout ce que show() a créé (pas de fuite mémoire)
    },

    command(cmd, params) {
      // Répondre aux commandes : 'fly_to', 'zoom_in', etc.
      // Ignorer silencieusement les commandes inconnues
      switch (cmd) {
        case 'ma-commande':
          // ...
          break;
      }
    },
  });
})();
```

### Règles view.js

1. **IIFE** — le fichier entier est enveloppé dans `(function(){...})()`
2. **Guard** — commencer par `if (!window.Jarvis?.views) return;`
3. **Idempotence** — `show()` peut être appelé plusieurs fois sans créer de doublons
4. **Nettoyage** — `hide()` supprime tout : DOM, timers, listeners, animations
5. **Commandes inconnues** — `command()` les ignore silencieusement (pas d'erreur)
6. **Container** — l'élément racine a l'id `{id}-container` et les styles suivants :
   ```css
   position: fixed;
   inset: 0;
   z-index: 2;
   ```
7. **CSS variables** — utiliser les variables de `_shared.css` : `--bg-0`, `--fg-1`, `--accent`, `--line-1`
8. **Vanilla JS** — ES2017+, pas de framework, pas de bundler

---

## Format `tool.py`

```python
from tools.base import Tool, ToolResult
from typing import Callable


class MyViewTool(Tool):
    name = "my_view"        # doit être unique dans Jarvis
    description = """
    Décrit QUAND Jarvis doit utiliser cet outil, en langage naturel.
    Exemple : "Affiche le globe terrestre interactif quand l'utilisateur
    veut voir une carte du monde, naviguer vers un lieu, ou visualiser
    des données géographiques."
    """

    def __init__(self, broadcast_event: Callable[[dict], None]) -> None:
        self._broadcast = broadcast_event

    async def execute(self, action: str, **kwargs) -> ToolResult:
        """
        Paramètre `action` requis. Valeurs selon la vue.
        Envoyer des events WebSocket via self._broadcast({...}).

        Types d'events supportés :
          show_view    → {"type": "show_view",    "view": "mon-id", "params": {...}}
          hide_view    → {"type": "hide_view",    "view": "mon-id"}
          view_command → {"type": "view_command", "view": "mon-id", "command": "...", "params": {...}}
        """
        if action == "show":
            self._broadcast({"type": "show_view", "view_id": "mon-id", "params": kwargs})
            return ToolResult(content="Vue shown.")

        if action == "hide":
            self._broadcast({"type": "hide_view", "view_id": "mon-id"})
            return ToolResult(content="Vue hidden.")

        # Toute autre action → view_command
        self._broadcast({
            "type": "view_command",
            "view_id": "mon-id",
            "command": action,
            "params": kwargs,
        })
        return ToolResult(content=f"Command '{action}' sent.")
```

---

## Cycle de vie d'une vue

```
Backend (tool.py)                 WebSocket                  Frontend (view.js)
──────────────────────────────────────────────────────────────────────────────
execute(action="show")    ──►  show_view        ──►  show(params)
execute(action="hide")    ──►  hide_view        ──►  hide()
execute(action="fly_to")  ──►  view_command     ──►  command("fly_to", params)
```

---

## Checklist avant PR

- [ ] `VIEW.md` rempli avec tous les champs obligatoires
- [ ] `id` dans `VIEW.md` correspond exactement à l'id dans `Jarvis.views.register()`
- [ ] `show()` est idempotent
- [ ] `hide()` nettoie le DOM, les timers et les listeners
- [ ] `command()` ignore silencieusement les commandes inconnues
- [ ] Container `#id-container` avec `position: fixed; inset: 0; z-index: 2`
- [ ] Pas de dépendances npm — vanilla JS uniquement
- [ ] Pas de clés API hardcodées — déclarer dans `requires_env`
- [ ] Testé localement dans Jarvis

---

## Voir aussi

- [Vue de référence : Globe](views/globe/)
- [Template vide à copier](views/TEMPLATE/)
- [CONTRIBUTING.md](CONTRIBUTING.md)
