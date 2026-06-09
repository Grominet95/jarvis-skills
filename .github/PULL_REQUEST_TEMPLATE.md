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

---

### Checklist obligatoire avant de soumettre

#### Pipeline de validation (toutes les cases doivent être cochées)

```bash
# 1. Valider la contribution
python scripts/validate_catalog.py skills/mon-skill   # ou views/ma-vue

# 2. Régénérer l'index
python scripts/build_index.py

# 3. Vérifier la synchronisation
python scripts/build_index.py --check

# 4. Vérification sécurité (incluse dans validate_catalog, mais utile seule)
python scripts/scan_security.py skills/mon-skill
```

- [ ] `validate_catalog.py` : exit 0, **zéro ❌** (les ⚠ sont acceptés)
- [ ] `build_index.py` exécuté et `index.json` commité
- [ ] `build_index.py --check` : ✓ à jour
- [ ] Aucun secret hardcodé — clés API dans `requires_env` + `os.getenv()`
- [ ] `schema_version: "1.0"` présent dans le manifest
- [ ] Permissions déclarées (`platforms` non-vide, `requires_tools` cohérent)
- [ ] Variables d'env documentées (forme objet avec `name` + `description`)
- [ ] Contribution testée **en réel dans jarvis-OS** (Skill Lab)

#### Spécifique preset
- [ ] `triggers` non-vide (sinon Skill Lab refusera au gate `system_prompt`)
- [ ] Commandes destructives : `requires_confirmation: true` déclaré
- [ ] `dry_run_possible: true/false` déclaré
- [ ] Dry-run vérifié côté jarvis-OS

#### Spécifique vue
- [ ] `commands` déclarées dans VIEW.md si `tool.py` expose une méthode `command()`
- [ ] Preview locale vérifiée (harness HTML ou jarvis-OS)
- [ ] `glyph` défini (2-4 lettres majuscules)

---

### Notes pour la review
<!-- Tout ce qui serait utile au reviewer -->

---

> **Rappel** : `jarvis-skills` valide la conformité statique.
> Le comportement exécuté est validé par le Skill Lab de jarvis-OS.
> L'attestation "testé en réel" est une déclaration humaine — la CI ne peut pas la vérifier.
