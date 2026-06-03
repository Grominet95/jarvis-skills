/**
 * Vue Clock — jarvis-skills
 * Horloge / Temps — parti pris « Cadran » : un anneau 24 h trace l'arc du jour
 * (lever→coucher) et la course du soleil ; l'heure locale vit au centre.
 * Une rangée de fuseaux secondaires (Tokyo · New York · Londres) se pose en bas.
 * Heure locale = horloge navigateur ; fuseaux via Intl (DST géré).
 *
 * Combinaison FIGÉE : arc OR, secondes affichées, phase lunaire masquée, grand cadran.
 * Dépend de : _shared.js. Chrome commun via <style> partagé (#jx-chrome-css).
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'clock';
  const STYLE_ID = 'clock-css';
  const NS = 'http://www.w3.org/2000/svg';

  /* ─── CHROME PARTAGÉ (identique sur les 4 vues) ─────────────────────────── */
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
    .jx-badge { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.12em; text-transform:uppercase; padding:3px 7px; border-radius:var(--r-1,4px); border:1px solid var(--line-2,rgba(220,232,255,.1)); color:var(--fg-2,rgba(220,232,255,.58)); }
    .jx-badge.gold   { color:var(--gold,#B8963E); border-color:rgba(184,150,62,.32); background:var(--gold-soft,rgba(184,150,62,.1)); }
    .jx-badge .dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
  `;
  function jxEnsureChromeCss() {
    if (document.getElementById(JX_CHROME_CSS_ID)) return;
    const s = document.createElement('style');
    s.id = JX_CHROME_CSS_ID; s.textContent = JX_CHROME_CSS;
    document.head.appendChild(s);
  }
  function jxBrandMark(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="10.5" fill="none" stroke="var(--accent,#4A9EFF)" stroke-width="1"/>
      <circle cx="13" cy="13" r="6.5" fill="none" stroke="var(--accent,#4A9EFF)" stroke-width="1" opacity=".55"/>
      <circle cx="13" cy="13" r="2" fill="var(--accent,#4A9EFF)"/></svg>`;
  }
  function jxBuildChrome(opts) {
    const c = document.createElement('div');
    c.className = 'jx-chrome';
    c.innerHTML = `
      ${opts.context ? `<div class="jx-context">${opts.context.map((x, i) =>
        (i ? '<span class="sep"></span>' : '') + `<span class="${x.muted ? 'muted' : ''}">${x.t}</span>`).join('')}</div>` : ''}
      ${opts.nav ? `<div class="jx-navhint">${opts.nav}</div>` : ''}
    `;
    return c;
  }

  /* ─── Données : lieu local + fuseaux secondaires ────────────────────────── */
  // Lieu local (pour l'arc solaire). Par défaut Paris ; ajustable via set_local.
  const LOCAL = { name: 'Paris', tz: 'Europe/Paris', lat: 48.8566, lon: 2.3522 };
  // Fuseaux secondaires figés (DST géré par Intl).
  const ZONES = [
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
    { name: 'New York', tz: 'America/New_York' },
    { name: 'Londres', tz: 'Europe/London' },
  ];

  const pad = (n) => String(n).padStart(2, '0');
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  // heure (et min) dans un fuseau IANA via Intl
  function zoneParts(tz) {
    const f = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short', day: 'numeric' });
    const o = {};
    f.formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; });
    let h = parseInt(o.hour, 10); if (h === 24) h = 0;
    return { h, m: parseInt(o.minute, 10), s: parseInt(o.second, 10), weekday: o.weekday, day: o.day };
  }
  const isDay = (h) => h >= 7 && h < 19;

  // Lever / coucher du soleil (heure locale décimale) — approximation solaire.
  function sunTimes(lat, lon) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const N = Math.floor((now - start) / 86400000);
    const rad = Math.PI / 180;
    const decl = -23.44 * Math.cos(rad * (360 / 365) * (N + 10));
    const cosH = -Math.tan(rad * lat) * Math.tan(rad * decl);
    const tzOffH = -now.getTimezoneOffset() / 60;
    const solarNoon = 12 - lon / 15 + tzOffH; // heure d'horloge du midi solaire (≈, sans équation du temps)
    if (cosH >= 1) return { sunrise: null, sunset: null, noon: solarNoon };       // nuit polaire
    if (cosH <= -1) return { sunrise: 0, sunset: 24, noon: solarNoon };            // jour polaire
    const H = Math.acos(cosH) / rad / 15; // demi-jour en heures
    return { sunrise: solarNoon - H, sunset: solarNoon + H, noon: solarNoon };
  }

  /* ─── État ──────────────────────────────────────────────────────────────── */
  let container = null, svg = null, ro = null, timer = null;
  let chromeEl = null, centerEl = null, zonesEl = null;
  let sunDot = null, sunDot2 = null, nowAt = null;
  let _visible = false, W = 0, H = 0;
  let cx = 0, cy = 0, R = 0;
  let sun = { sunrise: 7, sunset: 19, noon: 13 };

  function ptOnRing(h, rad) {
    const a = (h / 24) * 2 * Math.PI;
    return [cx - rad * Math.sin(a), cy + rad * Math.cos(a)];
  }

  /* ─── Construction du cadran (SVG) ──────────────────────────────────────── */
  function mk(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function buildRing() {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.appendChild(mk('defs', {})).innerHTML =
      '<filter id="clk-gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>';

    sun = sunTimes(LOCAL.lat, LOCAL.lon);

    // anneau de base
    svg.appendChild(mk('circle', { cx, cy, r: R, fill: 'none', stroke: 'rgba(220,232,255,.08)', 'stroke-width': 2 }));

    // arc du jour (OR) lever→coucher
    if (sun.sunrise != null && sun.sunset != null) {
      const [x0, y0] = ptOnRing(sun.sunrise, R), [x1, y1] = ptOnRing(sun.sunset, R);
      const large = (sun.sunset - sun.sunrise) > 12 ? 1 : 0;
      const d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`;
      svg.appendChild(mk('path', { d, fill: 'none', stroke: 'rgba(184,150,62,.5)', 'stroke-width': 5, 'stroke-linecap': 'round', filter: 'url(#clk-gl)' }));
      svg.appendChild(mk('path', { d, fill: 'none', stroke: 'rgba(214,196,150,.85)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    }

    // ticks horaires
    for (let h = 0; h < 24; h++) {
      const major = h % 6 === 0;
      const [ax, ay] = ptOnRing(h, R - 12), [bx, by] = ptOnRing(h, R - (major ? 26 : 18));
      svg.appendChild(mk('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: major ? 'rgba(220,232,255,.4)' : 'rgba(220,232,255,.16)', 'stroke-width': 1.5 }));
    }
    // libellés 00/06/12/18
    [[0, '00'], [6, '06'], [12, '12'], [18, '18']].forEach(([h, lbl]) => {
      const [lx, ly] = ptOnRing(h, R - 42);
      const t = mk('text', { x: lx, y: ly + 3, fill: 'rgba(220,232,255,.35)', 'font-family': 'var(--mono,monospace)', 'font-size': 11, 'text-anchor': 'middle' });
      t.textContent = lbl + 'h'; svg.appendChild(t);
    });
    // marqueurs lever / coucher
    if (sun.sunrise != null) [sun.sunrise, sun.sunset].forEach((h) => {
      const [mx, my] = ptOnRing(h, R);
      svg.appendChild(mk('circle', { cx: mx, cy: my, r: 3.5, fill: 'var(--gold,#B8963E)' }));
    });

    // soleil (halo + cœur) — position mise à jour au tick
    sunDot = mk('circle', { r: 7, fill: '#E6D08A', filter: 'url(#clk-gl)' });
    sunDot2 = mk('circle', { r: 5, fill: '#F2E6BC' });
    svg.appendChild(sunDot); svg.appendChild(sunDot2);
  }

  /* ─── Tick (1 s) ────────────────────────────────────────────────────────── */
  function tick() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    // centre
    if (centerEl) {
      centerEl.querySelector('[data-t]').textContent = pad(h) + ':' + pad(m);
      const se = centerEl.querySelector('[data-s]'); if (se) se.textContent = pad(s);
      centerEl.querySelector('[data-d]').textContent =
        DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
    }
    // soleil sur l'anneau
    const hf = h + m / 60;
    const [sx, sy] = ptOnRing(hf, R);
    if (sunDot) { sunDot.setAttribute('cx', sx); sunDot.setAttribute('cy', sy); sunDot2.setAttribute('cx', sx); sunDot2.setAttribute('cy', sy); }
    const day = isDay(h);
    if (sunDot) {
      sunDot.setAttribute('fill', day ? '#E6D08A' : 'rgba(174,196,255,.7)');
      sunDot2.setAttribute('fill', day ? '#F2E6BC' : '#C9D6F2');
    }
    // fuseaux secondaires
    if (zonesEl) {
      ZONES.forEach((z, i) => {
        const p = zoneParts(z.tz);
        const cell = zonesEl.children[i];
        if (!cell) return;
        cell.querySelector('[data-zt]').textContent = pad(p.h) + ':' + pad(p.m);
        const dn = isDay(p.h);
        const dot = cell.querySelector('[data-zd]');
        dot.style.background = dn ? 'var(--gold,#B8963E)' : 'rgba(174,196,255,.7)';
        dot.style.boxShadow = dn ? '0 0 6px var(--gold,#B8963E)' : '0 0 6px rgba(174,196,255,.5)';
        cell.querySelector('[data-zl]').textContent = dn ? 'jour' : 'nuit';
      });
    }
  }

  /* ─── Chrome + overlays ─────────────────────────────────────────────────── */
  function buildOverlays() {
    [chromeEl, centerEl, zonesEl].forEach((e) => e && e.remove());
    chromeEl = jxBuildChrome({
      viewNum: '03', viewName: 'TEMPS',
      voice: 'Jarvis · <b>quelle heure il est</b>',
      context: [{ muted: true, t: LOCAL.name.toUpperCase() + ' · HEURE LOCALE' }],
      nav: '<span class="k">↵</span> fuseaux · <b>dis</b> une ville',
    });
    container.appendChild(chromeEl);

    // centre : heure + secondes + date
    centerEl = document.createElement('div');
    Object.assign(centerEl.style, { position: 'absolute', left: '0', right: '0', top: cy + 'px', transform: 'translateY(-50%)', textAlign: 'center', zIndex: '7', pointerEvents: 'none' });
    centerEl.innerHTML = `
      <div data-t style="font-family:var(--serif,'Geist');font-weight:300;font-size:${Math.round(R * 0.46)}px;letter-spacing:-.04em;color:var(--fg-0,#DCE8FF);line-height:.92;font-variant-numeric:tabular-nums">00:00</div>
      <div data-s style="font-family:var(--mono,monospace);font-size:16px;letter-spacing:.3em;color:var(--accent,#4A9EFF);margin-top:4px;font-variant-numeric:tabular-nums">00</div>
      <div data-d style="font-family:var(--serif,'Geist');font-weight:300;font-size:20px;color:var(--fg-1,rgba(220,232,255,.78));margin-top:12px">—</div>`;
    container.appendChild(centerEl);

    // fuseaux secondaires (bas-centre)
    zonesEl = document.createElement('div');
    Object.assign(zonesEl.style, { position: 'absolute', left: '50%', bottom: '74px', transform: 'translateX(-50%)', zIndex: '7', display: 'flex', gap: '14px' });
    zonesEl.innerHTML = ZONES.map((z) => `
      <div style="min-width:148px;background:rgba(10,14,22,.6);border:1px solid var(--line-2,rgba(220,232,255,.1));border-radius:var(--r-3,12px);padding:12px 16px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:12px;color:var(--fg-1,rgba(220,232,255,.78))">${z.name}</span>
          <span style="display:flex;align-items:center;gap:6px;font-family:var(--mono,monospace);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg-3,rgba(220,232,255,.4))"><span data-zd style="width:6px;height:6px;border-radius:50%"></span><span data-zl>—</span></span>
        </div>
        <div data-zt style="font-family:var(--serif,'Geist');font-weight:300;font-size:30px;letter-spacing:-.02em;color:var(--fg-0,#DCE8FF);margin-top:6px;font-variant-numeric:tabular-nums">00:00</div>
      </div>`).join('');
    container.appendChild(zonesEl);
  }

  /* ─── Container ─────────────────────────────────────────────────────────── */
  function layout() {
    W = container.offsetWidth || window.innerWidth;
    H = container.offsetHeight || window.innerHeight;
    cx = W / 2;
    cy = H * 0.44;
    R = Math.min(W, H) * 0.32; // grand cadran
  }
  function rebuildAll() { layout(); buildRing(); buildOverlays(); tick(); }

  function ensureContainer() {
    if (container) return;
    jxEnsureChromeCss();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `#clock-container { background:var(--bg-0,#06080D); overflow:hidden; }
      #clock-container .clk-svg { position:absolute; inset:0; width:100%; height:100%; z-index:1; }
      #clock-container .clk-atmo { position:absolute; inset:0; z-index:0; pointer-events:none;
        background: radial-gradient(60% 50% at 50% 42%, rgba(74,158,255,.05), transparent 70%); }`;
    document.head.appendChild(s);

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, { position: 'fixed', inset: '0', zIndex: '2', background: 'var(--bg-0,#06080D)', opacity: '0', transition: 'opacity .35s ease', display: 'none', overflow: 'hidden' });
    const atmo = document.createElement('div'); atmo.className = 'clk-atmo'; container.appendChild(atmo);
    svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'clk-svg'); container.appendChild(svg);
    document.body.appendChild(container);

    ro = new ResizeObserver(() => { if (_visible) rebuildAll(); });
    ro.observe(container);
  }

  /* ─── Enregistrement ────────────────────────────────────────────────────── */
  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'Clock',
      desc: 'Horloge solaire — cadran 24 h, course du soleil, fuseaux Tokyo/NY/Londres',
      glyph: 'TPS',
      tags: ['horloge', 'temps', 'fuseaux', 'soleil'],
    },

    show(params = {}) {
      ensureContainer();
      if (_visible) return;
      _visible = true;
      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      rebuildAll();
      if (!timer) timer = setInterval(tick, 1000);
    },

    hide() {
      if (!container) return;
      _visible = false;
      container.style.opacity = '0';
      if (timer) { clearInterval(timer); timer = null; }
      setTimeout(() => { if (!_visible && container) container.style.display = 'none'; }, 360);
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'local':
          // recentre sur l'heure locale (rien à changer : le cadran est local)
          if (_visible) tick();
          break;
        case 'show_timezone':
        case 'add_timezone': {
          // met en avant un fuseau secondaire connu (surligne sa carte)
          const name = (params.city || params.name || '').toLowerCase();
          if (!zonesEl) break;
          ZONES.forEach((z, i) => {
            const hit = z.name.toLowerCase().includes(name) || z.tz.toLowerCase().includes(name);
            const cell = zonesEl.children[i];
            if (cell) {
              cell.style.borderColor = hit ? 'var(--accent-line,rgba(74,158,255,.3))' : 'var(--line-2,rgba(220,232,255,.1))';
              cell.style.background = hit ? 'var(--accent-soft,rgba(74,158,255,.1))' : 'rgba(10,14,22,.6)';
            }
          });
          break;
        }
        // commandes inconnues ignorées silencieusement
      }
    },
  });
})();
