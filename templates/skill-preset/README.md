# Template Preset Skill

Utilise ce template pour créer une nouvelle preset Jarvis.

## Qu'est-ce qu'une preset ?

Une preset déclenche une séquence d'actions sur la machine de l'utilisateur.
Elle peut ouvrir des apps, contrôler Spotify, faire parler Jarvis,
ou appeler un LLM pour des suggestions intelligentes.

## Comment utiliser ce template

1. Copier ce dossier dans `skills/nom-de-ta-preset/`
2. Modifier `skill.yaml` — remplir tous les champs
3. Modifier `skill.py` — renommer la classe (optionnel)
4. Tester localement dans Jarvis
5. Ouvrir une Pull Request

## Règles importantes

- Toujours inclure `type: preset` dans skill.yaml
- Toujours inclure `"preset"` dans les tags
- Toujours tester sur les plateformes déclarées dans `platforms`
- Pour les commandes CLI : tester sur Mac ET Windows si les deux sont listés
- Si une plateforme n'est pas testée : ne pas la lister, mettre `null`
- Pas de commandes destructives sans confirmation (rm -rf, format, etc.)

## Plateformes

| Plateforme | Valeur yaml | Système détecté |
|-----------|-------------|-----------------|
| macOS     | mac         | darwin          |
| Windows   | windows     | windows         |
| Linux     | linux       | linux           |

## Types de steps disponibles

| Type    | Description                              |
|---------|------------------------------------------|
| cli     | Commande shell (avec variantes par OS)   |
| spotify | Contrôle Spotify                         |
| tts     | Jarvis parle                             |
| ai      | Appel LLM contextuel                     |
| wait    | Pause en secondes                        |
| notify  | Notification système                     |
