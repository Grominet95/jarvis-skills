// jarvis-skills : embedded fallback catalog (mirror of GitHub index.json + skill.yaml details)
// Live data is fetched first; this acts as fallback if GitHub fetch fails.
window.JARVIS_FALLBACK = {
  version: "1.3",
  updated_at: "2026-05-08",
  skills: [
    {
      name: "web-researcher", version: "1.0.0", type: "skill", author: "BarthH95",
      description: "Recherche web avancée avec synthèse structurée et citations sources.",
      tags: ["research", "web", "search"], path: "skills/web-researcher",
      requires_env: [], requires_tools: ["browser"], requires_oauth: [],
      platforms: ["mac", "windows", "linux"]
    },
    {
      name: "youtube-analyzer", version: "1.0.0", type: "skill", author: "BarthH95",
      description: "Analyse les performances YouTube et suggère des améliorations de contenu.",
      tags: ["youtube", "analytics", "content", "creator"], path: "skills/youtube-analyzer",
      requires_env: ["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"],
      requires_tools: [], requires_oauth: [],
      platforms: ["mac", "windows", "linux"]
    },
    {
      name: "bambulab-printer", version: "1.0.1", type: "skill", author: "BarthH95",
      description: "Contrôle une imprimante 3D BambuLab via MQTT : slice, impression, statut, annulation.",
      tags: ["hardware", "3d-print", "bambu"], path: "skills/bambulab-printer",
      requires_env: ["PRINTER_IP", "PRINTER_SERIAL", "PRINTER_ACCESS_CODE"],
      requires_tools: [], requires_oauth: [],
      platforms: ["mac", "windows", "linux"]
    },
    {
      name: "fusion360", version: "1.0.1", type: "skill", author: "BarthH95",
      description: "Contrôle Autodesk Fusion 360 via MCP : modélisation 3D, scripts Python API, export STL.",
      tags: ["hardware", "cad", "3d", "fusion", "modeling"], path: "skills/fusion360",
      requires_env: [], requires_tools: [], requires_oauth: [],
      platforms: ["mac", "windows"]
    },
    {
      name: "mode-streameur", version: "2.0.0", type: "preset", author: "BarthH95",
      description: "Lance l'environnement stream : OBS, Ne pas déranger, Twitch, recommandation de jeu.",
      tags: ["preset", "stream", "gaming", "obs", "twitch"], path: "skills/mode-streameur",
      requires_env: [], requires_tools: ["execute_cli"], requires_oauth: [],
      platforms: ["mac", "windows"],
      triggers: ["lance le mode streameur", "démarre le stream", "on stream", "je vais streamer"]
    },
    {
      name: "mode-travail", version: "1.0.0", type: "preset", author: "BarthH95",
      description: "Lance l'environnement de travail : apps, musique focus, Ne pas déranger.",
      tags: ["preset", "travail", "focus", "productivite"], path: "skills/mode-travail",
      requires_env: [], requires_tools: ["spotify_control", "execute_cli", "notion_tasks"], requires_oauth: [],
      platforms: ["mac", "windows"],
      triggers: ["lance le mode travail", "mode focus", "on bosse", "je commence à travailler", "démarre la session de travail"]
    },
    {
      name: "mode-nuit", version: "1.0.0", type: "preset", author: "BarthH95",
      description: "Prépare la fin de journée : ferme les apps de travail, musique douce.",
      tags: ["preset", "nuit", "veille", "fin-de-journee"], path: "skills/mode-nuit",
      requires_env: [], requires_tools: ["spotify_control", "execute_cli"], requires_oauth: [],
      platforms: ["mac", "windows"],
      triggers: ["lance le mode nuit", "bonne nuit", "fin de journée", "je vais dormir", "on arrête pour ce soir"]
    },
    {
      name: "globe", version: "1.0.0", type: "view", author: "BarthH95",
      description: "Globe terrestre interactif avec navigation vocale et vols animés.",
      tags: ["geo", "realtime", "map", "globe", "navigation"], path: "views/globe",
      glyph: "GLB",
      requires_env: ["MAPBOX_TOKEN"],
      platforms: ["mac", "windows", "linux"]
    }
  ]
};

// View commands — shown on view cards and detail pages instead of capabilities.
window.JARVIS_VIEW_COMMANDS = {
  "globe": [
    "Affiche le globe en plein écran avec auto-rotation",
    "Vol animé vers n'importe quel lieu du monde",
    "Zoom avant / arrière avec transition fluide",
    "Réinitialise vers la vue globe entière",
  ]
};

// Per-skill descriptions for the "what it does" bullets on cards + detail capabilities.
// (Inferred from skill.py + yaml; rendered as capabilities list when present.)
window.JARVIS_CAPABILITIES = {
  "web-researcher": [
    "Lance des recherches web ciblées et multi-sources",
    "Synthétise les résultats en sections claires",
    "Cite chaque source et indique la fraîcheur"
  ],
  "youtube-analyzer": [
    "Récupère les stats récentes via YouTube Data API",
    "Identifie les vidéos sur/sous-performantes",
    "Propose des pistes d'amélioration (titre, thumbnail, hook)"
  ],
  "bambulab-printer": [
    "Statut temps réel via MQTT (temp, progression, layer)",
    "Lance, met en pause, ou annule une impression",
    "Vérifie la disponibilité du plateau et des filaments"
  ],
  "fusion360": [
    "Génère et exécute des scripts Python Fusion API",
    "Crée, modifie ou paramètre des sketches et bodies",
    "Exporte en STL prêt pour l'impression 3D"
  ],
  "mode-streameur": [
    "Lance OBS et Twitch dashboard",
    "Active Ne Pas Déranger système",
    "Recommande un jeu et ouvre sa page Steam",
    "Annonce vocale de fin de séquence"
  ],
  "mode-travail": [
    "Ouvre Notion + VS Code",
    "Lance une playlist focus sur Spotify",
    "Active Ne Pas Déranger",
    "Brief IA des tâches prioritaires du jour"
  ],
  "mode-nuit": [
    "Ferme VS Code et Notion proprement",
    "Lance une playlist douce sur Spotify",
    "Désactive Ne Pas Déranger",
    "Bilan IA de la journée + intention pour demain"
  ]
};

// Required external apps (for presets) : surfaced on the card and detail page.
window.JARVIS_REQUIRES_APPS = {
  "mode-streameur": [
    { name: "OBS Studio", url: "https://obsproject.com/" },
    { name: "Twitch", url: "https://twitch.tv/" }
  ],
  "mode-travail": [
    { name: "Notion", url: "https://www.notion.so/desktop" },
    { name: "Visual Studio Code", url: "https://code.visualstudio.com/" },
    { name: "Spotify", url: "https://www.spotify.com/download/" }
  ],
  "mode-nuit": [
    { name: "Spotify", url: "https://www.spotify.com/download/" }
  ]
};

// Required env-var descriptions for env-heavy skills.
window.JARVIS_ENV_HELP = {
  YOUTUBE_API_KEY: "Clé API publique YouTube Data v3.",
  YOUTUBE_CHANNEL_ID: "Identifiant de la chaîne à analyser (UC…).",
  PRINTER_IP: "Adresse IP locale de l'imprimante BambuLab.",
  PRINTER_SERIAL: "Numéro de série imprimé sous la machine.",
  PRINTER_ACCESS_CODE: "Code d'accès LAN (Réglages → Réseau).",
  MAPBOX_TOKEN: "Token public Mapbox GL JS (commence par pk.). Obtenir gratuitement sur mapbox.com."
};
