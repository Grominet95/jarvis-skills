# Créer une vue Jarvis — Guide pas-à-pas

Ce dossier est un template vide à copier pour créer ta propre vue.

---

## Étape 1 — Copier le template

```bash
cp -r views/TEMPLATE/ views/mon-id-de-vue/
```

L'ID doit être en **kebab-case minuscule** : `star-map`, `weather-radar`, `camera-feed`.

---

## Étape 2 — Remplir `VIEW.md`

Ouvre `VIEW.md` et remplace tous les champs :

- `id` : identifiant unique de ta vue — doit correspondre exactement à l'id passé à `Jarvis.views.register()`
- `name` : nom affiché dans l'interface
- `glyph` : 2-4 lettres pour le badge (ex: `GLB`, `STR`, `WTH`)
- `description` : une phrase claire sur ce que fait la vue
- `requires_env` : variables d'environnement nécessaires (tokens, API keys)
- `commands` : liste des actions que `command()` peut recevoir

---

## Étape 3 — Implémenter `view.js`

Cherche tous les `TODO` dans le fichier et remplace-les :

1. **`VIEW_ID`** → l'id kebab-case de ta vue
2. **`ensureContainer()`** → créer le DOM de ta vue dans `container`
3. **`show(params)`** → initialiser et afficher ta vue
4. **`hide()`** → tout nettoyer (timers, listeners, libs externes, DOM)
5. **`command(cmd, params)`** → implémenter tes commandes avec un `switch`

### Règles importantes

```js
// Container obligatoire :
container.id = `${VIEW_ID}-container`;  // ex: "star-map-container"
container.style.position = 'fixed';
container.style.inset = '0';
container.style.zIndex = '2';

// Variables CSS disponibles (_shared.css) :
// --bg-0     fond principal
// --fg-1     texte principal
// --accent   couleur d'accent
// --line-1   bordures / séparateurs

// show() doit être idempotent :
if (container.style.display !== 'none') return;  // déjà visible

// command() doit ignorer les commandes inconnues :
switch (cmd) {
  case 'ma-commande': /* ... */ break;
  // Pas de default qui throw !
}
```

---

## Étape 4 — Implémenter `tool.py` (optionnel)

Si ta vue nécessite un pilotage depuis le backend Jarvis :

1. Renomme la classe `MyViewTool` → `NomDeTaVueTool`
2. Change `name = "my_view"` → nom snake_case unique dans Jarvis
3. Écris la `description` en langage naturel (le LLM s'en sert pour décider quand appeler l'outil)
4. Implémente les actions dans `execute()`

Les 3 types d'events WebSocket disponibles :

```python
# Afficher la vue
self._broadcast({"type": "show_view", "view": "mon-id", "params": {}})

# Masquer la vue
self._broadcast({"type": "hide_view", "view": "mon-id"})

# Envoyer une commande à la vue
self._broadcast({"type": "view_command", "view": "mon-id", "command": "mon-action", "params": {}})
```

---

## Étape 5 — Tester localement

```bash
# Copier dans Jarvis
cp views/mon-id-de-vue/view.js  JARVIS_V3/ui/static/views/mon-id-de-vue.js
cp views/mon-id-de-vue/tool.py  JARVIS_V3/tools/mon_id_de_vue.py

# Charger view.js dans home.html (après _shared.js) :
# <script src="/static/views/mon-id-de-vue.js"></script>

# Enregistrer le tool dans Jarvis
# (voir la doc JARVIS_V3 pour l'init des tools)
```

Vérifie dans la console navigateur que ta vue apparaît dans `Jarvis.views.list()`.

---

## Étape 6 — Ouvrir une PR

- [ ] `VIEW.md` rempli, tous les champs obligatoires présents
- [ ] `id` dans `VIEW.md` = id dans `Jarvis.views.register()`
- [ ] `show()` idempotent
- [ ] `hide()` nettoie tout
- [ ] `command()` ignore les commandes inconnues
- [ ] Container `#id-container` avec `position:fixed; inset:0; z-index:2`
- [ ] Pas de dépendances npm
- [ ] Pas de clés API hardcodées

Lis [VIEWS_STANDARD.md](../../VIEWS_STANDARD.md) pour tous les détails du standard.

---

## Vue de référence

La vue [Globe](../globe/) est l'implémentation de référence complète.
Lis son `view.js` pour voir comment gérer le chargement async d'une librairie externe,
l'idempotence de `show()`, et le nettoyage dans `hide()`.
