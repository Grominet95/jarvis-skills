# IDEAS.md — Évolutions différées

Ce fichier recense les idées et évolutions **non codées maintenant**.
Elles sont consignées ici pour ne pas les perdre sans alourdir le code présent.
Chaque item doit faire l'objet d'une RFC légère (issue + discussion) avant implémentation.

---

## Infrastructure & versioning

- **Namespaces d'extensions** (`jarvis.experimental.*`, `community.*`) pour distinguer
  les contributions officielles, communautaires et expérimentales.
- **Versioning de schéma à dossiers** (`v1/`, `v1.1/`) si des breaking changes
  de schéma deviennent nécessaires.
- **RFC légère** : processus de proposition formelle pour tout nouveau champ
  de schéma (issue labelée `rfc`, délai de commentaire, décision documentée).

## Cycle de vie des contributions

- **Politique de dépréciation à états** : `active` → `deprecated` → `blocked` → `removed`,
  avec délai annoncé et message d'alerte dans le validateur.
- **Contract tests complets** : test d'exécution réelle d'une skill validée dans
  jarvis-OS (au-delà du Skill Lab sandbox générique), vérifiant les tools et
  les cas d'usage déclarés dans `capabilities`.

## Index & discovery

- **Index-registre enrichi** : ajouter `maturity` (alpha/beta/stable), `compatibility`
  (version jarvis-OS min/max), `last_tested_at`, `download_count` à chaque entrée.
- **Recherche sémantique** dans le catalogue (embeddings sur `description` + `capabilities`).

## Outillage développeur

- **CLI `jarvis dev`** : commande unifiée pour créer, valider, tester et publier une
  contribution (`jarvis dev new skill foo`, `jarvis dev validate`, `jarvis dev publish`).
- **Design system avancé des vues** : composants UI partagés, système de thème,
  guidelines d'accessibilité.

## Repository

- **Migration `src/jarvis`** : réorganisation en monorepo si le nombre de
  contributions rend la structure à plat difficile à naviguer.
- **Templates premium** : templates de skills pour des cas d'usage avancés
  (OAuth, streaming, multi-step tools).

---

*Ces items ne font pas partie du périmètre actuel (`jarvis-skills` validation CDC).*
*Modifier ce fichier n'affecte pas la CI ni le validateur.*
