/**
 * Vue Astronomy — jarvis-skills
 * Carte du ciel / Constellations — voûte céleste Canvas 2D, données embarquées,
 * zéro réseau. Parti pris « Focus » : au repos les constellations sont tracées
 * faiblement ; au survol/commande, UNE constellation s'illumine, le reste du
 * ciel s'assombrit, son nom s'écrit en grand.
 *
 * Dépend de : _shared.js (Jarvis.views doit être chargé avant ce fichier).
 * Le chrome (marque, eyebrow, voix, légende, panneau) est le langage commun
 * aux 4 vues Jarvis — injecté via un <style> partagé idempotent (#jx-chrome-css).
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'astronomy';
  const STYLE_ID = 'astronomy-css';

  /* ─────────────────────────────────────────────────────────────────────
     CHROME PARTAGÉ — identique sur les 4 vues Jarvis.
     Bloc CSS + petit constructeur DOM. Injecté une seule fois (guard).
     ───────────────────────────────────────────────────────────────────── */
  const JX_CHROME_CSS_ID = 'jx-chrome-css';
  const JX_CHROME_CSS = `
    .jx-chrome { position:absolute; inset:0; z-index:6; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }
    .jx-chrome > * { pointer-events:auto; }
    .jx-brand { position:absolute; top:28px; left:32px; display:flex; align-items:center; gap:12px; }
    .jx-brand svg { display:block; flex-shrink:0; }
    .jx-brand-txt { display:flex; flex-direction:column; gap:4px; line-height:1; }
    .jx-brand-word { font-family:var(--display-mark,"Landasans",var(--serif,"Geist")); font-weight:500; font-size:14px; letter-spacing:.22em; color:var(--fg-0,#DCE8FF); }
    .jx-brand-status { font-family:var(--mono,"Geist Mono",monospace); font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.4)); display:flex; align-items:center; gap:6px; }
    .jx-brand-status::before { content:""; width:4px; height:4px; border-radius:50%; background:var(--green,#36D399); box-shadow:0 0 5px var(--green,#36D399); }
    .jx-eyebrow { position:absolute; top:30px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; font-family:var(--mono,monospace); font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--fg-2,rgba(220,232,255,.58)); white-space:nowrap; }
    .jx-eyebrow .vn { color:var(--accent,#4A9EFF); }
    .jx-eyebrow .sep { color:var(--fg-4,rgba(220,232,255,.22)); }
    .jx-context { position:absolute; top:28px; right:32px; display:flex; align-items:center; gap:14px; font-family:var(--mono,monospace); font-size:10.5px; letter-spacing:.06em; color:var(--fg-2,rgba(220,232,255,.58)); font-variant-numeric:tabular-nums; }
    .jx-context .sep { width:1px; height:11px; background:var(--line-2,rgba(220,232,255,.1)); }
    .jx-context .muted { color:var(--fg-3,rgba(220,232,255,.4)); letter-spacing:.12em; text-transform:uppercase; font-size:9.5px; }
    .jx-voice { position:absolute; bottom:26px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; padding:7px 14px 7px 12px; border-radius:999px; background:rgba(6,8,13,.62); border:1px solid var(--line-2,rgba(220,232,255,.1)); backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%); }
    .jx-voice .vbars { display:flex; align-items:center; gap:2px; height:14px; }
    .jx-voice .vbars i { width:2px; border-radius:1px; background:var(--accent,#4A9EFF); box-shadow:0 0 5px var(--accent,#4A9EFF); animation:jx-vbar 1s ease-in-out infinite; }
    .jx-voice .vbars i:nth-child(1){ height:5px; animation-delay:0s; }
    .jx-voice .vbars i:nth-child(2){ height:11px; animation-delay:.12s; }
    .jx-voice .vbars i:nth-child(3){ height:7px; animation-delay:.24s; }
    .jx-voice .vbars i:nth-child(4){ height:13px; animation-delay:.36s; }
    .jx-voice .vbars i:nth-child(5){ height:6px; animation-delay:.48s; }
    @keyframes jx-vbar { 0%,100%{ transform:scaleY(.5); opacity:.6; } 50%{ transform:scaleY(1); opacity:1; } }
    .jx-voice .vtxt { font-family:var(--mono,monospace); font-size:10px; letter-spacing:.08em; color:var(--fg-1,rgba(220,232,255,.78)); }
    .jx-voice .vtxt b { color:var(--fg-0,#DCE8FF); font-weight:500; }
    .jx-navhint { position:absolute; bottom:28px; right:32px; display:flex; align-items:center; gap:14px; font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.08em; color:var(--fg-3,rgba(220,232,255,.4)); }
    .jx-navhint b { color:var(--fg-1,rgba(220,232,255,.78)); font-weight:400; }
    .jx-navhint .k { border:1px solid var(--line-2,rgba(220,232,255,.1)); border-radius:3px; padding:1px 5px; color:var(--fg-2,rgba(220,232,255,.58)); }
    .jx-legend { position:absolute; bottom:28px; left:32px; display:flex; flex-direction:column; gap:6px; font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.06em; color:var(--fg-3,rgba(220,232,255,.4)); }
    .jx-legend .lg-row { display:flex; align-items:center; gap:8px; }
    .jx-legend .lg-sw { width:10px; height:2px; border-radius:2px; }
    .jx-panel { position:absolute; background:rgba(10,14,22,.78); border:1px solid var(--line-2,rgba(220,232,255,.1)); border-radius:var(--r-4,16px); backdrop-filter:blur(20px) saturate(150%); -webkit-backdrop-filter:blur(20px) saturate(150%); padding:20px; box-shadow:0 24px 60px -24px rgba(0,0,0,.7); width:312px; }
    .jx-panel-eyebrow { font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.4)); display:flex; align-items:center; justify-content:space-between; }
    .jx-panel-title { font-family:var(--serif,"Geist"); font-weight:300; font-size:26px; letter-spacing:-.03em; color:var(--fg-0,#DCE8FF); line-height:1.05; margin-top:10px; }
    .jx-panel-sub { font-family:var(--mono,monospace); font-size:10.5px; letter-spacing:.04em; color:var(--fg-2,rgba(220,232,255,.58)); margin-top:6px; }
    .jx-panel-body { font-size:12.5px; line-height:1.55; color:var(--fg-1,rgba(220,232,255,.78)); margin-top:12px; }
    .jx-panel-div { height:1px; background:var(--line-1,rgba(220,232,255,.06)); margin:16px 0; }
    .jx-panel-stats { display:grid; grid-template-columns:1fr 1fr; gap:14px 18px; }
    .jx-stat .s-lbl { font-family:var(--mono,monospace); font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.4)); }
    .jx-stat .s-val { font-family:var(--serif,"Geist"); font-weight:300; font-size:22px; letter-spacing:-.02em; color:var(--fg-0,#DCE8FF); line-height:1; margin-top:5px; font-variant-numeric:tabular-nums; }
    .jx-stat .s-val .u { font-family:var(--mono,monospace); font-size:10px; color:var(--fg-2,rgba(220,232,255,.58)); margin-left:3px; letter-spacing:.04em; }
    .jx-chip { position:absolute; display:inline-flex; flex-direction:column; gap:3px; padding:9px 13px; border-radius:var(--r-2,8px); background:rgba(10,14,22,.74); border:1px solid var(--line-2,rgba(220,232,255,.1)); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); }
    .jx-chip .c-name { font-family:var(--serif,"Geist"); font-weight:400; font-size:15px; letter-spacing:-.01em; color:var(--fg-0,#DCE8FF); }
    .jx-chip .c-meta { font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.08em; color:var(--fg-2,rgba(220,232,255,.58)); }
    .jx-badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; padding:3px 7px; border-radius:var(--r-1,4px); border:1px solid var(--line-2,rgba(220,232,255,.1)); color:var(--fg-2,rgba(220,232,255,.58)); }
    .jx-badge.green  { color:var(--green,#36D399); border-color:rgba(54,211,153,.32); background:var(--green-soft,rgba(54,211,153,.1)); }
    .jx-badge.accent { color:var(--accent,#4A9EFF); border-color:var(--accent-line,rgba(74,158,255,.3)); background:var(--accent-soft,rgba(74,158,255,.1)); }
    .jx-badge.gold   { color:var(--gold,#B8963E); border-color:rgba(184,150,62,.32); background:var(--gold-soft,rgba(184,150,62,.1)); }
    .jx-badge .dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
    .jx-fade-in { animation:jx-fade .35s cubic-bezier(.2,.8,.25,1); }
    @keyframes jx-fade { from{ opacity:0; transform:translateY(6px);} to{ opacity:1; transform:none; } }
    @media (prefers-reduced-motion: reduce) { .jx-fade-in { animation:none; } }
  `;

  function jxEnsureChromeCss() {
    if (document.getElementById(JX_CHROME_CSS_ID)) return;
    const s = document.createElement('style');
    s.id = JX_CHROME_CSS_ID;
    s.textContent = JX_CHROME_CSS;
    document.head.appendChild(s);
  }

  function jxBrandMark(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--accent,#4A9EFF)" stroke-width="1"/>
      <circle cx="13" cy="13" r="6.5" fill="none" stroke="var(--accent,#4A9EFF)" stroke-width="1" opacity=".55"/>
      <circle cx="13" cy="13" r="2" fill="var(--accent,#4A9EFF)"/></svg>`;
  }

  /* Construit la couche chrome commune. opts: {viewNum, viewName, status, voice, context[], nav, legend[]} */
  function jxBuildChrome(opts) {
    const c = document.createElement('div');
    c.className = 'jx-chrome';
    c.innerHTML = `
      ${opts.context ? `<div class="jx-context">${opts.context.map((x, i) =>
        (i ? '<span class="sep"></span>' : '') + `<span class="${x.muted ? 'muted' : ''}">${x.t}</span>`).join('')}</div>` : ''}
      ${opts.nav ? `<div class="jx-navhint">${opts.nav}</div>` : ''}
      ${opts.legend ? `<div class="jx-legend">${opts.legend.map(r =>
        `<div class="lg-row">${r.sw ? `<span class="lg-sw" style="background:${r.sw}"></span>` : ''}<span>${r.t}</span></div>`).join('')}</div>` : ''}
    `;
    return c;
  }

  /* ─────────────────────────────────────────────────────────────────────
     DONNÉES — constellations en coordonnées virtuelles 1280×720.
     ───────────────────────────────────────────────────────────────────── */
  const VW = 1280, VH = 720;
  const CONST = [
    {
      id: 'orion', name: 'Orion', fr: 'Le Chasseur', sub: 'α Bételgeuse · 7 étoiles',
      stars: [[612,300,2.6],[690,316,2.2],[628,374,2.0],[649,379,2.2],[670,384,2.0],[622,448,1.9],[694,442,2.6]],
      lines: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[0,1]],
      stats: [['Étoiles','7',''],['Magnitude','0.4',''],['Distance','643','al'],['Au zénith','23:48','']],
      body: 'Visible plein sud. Bételgeuse, supergéante rouge, marque l\u2019épaule. La Ceinture pointe vers Sirius.',
    },
    {
      id: 'cassiopee', name: 'Cassiopée', fr: 'La Reine', sub: '5 étoiles · le W',
      stars: [[206,168,2.2],[250,202,2.0],[296,172,2.4],[342,210,2.0],[384,178,2.1]],
      lines: [[0,1],[1,2],[2,3],[3,4]],
      stats: [['Étoiles','5',''],['Magnitude','2.2',''],['Distance','54','al'],['Circumpolaire','oui','']],
      body: 'Le W caractéristique, toujours au-dessus de l\u2019horizon sous nos latitudes.',
    },
    {
      id: 'grande-ourse', name: 'Grande Ourse', fr: 'Ursa Major', sub: '7 étoiles · la Casserole',
      stars: [[902,150,2.4],[902,200,2.0],[956,206,2.1],[956,156,2.0],[1002,150,2.2],[1046,160,1.9],[1086,150,2.3]],
      lines: [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]],
      stats: [['Étoiles','7',''],['Magnitude','1.8',''],['Distance','81','al'],['Pointe','Polaire','']],
      body: 'La Casserole. Le bord de la louche prolonge la ligne vers l\u2019étoile Polaire.',
    },
    {
      id: 'cygne', name: 'Cygne', fr: 'Croix du Nord', sub: '5 étoiles · la Croix',
      stars: [[372,470,2.5],[396,532,2.1],[418,596,1.9],[330,520,2.0],[460,544,2.0]],
      lines: [[0,1],[1,2],[3,1],[1,4]],
      stats: [['Étoiles','5',''],['Magnitude','1.3',''],['Distance','2615','al'],['Deneb','α Cyg','']],
      body: 'La Croix du Nord file le long de la Voie lactée. Deneb en marque la tête.',
    },
  ];
  CONST.forEach((c) => {
    c.cx = c.stars.reduce((a, s) => a + s[0], 0) / c.stars.length;
    c.cy = c.stars.reduce((a, s) => a + s[1], 0) / c.stars.length;
  });

  /* Combinaison FIGÉE (validée) : Orion par défaut, voile léger, nom géant, ciel dense. */
  const FROZEN = { focusId: 'orion', dim: 0.45, nameSize: 104, density: 340 };

  /* ─────────────────────────────────────────────────────────────────────
     État interne
     ───────────────────────────────────────────────────────────────────── */
  let container = null, canvas = null, ctx = null, animFrame = null, ro = null;
  let chromeEl = null, overlayEl = null, _visible = false;
  let stars = [];
  let W = 0, H = 0, cover = 1;
  let focusId = null;            // null = vue d'ensemble ; sinon id constellation
  let hoverId = null;
  let dim = 0, targetDim = 0;    // voile animé
  let zoom = 1, targetZoom = 1;  // zoom caméra animé
  let camX = VW / 2, camY = VH / 2, targetCamX = VW / 2, targetCamY = VH / 2;
  let clickHandler = null, moveHandler = null;

  const lerp = (a, b, t) => a + (b - a) * t;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function findConst(name) {
    const n = norm(name);
    return CONST.find((c) => norm(c.name) === n || norm(c.id) === n || norm(c.name).startsWith(n) || norm(c.fr).includes(n));
  }

  /* mapping virtuel → écran (avec caméra zoom, ancre verticale à 42% en focus) */
  function anchorY() { return focusId ? H * 0.42 : H * 0.5; }
  function mapX(vx) { return W / 2 + (vx - camX) * cover * zoom; }
  function mapY(vy) { return anchorY() + (vy - camY) * cover * zoom; }

  /* ─────────────────────────────────────────────────────────────────────
     Rendu
     ───────────────────────────────────────────────────────────────────── */
  function makeStars(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const tint = t < 0.05 ? '#9cc4ff' : (t < 0.08 ? '#d9c79a' : '#DCE8FF');
      arr.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() < 0.78 ? Math.random() * 1.1 + 0.6 : Math.random() * 1.6 + 1.6,
        base: Math.random() * 0.4 + 0.35, amp: Math.random() * 0.3 + 0.12,
        sp: Math.random() * 1.6 + 0.4, ph: Math.random() * 6.28, tint,
      });
    }
    return arr;
  }

  function drawConst(c, lit, t) {
    ctx.lineWidth = lit ? 1.7 : 1.1;
    ctx.strokeStyle = lit ? 'rgba(74,158,255,.9)' : 'rgba(220,232,255,.18)';
    if (lit) { ctx.shadowColor = '#4A9EFF'; ctx.shadowBlur = 9; }
    ctx.beginPath();
    c.lines.forEach(([a, b]) => {
      ctx.moveTo(mapX(c.stars[a][0]), mapY(c.stars[a][1]));
      ctx.lineTo(mapX(c.stars[b][0]), mapY(c.stars[b][1]));
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    c.stars.forEach(([x, y, m]) => {
      const tw = lit ? 1 : 0.85 + 0.15 * Math.sin(t * 1.4 + x);
      ctx.globalAlpha = tw;
      ctx.shadowColor = lit ? 'rgba(160,200,255,.95)' : 'rgba(220,232,255,.5)';
      ctx.shadowBlur = lit ? 13 : 5;
      ctx.beginPath();
      ctx.arc(mapX(x), mapY(y), m * (lit ? 1.6 : 1.15), 0, 6.2832);
      ctx.fillStyle = '#EAF1FF';
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
  }

  function render(ts) {
    const t = (ts || 0) / 1000;
    dim = lerp(dim, targetDim, 0.08);
    zoom = lerp(zoom, targetZoom, 0.08);
    camX = lerp(camX, targetCamX, 0.08);
    camY = lerp(camY, targetCamY, 0.08);

    ctx.clearRect(0, 0, W, H);
    // fond
    ctx.fillStyle = '#06080D';
    ctx.fillRect(0, 0, W, H);
    // bande nébuleuse très diluée
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(74,158,255,.05)');
    g.addColorStop(0.5, 'rgba(74,158,255,0)');
    g.addColorStop(1, 'rgba(184,150,62,.03)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // champ d'étoiles plein écran (indépendant de la caméra)
    for (const s of stars) {
      const a = Math.max(0.05, s.base + s.amp * Math.sin(t * s.sp + s.ph));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, 6.2832);
      ctx.fillStyle = s.tint;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!focusId) {
      CONST.forEach((c) => drawConst(c, false, t));
      if (hoverId) {
        ctx.fillStyle = 'rgba(6,8,13,.35)';
        ctx.fillRect(0, 0, W, H);
        const hc = CONST.find((c) => c.id === hoverId);
        if (hc) drawConst(hc, true, t);
      }
    } else {
      // voile + constellation focalisée illuminée et zoomée
      if (dim > 0.01) { ctx.fillStyle = `rgba(6,8,13,${dim})`; ctx.fillRect(0, 0, W, H); }
      const c = CONST.find((x) => x.id === focusId);
      if (c) drawConst(c, true, t);
    }

    animFrame = requestAnimationFrame(render);
  }

  /* ─────────────────────────────────────────────────────────────────────
     Chrome dynamique (eyebrow context + panneau / nom selon l'état)
     ───────────────────────────────────────────────────────────────────── */
  function rebuildChrome() {
    if (chromeEl) chromeEl.remove();
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    const focusing = !!focusId;
    const c = focusing ? CONST.find((x) => x.id === focusId) : null;
    chromeEl = jxBuildChrome({
      viewNum: '01', viewName: 'CARTE DU CIEL',
      status: 'EN LIGNE · VOIX',
      voice: focusing ? `Jarvis · <b>${c.name}</b>` : 'Jarvis · <b>affiche-moi le ciel</b>',
      context: [{ muted: true, t: focusing ? 'FOCUS · ' + c.name.toUpperCase() : 'CIEL · PARIS' },
                focusing ? null : { t: '337 étoiles' }].filter(Boolean),
      nav: focusing ? '<span class="k">esc</span> vue d\u2019ensemble'
                    : '<b>survol</b> mettre au point · <span class="k">↵</span> nommer',
    });
    container.appendChild(chromeEl);

    // overlay focus : grand nom serif + stats, bas-gauche
    if (focusing && c) {
      const o = document.createElement('div');
      Object.assign(o.style, { position: 'absolute', left: '44px', bottom: '92px', zIndex: '7',
        display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '60%' });
      o.innerHTML = `
        <div style="font-family:var(--mono,monospace);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--fg-3,rgba(220,232,255,.4))">CONSTELLATION · ${c.fr.toUpperCase()}</div>
        <div style="font-family:var(--serif,'Geist');font-weight:300;font-size:${FROZEN.nameSize}px;letter-spacing:-.04em;color:var(--fg-0,#DCE8FF);line-height:.9">${c.name}</div>
        <div style="display:flex;gap:32px;margin-top:6px;flex-wrap:wrap">
          ${c.stats.map(([l, v, u]) => `<div>
            <div style="font-family:var(--mono,monospace);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3,rgba(220,232,255,.4))">${l}</div>
            <div style="font-family:var(--serif,'Geist');font-weight:300;font-size:24px;letter-spacing:-.02em;color:var(--fg-0,#DCE8FF);margin-top:4px;font-variant-numeric:tabular-nums">${v}${u ? ' ' + u : ''}</div>
          </div>`).join('')}
        </div>`;
      container.appendChild(o);
      overlayEl = o;
    } else {
      overlayEl = null;
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Transitions d'état
     ───────────────────────────────────────────────────────────────────── */
  function focusConstellation(c) {
    focusId = c.id;
    targetDim = FROZEN.dim;
    targetZoom = 1.7;
    targetCamX = c.cx;
    targetCamY = c.cy;
    rebuildChrome();
  }
  function overview() {
    focusId = null;
    hoverId = null;
    targetDim = 0;
    targetZoom = 1;
    targetCamX = VW / 2;
    targetCamY = VH / 2;
    rebuildChrome();
  }

  /* hit-test : constellation la plus proche du clic (espace écran) */
  function constAt(sx, sy) {
    let best = null, bestD = 60 * cover;
    CONST.forEach((c) => {
      const d = Math.hypot(mapX(c.cx) - sx, mapY(c.cy) - sy);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  /* ─────────────────────────────────────────────────────────────────────
     Container
     ───────────────────────────────────────────────────────────────────── */
  function resize() {
    W = container.offsetWidth || window.innerWidth;
    H = container.offsetHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cover = Math.max(W / VW, H / VH);
  }

  function ensureContainer() {
    if (container) return;
    jxEnsureChromeCss();

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #astronomy-container { background:var(--bg-0,#06080D); overflow:hidden; }
      #astronomy-container canvas { width:100%; height:100%; display:block; cursor:crosshair; }
    `;
    document.head.appendChild(s);

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position: 'fixed', inset: '0', zIndex: '2',
      background: 'var(--bg-0,#06080D)', opacity: '0',
      transition: 'opacity .35s ease', display: 'none', overflow: 'hidden',
    });

    canvas = document.createElement('canvas');
    container.appendChild(canvas);
    document.body.appendChild(container);

    resize();
    ro = new ResizeObserver(resize);
    ro.observe(container);

    clickHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (focusId) { overview(); return; }
      const c = constAt(sx, sy);
      if (c) focusConstellation(c);
    };
    moveHandler = (e) => {
      if (focusId) { hoverId = null; return; }
      const rect = canvas.getBoundingClientRect();
      const hc = constAt(e.clientX - rect.left, e.clientY - rect.top);
      hoverId = hc ? hc.id : null;
      canvas.style.cursor = hoverId ? 'pointer' : 'crosshair';
    };
    canvas.addEventListener('click', clickHandler);
    canvas.addEventListener('mousemove', moveHandler);
    canvas.addEventListener('mouseleave', () => { hoverId = null; });
  }

  /* ─────────────────────────────────────────────────────────────────────
     Enregistrement
     ───────────────────────────────────────────────────────────────────── */
  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'Carte du ciel',
      desc: 'Voûte céleste — constellations qui s\u2019illuminent au focus, faits stellaires',
      glyph: 'SKY',
      tags: ['astronomie', 'ciel', 'constellations', 'étoiles'],
    },

    show(params = {}) {
      ensureContainer();
      if (_visible) return;
      _visible = true;

      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      stars = makeStars(FROZEN.density);
      // état initial : vue d'ensemble, sauf si une constellation est demandée
      const req = params.constellation || params.name;
      const c = req ? findConst(req) : null;
      if (c) { focusId = c.id; dim = targetDim = FROZEN.dim; zoom = targetZoom = 1.7; camX = targetCamX = c.cx; camY = targetCamY = c.cy; }
      else { focusId = null; dim = targetDim = 0; zoom = targetZoom = 1; camX = targetCamX = VW / 2; camY = targetCamY = VH / 2; }
      rebuildChrome();
      if (!animFrame) render();
    },

    hide() {
      if (!container) return;
      _visible = false;
      container.style.opacity = '0';
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      setTimeout(() => { if (!_visible && container) container.style.display = 'none'; }, 360);
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'overview':
        case 'sky':
          overview();
          break;
        case 'focus_constellation': {
          const c = findConst(params.constellation || params.name || '');
          if (c) focusConstellation(c);
          break;
        }
        // commandes inconnues ignorées silencieusement
      }
    },
  });
})();
