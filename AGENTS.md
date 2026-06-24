# AGENTS.md — Contrat de contribution agentique

Ce document définit les règles que tout agent (Claude, autre LLM, script automatisé)
doit respecter lorsqu'il crée ou modifie une contribution dans `jarvis-skills`.

---

## Règles absolues

### 1. Toujours valider avant de terminer
```bash
python scripts/validate_catalog.py skills/mon-skill   # ou views/ma-vue
python scripts/validate_catalog.py --all              # pour tout le catalogue
```
Un agent ne soumet pas une PR dont `validate_catalog.py` retourne un exit code ≠ 0.

### 2. Toujours régénérer l'index via `build_index.py`
```bash
python scripts/build_index.py
```
**Jamais éditer `index.json` à la main.** C'est un fichier généré — toute
modification manuelle sera écrasée et la CI échouera (`build_index.py --check`).

### 3. Jamais de secret hardcodé
Les clés API, tokens, mots de passe ne vont **jamais** dans le code source.
Utiliser `requires_env` dans le manifest + `os.getenv()` dans le code.
`scan_security.py` bloque les CRITIQUES automatiquement.

### 4. Ne jamais inventer de champ hors schéma
Tout champ ajouté à un manifest doit d'abord être dans le schéma JSON correspondant
(`schemas/skill.schema.json`, `preset.schema.json`, `view.schema.json`).
Un champ inventé ne sera ni validé ni indexé.

### 5. Une seule extension par PR
Ne pas modifier plusieurs skills/presets/vues indépendants dans une même PR.
Chaque contribution doit être autonome et testable isolément.

### 6. Préférer les changements rétro-compatibles
Nouveaux champs → optionnels. Jamais rendre obligatoire un champ absent de
l'existant sans migration simultanée de toutes les contributions existantes.

### 7. Ajouter `schema_version: "1.0"` à tout nouveau manifest
```yaml
name: mon-skill
schema_version: "1.0"
version: 1.0.0
...
```

### 8. Toujours renseigner `author` avec un vrai pseudo
Le champ `author` (obligatoire dans les trois types : skill, preset, vue) sert à
**créditer le contributeur** dans le marketplace. Un agent ne laisse **jamais** le
placeholder `ton-pseudo-github` du template.
- Si tu crées la contribution **pour** quelqu'un, demande-lui son pseudo GitHub et
  inscris-le. En cas de doute, demande — ne devine pas.
- Une PR dont `author` vaut encore `ton-pseudo-github` (ou est vide) est considérée
  comme incomplète.

### 9. Pour ajouter un nouveau champ de schéma
L'ordre est impératif :
1. Modifier le(s) schéma(s) JSON (`schemas/`)
2. Mettre à jour la documentation (`SKILLS_STANDARD.md` / etc.)
3. Ajouter le check dans le validateur approprié (`scripts/checks/`)
4. Ensuite seulement utiliser le champ dans une contribution

Jamais introduire un champ "en douce" dans un manifest sans passer par ce
processus — le champ sera rejeté par `schema_check.py`.

---

## Checkliste de fin de contribution

Avant de créer une PR, vérifier que :

- [ ] `python scripts/validate_catalog.py <chemin>` → exit 0, zéro ❌
- [ ] `python scripts/build_index.py` → index.json régénéré et commité
- [ ] `python scripts/build_index.py --check` → ✓ à jour
- [ ] `python scripts/scan_security.py <chemin>` → zéro CRITIQUE
- [ ] Aucune clé API, token ou secret dans le code source
- [ ] `schema_version: "1.0"` présent dans le manifest
- [ ] `author` renseigné avec un vrai pseudo GitHub (jamais `ton-pseudo-github`)
- [ ] Contribution testée en réel dans jarvis-OS (Skill Lab)

---

## Pourquoi ces règles

`jarvis-skills` est le **catalogue statique** — sa responsabilité s'arrête à la
conformité statique. Le comportement exécuté est validé côté `jarvis-OS` (sandbox
Docker du Skill Lab). Un skill validé ici mais avec `SYSTEM_PROMPT = ""` sera
rejeté par le Skill Lab au gate `system_prompt`. Le validateur statique reflète
exactement ce que le runtime exigera.
