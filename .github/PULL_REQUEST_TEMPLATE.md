## Nouveau skill / preset / vue : [nom-en-kebab-case]

> **Type de contribution** (cocher) : ☐ skill conversationnel · ☐ preset · ☐ vue

### Description
<!-- Ce que fait le skill/preset/vue en 2-3 phrases -->

### Pourquoi c'est utile pour Jarvis
<!-- Quel cas d'usage ça résout -->

### Testé avec
- [ ] Jarvis v3.0+
- [ ] Fonctionne avec les tools déclarés dans `requires_tools`
- [ ] Variables `.env` documentées dans `requires_env`

### Tags
<!-- ex: research, web, productivity, music, code, preset, view -->

### Notes pour la review
<!-- Tout ce qui serait utile -->

---

### Checklist avant de soumettre

#### Standards à lire selon ton type de contribution
- Skill / Preset → [CONTRIBUTING.md](../CONTRIBUTING.md)
- Vue → [VIEWS_STANDARD.md](../VIEWS_STANDARD.md)

#### index.json
> `index.json` est **généré automatiquement** — ne l'édite jamais à la main.
> La CI échoue si l'index est désynchronisé avec les manifestes.

```bash
# Après avoir créé ou modifié ton skill.yaml / VIEW.md :
python scripts/generate_index.py

# Vérifier localement que la CI passera :
python scripts/validate_skills.py
python scripts/generate_index.py --check
```

- [ ] `python scripts/generate_index.py` lancé et index.json commité
- [ ] `python scripts/validate_skills.py` passe sans erreur (0 erreurs)
- [ ] Le nom du dossier est en kebab-case et correspond au champ `name` dans le yaml
- [ ] La `version` est en semver (ex : `1.0.0`)
- [ ] `skill.py` définit une classe héritant de `SkillBase` (skill) ou `PresetSkill` (preset)
- [ ] Aucune clé API hardcodée — utiliser `requires_env`
