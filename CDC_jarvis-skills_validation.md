# CDC — Système de contribution `jarvis-skills` (validation catalogue)

> Cahier des charges pour Claude Code. Périmètre : **repo `jarvis-skills` uniquement**.
> Objectif : empêcher les contributions incohérentes, dangereuses ou non testées d'entrer
> au store, avec les bons crochets d'évolutivité — **sans sur-ingénierie**.

---

## 0. Principes directeurs (non négociables)

1. **On ne part PAS d'un repo vide.** `jarvis-skills` contient déjà : schémas JSON, `validate_skills.py`, `scan_security.py`, `generate_index.py`, les trois docs standards (`SKILLS_STANDARD.md`, `PRESETS_STANDARD.md`, `VIEWS_STANDARD.md`), `CONTRIBUTING.md`, des templates, `index.json`, et du contenu en production (7 skills, des vues, des presets). **On étend l'existant, on ne réécrit pas ce qui marche.**

2. **Sécurité absolue — validation 100 % statique.** La validation dans ce repo n'importe JAMAIS et n'exécute JAMAIS le code d'une contribution. Une PR externe ne doit pas pouvoir exécuter du Python arbitraire pendant la CI. On utilise l'analyse AST (déjà l'approche de `validate_skills.py`), jamais `import`. Le test d'exécution réel vit dans `jarvis-OS` (sandbox Docker du Skill Lab), sur du code déjà revu.

3. **Frontière nette :** `jarvis-skills` = conformité statique. `jarvis-OS` = comportement exécuté. Ce CDC ne touche QUE `jarvis-skills`.

4. **On ne renomme aucun fichier.** `skill.yaml`, `VIEW.md`, format presets existant : tout reste. On normalise le **contrat** (champs communs validés par schéma), pas le **nom de fichier**.

5. **Évolutivité par les crochets, pas par la complexité anticipée.** Deux crochets seulement : `schema_version` partout + validateur modulaire. Tout le reste (namespaces d'extensions, RFC, dépréciation à états, contract tests avancés, CLI) va dans `IDEAS.md`, PAS dans le code.

6. **Pas de CLI.** Des scripts simples lançables à la main (`python scripts/validate_catalog.py ...`). Le CLI viendra si l'usage le réclame.

---

## ÉTAPE 0 — État des lieux AVANT tout code (obligatoire)

Ne code rien tant que tu n'as pas montré ce constat et obtenu validation.

Pour chacun des livrables ci-dessous, indique :
- ce qui existe déjà dans le repo (fichier + ce qu'il couvre) ;
- ce que tu réutilises / étends vs ce que tu crées ;
- tout écart entre ce CDC et la réalité du repo.

Points précis à cartographier :
- Que valide exactement `validate_skills.py` aujourd'hui ? (champs, AST, héritage, secrets, env vars)
- Que fait `scan_security.py` ? `generate_index.py` ?
- Quelle est la structure réelle des schémas dans `schemas/` ?
- Les trois types ont-ils déjà un champ de version ? un socle de champs communs ?
- **Vérification croisée avec `jarvis-OS` (lecture seule, pas de modif) :** quel contrat le `SkillRegistry` / Skill Lab de `jarvis-OS` attend-il réellement au chargement d'une skill (héritage `SkillBase`, champs du manifest, format des tools, permissions) ? Le validateur de `jarvis-skills` doit valider **le même contrat** que celui que le runtime exige — sinon une skill validée « OK » plantera au chargement, ou l'inverse. Signale tout désalignement.

Montre le constat + ton plan (quels scripts réutilisés vs créés, structure des checks), attends le OK, puis code.

---

## 1. `schema_version` + contrat commun

- Ajouter le champ `schema_version: "1.0"` au contrat de chaque type (skill, preset, vue).
- L'ajouter aux contributions existantes (les 7 skills + vues + presets en place).
- Définir dans les schémas JSON un **socle commun** partagé par les trois types :
  `id`, `type`, `version`, `schema_version`, `description`, `author`, `permissions`, `requires`, `capabilities`.
- Les champs spécifiques à chaque type s'ajoutent par-dessus ce socle.
- Tous les nouveaux champs au-delà de l'existant sont **optionnels** (rétro-compatibilité : aucune contribution actuelle ne doit devenir invalide).

**Critère d'acceptation :** les schémas valident l'existant sans le casser ; `schema_version` est présent partout ; le socle commun est défini une seule fois et référencé par les trois schémas de type.

---

## 2. Validateur modulaire (analyse statique, zéro exécution)

Structure en pipeline de checks indépendants, pour pouvoir en ajouter un plus tard sans réécrire :

```
scripts/
  validate_catalog.py        # orchestrateur
  scan_security.py           # existant — réutilisé par secrets_check
  build_index.py             # cf. §3
  checks/
    schema_check.py          # conformité au schéma JSON (socle commun + spécifique type)
    secrets_check.py         # appelle scan_security.py — aucun secret hardcodé
    permissions_check.py     # permissions déclarées et cohérentes
    env_check.py             # variables d'env documentées (jamais de valeur en dur)
    index_check.py           # cohérence avec index.json
    skill_static_ast_check.py    # AST : héritage SkillBase, tools déclarés — SANS import
    preset_static_check.py       # steps de type connu ; commande destructive => requires_confirmation ; dry-run déclaré possible
    view_static_check.py         # commands déclarées ; pas de dépendance externe non déclarée ; conventions UI ; cleanup déclaré
```

Règles :
- `validate_catalog.py` détecte le type (skill/preset/vue) et lance les checks pertinents.
- Usage : `python scripts/validate_catalog.py skills/mon-skill` (un élément) et `--all` (tout le catalogue).
- **Sortie déterministe** : exit code 0 si vert, ≠ 0 si rouge ; chaque échec affiche une raison précise et actionnable (ex. `❌ skill_static_ast_check: SYSTEM_PROMPT vide`), pas une stacktrace. Objectif : utilisable par un agent qui lit le code retour et itère seul.
- `skill_static_ast_check` **réutilise l'approche AST existante** de `validate_skills.py`. **Interdiction formelle d'`import`/exécution** du code de la contribution.
- Le `preset_static_check` vérifie statiquement que toute commande destructive porte `requires_confirmation: true` et que la possibilité de dry-run est déclarée (le dry-run réel s'exécute côté `jarvis-OS`).

**Critère d'acceptation :** un manifest cassé, un secret en dur, un héritage manquant, une commande destructive sans confirmation, une vue sans `commands` déclarées → chacun produit un échec rouge clair. Aucun check n'importe ni n'exécute de code de contribution. Le validateur tourne sur les 3 types.

---

## 3. `build_index.py` — index généré, jamais maintenu à la main

- Scanne `skills/`, `presets/`, `views/`, lit les manifests, génère `index.json`.
- Option `--check` : régénère en mémoire et compare au fichier commité ; exit ≠ 0 si désynchronisé (pour la CI).
- Peut généraliser / remplacer `generate_index.py` existant (à confirmer en étape 0).

**Critère d'acceptation :** `build_index.py` régénère un `index.json` identique au commité quand tout est à jour ; `--check` échoue si un manifest a changé sans régénération.

---

## 4. CI GitHub Actions — `.github/workflows/validate.yml`

Sur chaque PR, **uniquement du statique, zéro exécution de code de contribution** :
- `python scripts/validate_catalog.py --all`
- `python scripts/scan_security.py`
- `python scripts/build_index.py --check` (refuse si index désynchronisé)
- lint YAML / JSON

**Critère d'acceptation :** une PR avec manifest non conforme, secret en dur, ou index désynchronisé est refusée automatiquement. La CI n'importe jamais le code d'une contribution.

---

## 5. Checklist PR + attestation

Template de PR GitHub (`.github/PULL_REQUEST_TEMPLATE.md`) :

```
- [ ] `validate_catalog.py` passé
- [ ] `build_index.py` exécuté (index à jour)
- [ ] Aucun secret hardcodé
- [ ] Permissions déclarées
- [ ] Variables d'env documentées
- [ ] Extension testée en réel dans Jarvis OS (si applicable)
- [ ] Preset : dry-run vérifié (si applicable)
- [ ] Vue : preview locale vérifiée (si applicable)
```

L'attestation « testé en réel » est une déclaration humaine/agent, **pas** une preuve automatique — c'est assumé. La CI garantit le statique ; le comportement réel est attesté.

---

## 6. Documentation

- Enrichir `SKILLS_STANDARD.md`, `PRESETS_STANDARD.md`, `VIEWS_STANDARD.md`, `CONTRIBUTING.md` : pointer ce pipeline comme **étape obligatoire** (créer → `validate_catalog` → tester en local dans `jarvis-OS` → PR). Documenter `schema_version` et le socle commun.
- Créer `AGENTS.md` (contrat de contribution agentique) :
  - ne jamais inventer de champ hors schéma ;
  - ne pas modifier plusieurs extensions dans une même PR ;
  - toujours lancer `validate_catalog.py` avant de finir ;
  - toujours régénérer l'index via `build_index.py` (jamais à la main) ;
  - jamais de secret en dur ;
  - préférer les changements rétro-compatibles ;
  - si un nouveau champ est nécessaire : l'ajouter d'abord au schéma + docs + check, jamais en douce.
- Créer `IDEAS.md` (évolutions différées, NON codées maintenant) : namespaces d'extensions (`jarvis.experimental.*`), procédure RFC légère, politique de dépréciation à états (active/deprecated/blocked/removed), versioning de schéma à dossiers (`v1/v1.1`), index-registre enrichi (maturity, compatibility), contract tests complets, CLI `jarvis dev`, design system avancé des vues, migration repo `src/jarvis`.

---

## 7. Définition de fini (DoD)

- Étape 0 (état des lieux + alignement contrat avec `jarvis-OS`) montrée et validée.
- `schema_version` + socle commun en place, existant non cassé.
- Validateur modulaire opérationnel sur les 3 types, statique, sortie déterministe.
- `build_index.py` + `--check` fonctionnels.
- CI `validate.yml` verte sur l'existant, refuse une PR non conforme.
- Checklist PR + `AGENTS.md` + `IDEAS.md` créés ; docs standards enrichies.
- **Preuve par l'absurde demandée** (équivalent du « cas négatif » des phases jarvis-OS) : montre que le validateur **refuse** correctement — un manifest cassé, un secret en dur, un héritage manquant, une commande destructive sans confirmation. La valeur n'est pas qu'il accepte le bon, c'est qu'il refuse le mauvais.
- `ruff` + lint verts. Commits granulaires par bloc (schémas / validateur / index / CI / docs). **Aucun co-author Claude.**

---

## Hors périmètre (ne PAS faire maintenant)

CLI `jarvis dev` · templates premium · design system avancé · namespaces d'extensions · RFC · dépréciation à états · index-registre enrichi · migration `src/jarvis` · tout test d'exécution runtime (→ `jarvis-OS`).
