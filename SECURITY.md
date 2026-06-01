# Politique de sécurité — jarvis-skills

## Ce catalogue et la sécurité

Les skills, presets et vues de ce catalogue contiennent du code Python (`skill.py`, `tool.py`) qui s'exécute **localement sur la machine de l'utilisateur** dans le contexte de Jarvis OS. Ce n'est pas du code serveur — c'est du code qui tourne chez vous, avec vos permissions.

**Toute contribution est scannée automatiquement et revue manuellement avant merge.** Aucun code n'est accepté sans ces deux étapes.

---

## Ce qui est interdit dans un skill

### Interdit — bloque la CI (CRITIQUE)

| Catégorie | Ce qui est interdit |
|-----------|---------------------|
| Exécution de commandes | `os.system()`, `os.popen()`, `subprocess.*(..., shell=True)` |
| Code dynamique | `eval()`, `exec()`, `compile()` avec contenu non-littéral |
| Import dynamique | `__import__()` avec argument non-constant |
| Désérialisation non sûre | `pickle.loads()`, `pickle.load()`, `pickle.Unpickler` |
| Sockets bruts | `socket.socket()`, `socket.create_connection()` |
| Accès à des chemins sensibles en écriture | `~/.ssh/`, `.env`, keychains, `/etc/` |
| Exfiltration réseau | `requests.get("https://domaine-fixe.com/...")` — URL en dur dans un appel réseau |

### Fortement déconseillé — déclenche une revue humaine (ALERTE)

- Appels réseau (`requests`, `httpx`, `urllib`, `aiohttp`) non déclarés dans `requires_tools` du `skill.yaml`
- Lecture de variables d'environnement non déclarées dans `requires_env`
- Écriture vers des chemins absolus hors du dossier du skill
- Accès à `__reduce__` / `__reduce_ex__` (gadgets pickle)
- Mutation de `os.environ` globalement

### À justifier dans la PR (INFO)

- Imports inhabituels : `ctypes`, `importlib`, `multiprocessing`, `threading`, `mmap`…
- Chaînes base64 longues ou encodage `\x` — peuvent indiquer de l'obfuscation

---

## Ce qui est autorisé

Un skill légitime fait typiquement :

- Hériter de `SkillBase` ou `PresetSkill` depuis `skills.base`
- Définir `SYSTEM_PROMPT` (chaîne)
- Déclarer des tools internes via `get_tools()` avec des imports de `tools.*`
- Utiliser le mécanisme `broadcast_event` pour envoyer des commandes à l'UI
- Lire des variables d'environnement **déclarées** dans `requires_env` du `skill.yaml`
- Faire des appels réseau si **déclarés** dans `requires_tools` (ex. `browser`)

---

## Scanner automatique

Chaque PR est scannée par `scripts/scan_security.py` :

```bash
python scripts/scan_security.py              # tout le repo
python scripts/scan_security.py skills/foo   # un skill précis
python scripts/scan_security.py --json       # sortie JSON pour CI
```

- **Exit 1** (build bloqué) si au moins une finding CRITIQUE
- **Exit 0** si seulement des ALERTE/INFO — une revue humaine est requise mais la CI continue

Le scanner analyse le code par AST. Il **ne l'exécute jamais**.

---

## Signaler un skill malveillant

Si vous découvrez un skill déjà mergé qui contient du code malveillant :

1. **Ouvrez une issue** avec le label `security` en décrivant le problème précisément (fichier, ligne, comportement suspect)
2. **N'exécutez pas** le skill en question
3. Le mainteneur retirera le skill du catalogue dans les 24 h et publiera une note dans l'issue

Pour une divulgation privée (vulnérabilité sensible), contactez le mainteneur directement via l'adresse indiquée dans son profil GitHub.

---

## Avertissement pour les utilisateurs

> Les skills de ce catalogue s'exécutent **localement sur votre machine**, avec les mêmes permissions que Jarvis OS.
>
> Jarvis OS dispose de son propre sandbox d'exécution, mais **vous êtes responsable des skills que vous choisissez d'installer**. N'installez que des skills dont vous avez lu le code ou dont vous faites confiance à l'auteur.
>
> Ce catalogue est maintenu par la communauté. Malgré le scan automatique et la revue manuelle, aucune garantie absolue ne peut être offerte.

---

## Responsabilités

| Rôle | Responsabilité |
|------|----------------|
| Contributeur | Soumettre du code propre, déclarer les dépendances réseau/env dans le yaml |
| Mainteneur | Relire chaque PR, valider les ALERTE du scanner, merger seulement après revue |
| Utilisateur | Choisir consciemment les skills qu'il installe |
