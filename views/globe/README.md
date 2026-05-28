# Vue Globe

Globe terrestre interactif piloté par la voix. Basé sur Mapbox GL JS avec projection sphérique et auto-rotation.

---

## Commandes vocales

| Ce que tu dis | Ce qui se passe |
|---------------|-----------------|
| "Montre le monde" | Affiche le globe avec auto-rotation |
| "Montre-moi Paris" | Vol animé vers Paris |
| "Va à Tokyo" | Vol animé vers Tokyo |
| "Affiche New York" | Vol animé vers New York |
| "Zoom avant" | Zoome de 3 niveaux |
| "Zoom arrière" | Dézoome de 3 niveaux |
| "Vue globale" | Reset vers la vue globe entière |
| "Cache le globe" | Masque le globe |

---

## Installation

### 1. Variable d'environnement requise

Dans le fichier `.env` de Jarvis :

```env
MAPBOX_TOKEN=pk.eyJ1IjoiYmFydGgtOTUiLCJhIjoiY...
```

Un token Mapbox public (commence par `pk.`) est nécessaire.
Tu peux en créer un gratuitement sur [mapbox.com](https://mapbox.com).

### 2. Copier les fichiers

```bash
# Frontend
cp views/globe/view.js  JARVIS_V3/ui/static/views/globe.js

# Backend
cp views/globe/tool.py  JARVIS_V3/tools/globe_view.py
```

### 3. Charger view.js dans home.html

Ajouter **après** `_shared.js` :

```html
<script src="/static/views/globe.js"></script>
```

### 4. Enregistrer le tool dans Jarvis

Dans le fichier d'init des tools de Jarvis :

```python
from tools.globe_view import GlobeViewTool
tools.register(GlobeViewTool(broadcast_event=ws_broadcast))
```

---

## Comportement

- **Auto-rotation** : le globe tourne lentement quand personne n'interagit
- **Interaction souris/tactile** : stoppe l'auto-rotation pendant la navigation, reprend après
- **Transitions** : fade in/out à chaque show/hide
- **Toast** : un label s'affiche brièvement après un `fly_to`
- **Idempotent** : appeler `show()` deux fois n'a pas d'effet de bord

---

## Style utilisé

- Style Mapbox : `mapbox://styles/barth-95/cmosuocjv007801seho3g8r4y`
- Projection : `globe`
- Brouillard spatial activé (effet atmosphère)
