# Jarvis Skills

[![Site vitrine](https://img.shields.io/badge/Site-Vitrine-00b4d8?style=for-the-badge&logo=githubpages&logoColor=white)](https://grominet95.github.io/jarvis-skills/)
[![Jarvis](https://img.shields.io/badge/Jarvis-OS-black?style=for-the-badge&logo=github)](https://github.com/Grominet95/jarvis-OS)
[![License](https://img.shields.io/badge/Licence-MIT-blue?style=for-the-badge)](LICENSE)
[![Skills](https://img.shields.io/badge/Skills-4-brightgreen?style=for-the-badge)](#skills-conversationnels)
[![Presets](https://img.shields.io/badge/Presets-3-purple?style=for-the-badge)](#presets)
[![Contribuer](https://img.shields.io/badge/Contribuer-un%20skill-orange?style=for-the-badge)](CONTRIBUTING.md)

Bibliothèque communautaire de skills pour [Jarvis](https://github.com/Grominet95/jarvis-OS), l'assistant IA personnel open source.

## Qu'est-ce qu'un skill ?

Un skill est une extension de capacité pour Jarvis.
Il enseigne à Jarvis comment se comporter dans un contexte précis : recherche web avancée, analyse YouTube, impression 3D, modélisation CAD, etc.

Techniquement c'est un fichier Python avec un `SYSTEM_PROMPT` qui s'injecte automatiquement dans le contexte de Jarvis.

## Qu'est-ce qu'une preset ?

Une preset est un skill spécial qui déclenche une **séquence d'actions concrètes** sur la machine de l'utilisateur : ouvrir des apps, contrôler Spotify, activer Ne pas déranger, faire parler Jarvis, appeler un LLM.

## Installer un skill

Dans Jarvis, ouvre **Paramètres > Marketplace**, recherche le skill et clique **Installer**.

## Skills disponibles

### Skills conversationnels

| Skill | Description | Outils requis | Env requis |
|-------|-------------|---------------|------------|
| [web-researcher](skills/web-researcher/) | Recherche web avancée avec synthèse et citations | browser | - |
| [youtube-analyzer](skills/youtube-analyzer/) | Analyse performances YouTube et suggestions de contenu | - | YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID |
| [bambulab-printer](skills/bambulab-printer/) | Contrôle imprimante BambuLab via MQTT | - | PRINTER_IP, PRINTER_SERIAL, PRINTER_ACCESS_CODE |
| [fusion360](skills/fusion360/) | Contrôle Fusion 360 via MCP : scripts Python API, export STL | - | - |

### Presets

| Preset | Description | Auteur | Plateformes |
|---------|-------------|--------|-------------|
| [mode-streameur](skills/mode-streameur/) | Env. stream — OBS, Spotify, DND | BarthH95 | mac, windows |
| [mode-travail](skills/mode-travail/) | Env. travail — Notion, VS Code, focus | BarthH95 | mac, windows |
| [mode-nuit](skills/mode-nuit/) | Fin de journée — bilan, musique douce | BarthH95 | mac, windows |

## Contribuer un skill

Tu veux ajouter une capacité à Jarvis et la partager ?
Lis [CONTRIBUTING.md](CONTRIBUTING.md), le process est rapide.

## Site vitrine

Le catalogue est consultable en ligne sur **[https://grominet95.github.io/jarvis-skills/](https://grominet95.github.io/jarvis-skills/)**.

Le site est statique (HTML/CSS/JS vanilla, hébergé via GitHub Pages) et affiche en temps réel les skills et presets depuis `index.json`.

## Communauté

[![Discord](https://img.shields.io/badge/Discord-Le%20Labo-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/rSZjtEeZJC)
[![GitHub](https://img.shields.io/badge/GitHub-Jarvis%20OS-black?style=for-the-badge&logo=github)](https://github.com/Grominet95/jarvis-OS)
