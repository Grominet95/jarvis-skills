# Jarvis Skills

[![Jarvis](https://img.shields.io/badge/Jarvis-OS-black?style=for-the-badge&logo=github)](https://github.com/Grominet95/jarvis-OS)
[![License](https://img.shields.io/badge/Licence-MIT-blue?style=for-the-badge)](LICENSE)
[![Skills](https://img.shields.io/badge/Skills-4-brightgreen?style=for-the-badge)](#skills-disponibles)
[![Contribuer](https://img.shields.io/badge/Contribuer-un%20skill-orange?style=for-the-badge)](CONTRIBUTING.md)

Bibliothèque communautaire de skills pour [Jarvis](https://github.com/Grominet95/jarvis-OS), l'assistant IA personnel open source.

## Qu'est-ce qu'un skill ?

Un skill est une extension de capacité pour Jarvis.
Il enseigne à Jarvis comment se comporter dans un contexte précis : recherche web avancée, analyse YouTube, impression 3D, modélisation CAD, etc.

Techniquement c'est un fichier Python avec un `SYSTEM_PROMPT` qui s'injecte automatiquement dans le contexte de Jarvis.

## Installer un skill

Dans Jarvis, ouvre **Paramètres > Marketplace**, recherche le skill et clique **Installer**.

## Skills disponibles

| Skill | Description | Outils requis | Env requis |
|-------|-------------|---------------|------------|
| [web-researcher](skills/web-researcher/) | Recherche web avancée avec synthèse et citations | browser | - |
| [youtube-analyzer](skills/youtube-analyzer/) | Analyse performances YouTube et suggestions de contenu | - | YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID |
| [bambulab-printer](skills/bambulab-printer/) | Contrôle imprimante BambuLab via MQTT | - | PRINTER_IP, PRINTER_SERIAL, PRINTER_ACCESS_CODE |
| [fusion360](skills/fusion360/) | Contrôle Fusion 360 via MCP : scripts Python API, export STL | - | - |

## Contribuer un skill

Tu veux ajouter une capacité à Jarvis et la partager ?
Lis [CONTRIBUTING.md](CONTRIBUTING.md), le process est rapide.

## Communauté

[![Discord](https://img.shields.io/badge/Discord-Le%20Labo-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/lien)
[![GitHub](https://img.shields.io/badge/GitHub-Jarvis%20OS-black?style=for-the-badge&logo=github)](https://github.com/Grominet95/jarvis-OS)
