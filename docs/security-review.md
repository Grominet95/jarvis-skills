# Process de revue de sécurité — mainteneurs

Ce document décrit comment traiter une PR qui touche du code Python (`skill.py`, `tool.py`) dans jarvis-skills.

---

## 1. Le scanner a déjà tourné en CI

Avant de lire ce document, la CI a exécuté :

```
python scripts/scan_security.py --json
```

- Si la CI est **rouge** → au moins une CRITIQUE : **ne pas merger, voir §3**
- Si la CI est **verte avec des ALERTE** → revue humaine obligatoire avant merge : **voir §4**
- Si la CI est **verte sans ALERTE** → passer directement à la checklist §2

---

## 2. Checklist de revue manuelle

À faire sur **chaque PR** qui ajoute ou modifie un `skill.py` ou `tool.py`.

### Identité et déclarations

- [ ] L'auteur du yaml correspond au compte GitHub qui ouvre la PR
- [ ] `requires_tools` liste tous les outils réellement utilisés dans le code
- [ ] `requires_env` liste toutes les variables d'environnement lues par `os.getenv` / `os.environ`
- [ ] Le skill hérite bien de `SkillBase` ou `PresetSkill` (ou `Tool` pour un tool backend)
- [ ] Aucun `if __name__ == "__main__"` ou code exécuté au niveau module

### Comportement réseau

- [ ] Si le skill fait des appels réseau, est-ce **documenté** dans `requires_tools` ?
- [ ] Les URLs sont-elles dynamiques (construites depuis l'input utilisateur via le LLM) ou en dur ?
  - URL dynamique + SYSTEM_PROMPT clair → acceptable
  - URL en dur vers un domaine tiers → **CRITIQUE** à traiter comme §3

### Accès fichiers

- [ ] Le skill ne lit/écrit que dans son propre dossier ou dans le workspace Jarvis
- [ ] Aucune référence à `~/.ssh`, `.env`, keychains, `/etc/`

### Code dynamique

- [ ] Pas d'`eval`, `exec`, `compile` avec un argument non-constant
- [ ] Pas d'`__import__` dynamique ni d'`importlib.import_module` avec une chaîne construite à runtime
- [ ] Pas de `pickle.loads` / désérialisation

### Obfuscation

- [ ] Le code est lisible — pas de chaînes base64 décodées au runtime, pas d'encodages `\x` en masse
- [ ] Le SYSTEM_PROMPT est en langage naturel et décrit fidèlement ce que fait le skill

---

## 3. Que faire si le scanner remonte une CRITIQUE

1. **Bloquer le merge immédiatement** — la CI devrait déjà l'avoir fait
2. Laisser un commentaire de review avec :
   - Le fichier et la ligne exacte
   - L'explication du risque (reprendre le `detail` du scanner)
   - Ce que le contributeur doit faire pour corriger
3. Exemples de corrections acceptables :
   - `subprocess.run(['cmd'], shell=True)` → `subprocess.run(['cmd', 'arg'])` (sans shell)
   - `requests.get("https://domaine.com")` → passer l'URL en paramètre dynamique depuis la conversation
   - `eval(expr)` → supprimer ou remplacer par une logique Python explicite
4. Si le code semble **intentionnellement malveillant** (pas une erreur de débutant) :
   - Fermer la PR avec un message clair
   - Bloquer le compte si récidive
   - Ouvrir une issue `security` pour tracer l'incident

---

## 4. Que faire si le scanner remonte des ALERTE

Les ALERTE n'échouent pas la CI mais nécessitent une décision humaine.

| Règle ALERTE | Quand c'est acceptable | Quand c'est problématique |
|---|---|---|
| `reseau-non-declare` | Le yaml sera mis à jour dans la même PR | Pas de déclaration prévue, URL suspecte |
| `env-non-declare` | Variable standard connue (`HOME`, `PATH`) | Variable personnalisée non documentée |
| `ecriture-chemin-absolu` | Chemin justifié dans la PR (ex. dossier tmp système) | Chemin dans `~/.config`, documents utilisateur |
| `reduce-pickle` | Héritage d'une lib tierce légitime | Code custom utilisant `__reduce__` |
| `env-mutation` | Modification documentée et temporaire | Modification globale sans nettoyage |

**Procédure :**

1. Lire la ligne concernée dans le code
2. Si acceptable : approuver et laisser un commentaire `ALERTE acceptée — [justification]`
3. Si douteuse : demander une explication au contributeur via review comment
4. En cas de doute persistant : traiter comme une CRITIQUE (bloquer)

---

## 5. Après le merge

- Si un skill déjà mergé est signalé comme malveillant (issue `security`) :
  1. Retirer le skill du catalogue en créant un commit de suppression dans les 24 h
  2. Ajouter une note dans l'issue avec un lien vers le commit de suppression
  3. Informer les utilisateurs via le changelog

---

## 6. Lancer le scanner manuellement

```bash
# Tout le repo
python scripts/scan_security.py

# Un skill précis
python scripts/scan_security.py skills/mon-skill

# Sortie JSON (pour parsing CI)
python scripts/scan_security.py --json

# Vérifier l'exit code
python scripts/scan_security.py; echo "Exit: $?"
```

Exit 0 → pas de CRITIQUE. Exit 1 → au moins une CRITIQUE (bloquer). Exit 2 → chemin invalide.
