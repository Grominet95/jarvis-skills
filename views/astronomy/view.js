/**
 * Vue Astronomy — jarvis-skills
 * Système solaire interactif Canvas 2D — données statiques embarquées, zéro réseau.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'astronomy';

  // ── Données statiques ────────────────────────────────────────────────────────

  const PLANETS = [
    {
      name: 'Mercure',
      radius: 3.8,
      orbitRadius: 80,
      period: 88,
      color: '#a8998a',
      emoji: '☿',
      distance: '57,9 M km du Soleil',
      diameter: '4 879 km',
      moons: 0,
      facts: [
        'Planète la plus proche du Soleil',
        'Un jour dure 59 jours terrestres',
        'Amplitude thermique extrême : −180 °C à 430 °C',
      ],
    },
    {
      name: 'Vénus',
      radius: 9.5,
      orbitRadius: 130,
      period: 225,
      color: '#e8cda0',
      emoji: '♀',
      distance: '108,2 M km du Soleil',
      diameter: '12 104 km',
      moons: 0,
      facts: [
        'Planète la plus chaude (462 °C en moyenne)',
        'Tourne en sens inverse des autres planètes',
        'Un jour vénusien dure plus qu\'un an vénusien',
      ],
    },
    {
      name: 'Terre',
      radius: 10,
      orbitRadius: 188,
      period: 365,
      color: '#4a9eff',
      emoji: '🌍',
      distance: '149,6 M km du Soleil',
      diameter: '12 742 km',
      moons: 1,
      facts: [
        'Seule planète connue abritant la vie',
        '71 % de la surface est couverte d\'eau',
        'Âge estimé à 4,5 milliards d\'années',
      ],
    },
    {
      name: 'Mars',
      radius: 5.3,
      orbitRadius: 255,
      period: 687,
      color: '#d14c3b',
      emoji: '♂',
      distance: '227,9 M km du Soleil',
      diameter: '6 779 km',
      moons: 2,
      facts: [
        'Abrite Olympus Mons, le plus grand volcan du système solaire',
        'Atmosphère à 95 % de CO₂',
        'Un jour martien dure 24 h 37 min',
      ],
    },
    {
      name: 'Jupiter',
      radius: 22,
      orbitRadius: 360,
      period: 4333,
      color: '#c88b5a',
      emoji: '♃',
      distance: '778,5 M km du Soleil',
      diameter: '139 820 km',
      moons: 95,
      facts: [
        'Plus grande planète du système solaire',
        'La Grande Tache Rouge existe depuis 350 ans',
        'Possède au moins 95 lunes confirmées',
      ],
    },
    {
      name: 'Saturne',
      radius: 18,
      orbitRadius: 460,
      period: 10759,
      color: '#e4c98a',
      emoji: '♄',
      distance: '1 432 M km du Soleil',
      diameter: '116 460 km',
      moons: 146,
      facts: [
        'Ses anneaux s\'étendent sur 282 000 km',
        'Moins dense que l\'eau — flotterait dans un océan',
        'Possède 146 lunes, dont Titan avec atmosphère épaisse',
      ],
    },
    {
      name: 'Uranus',
      radius: 14,
      orbitRadius: 550,
      period: 30687,
      color: '#7de8e8',
      emoji: '⛢',
      distance: '2 871 M km du Soleil',
      diameter: '50 724 km',
      moons: 27,
      facts: [
        'Inclinée à 98° — tourne presque "sur le côté"',
        'Température minimale : −224 °C (la plus froide)',
        'Ses anneaux sont orientés verticalement',
      ],
    },
    {
      name: 'Neptune',
      radius: 13,
      orbitRadius: 630,
      period: 60190,
      color: '#3f6fff',
      emoji: '♆',
      distance: '4 495 M km du Soleil',
      diameter: '49 244 km',
      moons: 16,
      facts: [
        'Vents les plus rapides du système solaire (2 100 km/h)',
        'Planète la plus éloignée du Soleil',
        'Un an neptunien dure 165 ans terrestres',
      ],
    },
  ];

  const SUN = {
    name: 'Soleil',
    radius: 32,
    color: '#ffe04a',
    glowColor: 'rgba(255,200,40,0.18)',
    diameter: '1 392 700 km',
    distance: 'Centre du système solaire',
    facts: [
      'Représente 99,86 % de la masse du système solaire',
      'Surface à 5 500 °C, cœur à 15 millions °C',
      'La lumière met 8 min 20 s pour atteindre la Terre',
    ],
  };

  // ── État interne ──────────────────────────────────────────────────────────────

  let container = null;
  let canvas = null;
  let ctx = null;
  let animFrame = null;
  let infoPanel = null;
  let toastTimer = null;
  let time = 0;
  let focusedPlanet = null;
  let cameraX = 0;
  let cameraY = 0;
  let targetCameraX = 0;
  let targetCameraY = 0;
  let scale = 1;
  let targetScale = 1;
  let flyAnimation = null;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getPlanetAngle(planet, t) {
    return (t / planet.period) * Math.PI * 2;
  }

  function getPlanetPos(planet, t) {
    const angle = getPlanetAngle(planet, t);
    return {
      x: Math.cos(angle) * planet.orbitRadius,
      y: Math.sin(angle) * planet.orbitRadius,
    };
  }

  function findPlanet(name) {
    const normalized = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return PLANETS.find(p => {
      const pn = p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return pn === normalized || pn.startsWith(normalized);
    });
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────────

  function drawStars(w, h) {
    // Champ d'étoiles déterministe basé sur la taille du canvas
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const seed = 42;
    let s = seed;
    function rand() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    }
    for (let i = 0; i < 220; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() * 1.2 + 0.2;
      const alpha = rand() * 0.5 + 0.3;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSun(cx, cy) {
    // Halo extérieur
    const glow = ctx.createRadialGradient(cx, cy, SUN.radius * scale * 0.5, cx, cy, SUN.radius * scale * 3.5);
    glow.addColorStop(0, 'rgba(255,210,60,0.22)');
    glow.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, SUN.radius * scale * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Corps
    const grad = ctx.createRadialGradient(cx - SUN.radius * scale * 0.25, cy - SUN.radius * scale * 0.25, 0, cx, cy, SUN.radius * scale);
    grad.addColorStop(0, '#fff7b0');
    grad.addColorStop(0.45, '#ffe04a');
    grad.addColorStop(1, '#ff8c00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, SUN.radius * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOrbit(cx, cy, orbitRadius) {
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPlanet(planet, cx, cy, pos, isSelected) {
    const px = cx + pos.x * scale;
    const py = cy + pos.y * scale;
    const r = planet.radius * scale;

    // Halo de sélection
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(px, py, r + 6 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Anneaux de Saturne
    if (planet.name === 'Saturne') {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(1, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(228,201,138,0.5)';
      ctx.lineWidth = r * 0.5;
      ctx.stroke();
      ctx.restore();
    }

    // Corps de la planète
    const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r);
    grad.addColorStop(0, lighten(planet.color, 0.4));
    grad.addColorStop(1, darken(planet.color, 0.45));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // Label
    if (scale > 0.65) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.max(9, 11 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, px, py + r + 14 * scale);
    }
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amt));
    const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
    const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amt));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amt));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amt));
    return `rgb(${r},${g},${b})`;
  }

  function render() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Smooth camera
    cameraX = lerp(cameraX, targetCameraX, 0.07);
    cameraY = lerp(cameraY, targetCameraY, 0.07);
    scale = lerp(scale, targetScale, 0.07);

    ctx.clearRect(0, 0, w, h);

    // Fond noir spatial
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, w, h);

    drawStars(w, h);

    const cx = w / 2 - cameraX;
    const cy = h / 2 - cameraY;

    // Orbites
    PLANETS.forEach(p => drawOrbit(cx, cy, p.orbitRadius));

    // Soleil
    drawSun(cx, cy);

    // Planètes
    time += 0.18;
    PLANETS.forEach(p => {
      const pos = getPlanetPos(p, time);
      drawPlanet(p, cx, cy, pos, focusedPlanet && focusedPlanet.name === p.name);
    });

    animFrame = requestAnimationFrame(render);
  }

  // ── Panneau d'infos ───────────────────────────────────────────────────────────

  function showInfoPanel(obj) {
    if (!container) return;
    removeInfoPanel();

    infoPanel = document.createElement('div');
    Object.assign(infoPanel.style, {
      position: 'absolute',
      top: '50%',
      right: '32px',
      transform: 'translateY(-50%)',
      background: 'rgba(10,10,22,0.88)',
      color: 'var(--fg-1,#e8e8e8)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      borderRadius: '14px',
      padding: '24px 28px',
      minWidth: '260px',
      maxWidth: '300px',
      fontFamily: 'monospace',
      fontSize: '13px',
      lineHeight: '1.7',
      zIndex: '4',
      opacity: '0',
      transition: 'opacity .3s',
      pointerEvents: 'none',
    });

    const isSun = obj === SUN;
    const color = isSun ? SUN.color : obj.color;

    infoPanel.innerHTML = `
      <div style="font-size:22px;margin-bottom:10px;text-align:center;">${isSun ? '☀️' : obj.emoji}</div>
      <div style="font-size:16px;font-weight:700;color:${color};margin-bottom:12px;text-align:center;letter-spacing:.04em;">${obj.name}</div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
        <div><span style="color:rgba(255,255,255,0.45);">Diamètre</span><br>${obj.diameter}</div>
        <div style="margin-top:8px;"><span style="color:rgba(255,255,255,0.45);">Distance</span><br>${obj.distance}</div>
        ${!isSun ? `<div style="margin-top:8px;"><span style="color:rgba(255,255,255,0.45);">Lunes</span><br>${obj.moons}</div>` : ''}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:12px;padding-top:10px;">
        <div style="color:rgba(255,255,255,0.45);margin-bottom:6px;">Faits clés</div>
        ${obj.facts.map(f => `<div style="margin-bottom:5px;padding-left:8px;border-left:2px solid ${color}50;">${f}</div>`).join('')}
      </div>
    `;

    container.appendChild(infoPanel);
    requestAnimationFrame(() => { infoPanel.style.opacity = '1'; });
  }

  function removeInfoPanel() {
    if (infoPanel && infoPanel.parentNode) {
      infoPanel.parentNode.removeChild(infoPanel);
    }
    infoPanel = null;
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

  function showToast(msg) {
    clearTimeout(toastTimer);
    let toast = container && container.querySelector('.ast-toast');
    if (!toast && container) {
      toast = document.createElement('div');
      toast.className = 'ast-toast';
      Object.assign(toast.style, {
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,10,22,0.88)',
        color: 'var(--fg-1,#e8e8e8)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        padding: '8px 20px',
        borderRadius: '999px',
        fontSize: '13px',
        letterSpacing: '.03em',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: '4',
        opacity: '0',
        transition: 'opacity .2s',
        whiteSpace: 'nowrap',
      });
      container.appendChild(toast);
    }
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3200);
  }

  // ── Container ────────────────────────────────────────────────────────────────

  function ensureContainer() {
    if (container) return;

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2',
      background: '#05050f',
      opacity: '0',
      transition: 'opacity .35s ease',
      display: 'none',
      overflow: 'hidden',
    });

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    container.appendChild(canvas);

    const resizeCanvas = () => {
      canvas.width = container.offsetWidth || window.innerWidth;
      canvas.height = container.offsetHeight || window.innerHeight;
      ctx = canvas.getContext('2d');
    };
    resizeCanvas();

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);
    container._ro = ro;

    // Interaction souris — clic sur planète
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const cx = canvas.width / 2 - cameraX;
      const cy = canvas.height / 2 - cameraY;

      // Test Soleil
      const dx0 = mx - cx, dy0 = my - cy;
      if (Math.sqrt(dx0 * dx0 + dy0 * dy0) < SUN.radius * scale + 6) {
        _focusObject(SUN);
        return;
      }

      for (const p of PLANETS) {
        const pos = getPlanetPos(p, time);
        const px = cx + pos.x * scale;
        const py = cy + pos.y * scale;
        const dx = mx - px, dy = my - py;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius * scale + 10) {
          _doFocusPlanet(p);
          return;
        }
      }
    });

    document.body.appendChild(container);
  }

  // ── Logique de focus ──────────────────────────────────────────────────────────

  function _doFocusPlanet(planet) {
    focusedPlanet = planet;
    const pos = getPlanetPos(planet, time);
    targetCameraX = pos.x * targetScale;
    targetCameraY = pos.y * targetScale;
    targetScale = Math.min(2.2, 680 / planet.orbitRadius);
    showInfoPanel(planet);
    showToast(`${planet.emoji} ${planet.name}`);
  }

  function _focusObject(obj) {
    if (obj === SUN) {
      focusedPlanet = null;
      targetCameraX = 0;
      targetCameraY = 0;
      targetScale = 1;
      showInfoPanel(SUN);
      showToast('☀️ Soleil');
    }
  }

  function _solarSystemView() {
    focusedPlanet = null;
    targetCameraX = 0;
    targetCameraY = 0;
    targetScale = 1;
    removeInfoPanel();
    showToast('Système solaire');
  }

  // ── Enregistrement ───────────────────────────────────────────────────────────

  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'Astronomy',
      desc: 'Système solaire interactif — planètes et faits astronomiques',
      glyph: 'AST',
      tags: ['astronomie', 'espace', 'planètes', '3D'],
    },

    show(params = {}) {
      ensureContainer();
      if (container.style.display !== 'none') return;

      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      if (!animFrame) render();
    },

    hide() {
      if (!container) return;
      container.style.opacity = '0';
      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 360);
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'solar_system':
          _solarSystemView();
          break;

        case 'focus_planet': {
          const name = params.planet || '';
          const planet = findPlanet(name);
          if (planet) {
            _doFocusPlanet(planet);
          } else {
            showToast(`Planète inconnue : ${name}`);
          }
          break;
        }

        case 'fly_to_object': {
          const name = (params.object_name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          if (name.includes('soleil') || name.includes('sun')) {
            _focusObject(SUN);
            break;
          }
          const planet = findPlanet(params.object_name || '');
          if (planet) {
            _doFocusPlanet(planet);
          } else {
            showToast(`Objet inconnu : ${params.object_name}`);
          }
          break;
        }

        // Commandes inconnues silencieusement ignorées
      }
    },
  });
})();
