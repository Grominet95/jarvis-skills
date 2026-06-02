/**
 * Vue System Monitor — jarvis-skills
 * Dashboard cockpit temps réel : CPU, RAM, disque, cerveau LLM, services Jarvis.
 * Dépend de : _shared.js (Jarvis.views doit être chargé avant ce fichier)
 * Cross-platform : la batterie est masquée si null (Windows desktop sans batterie).
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID  = 'system-monitor';
  const STYLE_ID = 'sm-styles';
  const PERF_MS  = 1500;   // polling /api/system/perf
  const SLOW_MS  = 7000;   // polling stats / proactive / llm-status
  const HIST_LEN = 60;     // points historique sparkline (en mémoire JS uniquement)

  // ── État interne ────────────────────────────────────────────────────────────
  let container   = null;
  let perfTimer   = null;
  let slowTimer   = null;
  let clockTimer  = null;
  let _visible    = false;
  let _domBuilt   = false;

  // Historique des courbes (pas de localStorage — variables JS uniquement)
  const hist = {
    cpu: new Array(HIST_LEN).fill(0),
    ram: new Array(HIST_LEN).fill(0),
  };

  // Références aux arcs SVG des jauges
  const rings = { cpu: null, ram: null, disk: null };

  // ── CSS ─────────────────────────────────────────────────────────────────────

  const CSS = `
    #system-monitor-container {
      font-family: var(--sans, "Geist", "Inter", system-ui, sans-serif);
      color: var(--fg-1, rgba(220,232,255,.78));
    }
    .sm-wrap {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      position: relative;
      background: var(--bg-0, #06080D);
    }

    /* ── Scanline (animation subtile) ── */
    .sm-scanline {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
      overflow: hidden;
    }
    .sm-scanline::after {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: 90px;
      background: linear-gradient(to bottom,
        transparent 0%,
        rgba(74,158,255,.018) 50%,
        transparent 100%);
      animation: sm-scan 7s linear infinite;
    }
    @keyframes sm-scan {
      from { transform: translateY(-90px); }
      to   { transform: translateY(calc(100vh + 90px)); }
    }

    /* ── Header ── */
    .sm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      height: 54px;
      border-bottom: 1px solid var(--line-1, rgba(220,232,255,.06));
      background: rgba(6,8,13,.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      flex-shrink: 0;
      position: relative;
      z-index: 2;
    }
    .sm-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sm-glyph {
      font-family: var(--mono, "Geist Mono", monospace);
      font-size: 9px;
      letter-spacing: 0.24em;
      color: var(--accent, #4A9EFF);
      background: rgba(74,158,255,.12);
      border: 1px solid rgba(74,158,255,.28);
      padding: 3px 10px;
      border-radius: 4px;
    }
    .sm-title {
      font-size: 16px;
      font-weight: 300;
      letter-spacing: -0.025em;
      color: rgba(220,232,255,.9);
    }
    .sm-hdr-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .sm-uptime-hdr {
      font-family: var(--mono, monospace);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: rgba(220,232,255,.32);
      font-variant-numeric: tabular-nums;
    }
    .sm-live {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .sm-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #36D399;
      box-shadow: 0 0 8px rgba(54,211,153,.55);
      animation: sm-pulse 2.4s ease-in-out infinite;
    }
    .sm-live-lbl {
      font-family: var(--mono, monospace);
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #36D399;
    }
    .sm-clock {
      font-family: var(--mono, "Geist Mono", monospace);
      font-size: 11px;
      letter-spacing: 0.08em;
      color: rgba(220,232,255,.36);
      font-variant-numeric: tabular-nums;
      min-width: 68px;
      text-align: right;
    }

    /* ── Layout ── */
    .sm-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .sm-row-top {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1.2fr;
      overflow: hidden;
      border-bottom: 1px solid var(--line-1, rgba(220,232,255,.06));
    }
    .sm-row-bot {
      height: 118px;
      display: grid;
      grid-template-columns: 1fr auto;
      flex-shrink: 0;
    }

    /* ── Metric panels ── */
    .sm-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 12px 14px;
      border-right: 1px solid var(--line-1, rgba(220,232,255,.06));
      position: relative;
      overflow: hidden;
      gap: 0;
      transition: background .3s ease;
    }
    .sm-panel:last-child { border-right: none; }

    /* Focus : bordure bleue + léger fond */
    .sm-panel.sm-focused {
      background: rgba(74,158,255,.035);
    }
    .sm-panel.sm-focused::before {
      content: '';
      position: absolute;
      inset: 0;
      border: 1px solid rgba(74,158,255,.24);
      pointer-events: none;
      opacity: 0;
      animation: sm-focus-in .35s ease forwards;
    }
    @keyframes sm-focus-in {
      to { opacity: 1; }
    }
    .sm-panel-label {
      position: absolute;
      top: 13px;
      left: 16px;
      font-family: var(--mono, monospace);
      font-size: 8.5px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: rgba(220,232,255,.28);
    }

    /* ── Jauge SVG (anneau) ── */
    .sm-ring-wrap {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }
    .sm-ring-wrap svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .sm-ring-val {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .sm-ring-pct {
      font-family: var(--mono, monospace);
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.04em;
      color: rgba(220,232,255,.92);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .sm-ring-unit {
      font-family: var(--mono, monospace);
      font-size: 9px;
      letter-spacing: 0.16em;
      color: rgba(220,232,255,.28);
      text-transform: uppercase;
      margin-top: 3px;
    }
    /* Arcs SVG */
    .sm-ring-track {
      fill: none;
      stroke: rgba(220,232,255,.05);
      stroke-linecap: round;
    }
    .sm-ring-arc {
      fill: none;
      stroke-linecap: round;
      transition: stroke-dasharray .7s cubic-bezier(.4,0,.2,1);
    }
    .sm-ring-glow {
      fill: none;
      stroke-linecap: round;
      opacity: .14;
      stroke-width: 16;
      transition: stroke-dasharray .7s cubic-bezier(.4,0,.2,1);
    }
    .sm-arc-cpu  { stroke: var(--accent, #4A9EFF); }
    .sm-arc-ram  { stroke: #A78BFA; }
    .sm-arc-disk { stroke: #B8963E; }

    .sm-ring-sub {
      font-family: var(--mono, monospace);
      font-size: 10px;
      color: rgba(220,232,255,.3);
      letter-spacing: 0.04em;
      text-align: center;
      margin-top: 8px;
    }

    /* ── Sparkline (Canvas) ── */
    .sm-spark-wrap {
      width: 120px;
      height: 26px;
      margin-top: 8px;
      flex-shrink: 0;
    }
    .sm-spark {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* ── Panneau Cerveau Jarvis ── */
    .sm-brain {
      display: flex;
      flex-direction: column;
      padding: 36px 20px 16px;
      align-items: flex-start;
      justify-content: center;
      gap: 0;
      border-right: none;
    }
    .sm-brain-section { width: 100%; }
    .sm-brain-eyebrow {
      font-family: var(--mono, monospace);
      font-size: 8.5px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(220,232,255,.22);
      margin-bottom: 7px;
    }
    .sm-brain-row {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
    }
    .sm-brain-provider {
      font-size: 15px;
      font-weight: 500;
      color: rgba(220,232,255,.9);
      letter-spacing: -0.015em;
    }
    .sm-badge-local {
      font-family: var(--mono, monospace);
      font-size: 7.5px;
      letter-spacing: 0.2em;
      padding: 2px 8px;
      border-radius: 3px;
      background: rgba(54,211,153,.12);
      border: 1px solid rgba(54,211,153,.28);
      color: #36D399;
      flex-shrink: 0;
    }
    .sm-badge-cloud {
      font-family: var(--mono, monospace);
      font-size: 7.5px;
      letter-spacing: 0.2em;
      padding: 2px 8px;
      border-radius: 3px;
      background: rgba(74,158,255,.1);
      border: 1px solid rgba(74,158,255,.24);
      color: var(--accent, #4A9EFF);
      flex-shrink: 0;
    }
    .sm-brain-model {
      font-family: var(--mono, monospace);
      font-size: 11px;
      color: rgba(220,232,255,.42);
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .sm-brain-div {
      height: 1px;
      background: rgba(220,232,255,.06);
      margin: 14px 0;
      width: 100%;
    }
    .sm-brain-routes {
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
    }
    .sm-brain-route {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .sm-brain-route-key {
      font-family: var(--mono, monospace);
      font-size: 9.5px;
      color: rgba(220,232,255,.28);
      letter-spacing: 0.06em;
      flex-shrink: 0;
    }
    .sm-brain-route-val {
      font-family: var(--mono, monospace);
      font-size: 9.5px;
      color: rgba(220,232,255,.58);
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }

    /* ── Ligne du bas — Services ── */
    .sm-services {
      display: flex;
      align-items: stretch;
      border-right: 1px solid var(--line-1, rgba(220,232,255,.06));
      overflow: hidden;
    }
    .sm-svc-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 0 22px;
      gap: 3px;
      flex: 1;
      min-width: 0;
      border-right: 1px solid rgba(220,232,255,.04);
    }
    .sm-svc-cell:last-child { border-right: none; }
    .sm-svc-label {
      font-family: var(--mono, monospace);
      font-size: 8.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(220,232,255,.22);
    }
    .sm-svc-val {
      font-size: 15px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: rgba(220,232,255,.88);
      white-space: nowrap;
    }
    .sm-svc-val-green { color: #36D399; }
    .sm-svc-val-off   { color: rgba(220,232,255,.36); }
    .sm-svc-sub {
      font-family: var(--mono, monospace);
      font-size: 9px;
      color: rgba(220,232,255,.26);
      white-space: nowrap;
    }

    /* Barre batterie */
    .sm-bat-bar-bg {
      width: 48px;
      height: 4px;
      background: rgba(220,232,255,.06);
      border-radius: 2px;
      overflow: hidden;
    }
    .sm-bat-bar-fg {
      height: 100%;
      border-radius: 2px;
      background: #36D399;
      transition: width .55s ease, background .3s ease;
    }
    .sm-bat-warn { background: #B8963E; }
    .sm-bat-crit { background: #E5484D; }

    /* ── Ligne du bas — Process Jarvis ── */
    .sm-process {
      display: flex;
      align-items: stretch;
      flex-shrink: 0;
    }
    .sm-proc-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 0 24px;
      gap: 3px;
      border-left: 1px solid rgba(220,232,255,.04);
    }
    .sm-proc-label {
      font-family: var(--mono, monospace);
      font-size: 8.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(220,232,255,.22);
    }
    .sm-proc-val {
      font-size: 15px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
      color: rgba(220,232,255,.88);
    }
    .sm-proc-sub {
      font-family: var(--mono, monospace);
      font-size: 9px;
      color: rgba(220,232,255,.26);
    }

    /* ── Animations globales ── */
    @keyframes sm-pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(54,211,153,.55); }
      50%       { opacity: .5; box-shadow: 0 0 4px rgba(54,211,153,.2); }
    }
  `;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Jauges SVG (anneaux) ─────────────────────────────────────────────────

  const R_SZ   = 120;                         // taille du SVG en px
  const R_SW   = 9;                           // stroke-width de l'arc
  const R_GLOW = 16;                          // stroke-width du glow
  const R_RAD  = R_SZ / 2 - R_SW / 2 - 1;   // rayon de l'arc ≈ 54.5
  const R_CIRC = 2 * Math.PI * R_RAD;        // circonférence ≈ 342.6

  function mkRing(arcClass) {
    const ns = 'http://www.w3.org/2000/svg';
    const c  = R_SZ / 2;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${R_SZ} ${R_SZ}`);

    function mkEl(tag, attrs) {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    }

    // Piste (fond)
    const track = mkEl('circle', {
      cx: c, cy: c, r: R_RAD,
      'stroke-width': R_SW,
      class: 'sm-ring-track',
    });
    svg.appendChild(track);

    // Halo (glow)
    const glow = mkEl('circle', {
      cx: c, cy: c, r: R_RAD,
      'stroke-width': R_GLOW,
      class: `sm-ring-glow ${arcClass}`,
      'stroke-dasharray': `0 ${R_CIRC}`,
      transform: `rotate(-90, ${c}, ${c})`,
    });
    svg.appendChild(glow);

    // Arc principal
    const arc = mkEl('circle', {
      cx: c, cy: c, r: R_RAD,
      'stroke-width': R_SW,
      class: `sm-ring-arc ${arcClass}`,
      'stroke-dasharray': `0 ${R_CIRC}`,
      transform: `rotate(-90, ${c}, ${c})`,
    });
    svg.appendChild(arc);

    return { svg, arc, glow };
  }

  function setRing(ring, pct) {
    if (!ring) return;
    const p    = Math.max(0, Math.min(100, pct || 0));
    const dash = ((p / 100) * R_CIRC).toFixed(2);
    const gap  = (R_CIRC - dash).toFixed(2);
    const val  = `${dash} ${gap}`;
    ring.arc.setAttribute('stroke-dasharray', val);
    ring.glow.setAttribute('stroke-dasharray', val);
  }

  // ── Sparklines (Canvas 2D) ───────────────────────────────────────────────

  function drawSpark(canvas, data, stroke, fillRgba) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.offsetWidth  || 120;
    const h   = canvas.offsetHeight || 26;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const n = data.length;
    if (n < 2) return;

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = h - (data[i] / 100) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Remplissage en dégradé
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillRgba;
    ctx.fill();
  }

  // ── Construction du DOM ──────────────────────────────────────────────────

  function ensureContainer() {
    if (container) return;
    injectStyle();
    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position:   'fixed',
      inset:      '0',
      zIndex:     '2',
      display:    'none',
      opacity:    '0',
      transition: 'opacity .35s ease',
    });
    document.body.appendChild(container);
  }

  function buildDOM() {
    container.innerHTML = `
      <div class="sm-wrap">
        <div class="sm-scanline"></div>

        <header class="sm-header">
          <div class="sm-brand">
            <span class="sm-glyph">SYS</span>
            <span class="sm-title">System Monitor</span>
          </div>
          <div class="sm-hdr-right">
            <span class="sm-uptime-hdr" id="sm-uptime">UPTIME —</span>
            <div class="sm-live">
              <span class="sm-live-dot"></span>
              <span class="sm-live-lbl">Live</span>
            </div>
            <span class="sm-clock" id="sm-clock"></span>
          </div>
        </header>

        <div class="sm-body">
          <div class="sm-row-top">

            <!-- CPU -->
            <div class="sm-panel" id="sm-panel-cpu">
              <span class="sm-panel-label">CPU</span>
              <div class="sm-ring-wrap" id="sm-rw-cpu">
                <div class="sm-ring-val">
                  <span class="sm-ring-pct" id="sm-v-cpu">0</span>
                  <span class="sm-ring-unit">%</span>
                </div>
              </div>
              <div class="sm-ring-sub" id="sm-s-cpu">— cœurs · — threads</div>
              <div class="sm-spark-wrap">
                <canvas id="sm-spark-cpu" class="sm-spark"></canvas>
              </div>
            </div>

            <!-- RAM -->
            <div class="sm-panel" id="sm-panel-ram">
              <span class="sm-panel-label">RAM</span>
              <div class="sm-ring-wrap" id="sm-rw-ram">
                <div class="sm-ring-val">
                  <span class="sm-ring-pct" id="sm-v-ram">0</span>
                  <span class="sm-ring-unit">%</span>
                </div>
              </div>
              <div class="sm-ring-sub" id="sm-s-ram">— / — Go</div>
              <div class="sm-spark-wrap">
                <canvas id="sm-spark-ram" class="sm-spark"></canvas>
              </div>
            </div>

            <!-- Disque -->
            <div class="sm-panel" id="sm-panel-disk">
              <span class="sm-panel-label">DISQUE</span>
              <div class="sm-ring-wrap" id="sm-rw-disk">
                <div class="sm-ring-val">
                  <span class="sm-ring-pct" id="sm-v-disk">0</span>
                  <span class="sm-ring-unit">%</span>
                </div>
              </div>
              <div class="sm-ring-sub" id="sm-s-disk">— / — Go</div>
            </div>

            <!-- Cerveau Jarvis -->
            <div class="sm-panel sm-brain" id="sm-panel-llm">
              <span class="sm-panel-label">Cerveau Jarvis</span>
              <div class="sm-brain-section">
                <div class="sm-brain-eyebrow">Provider LLM actif</div>
                <div class="sm-brain-row">
                  <span class="sm-brain-provider" id="sm-llm-provider">—</span>
                  <span id="sm-llm-badge" style="display:none"></span>
                </div>
                <div class="sm-brain-model" id="sm-llm-model">—</div>
              </div>
              <div class="sm-brain-div"></div>
              <div class="sm-brain-section">
                <div class="sm-brain-eyebrow">Routes actives</div>
                <div class="sm-brain-routes" id="sm-llm-routes">
                  <div class="sm-brain-route">
                    <span class="sm-brain-route-key">—</span>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- /sm-row-top -->

          <div class="sm-row-bot">

            <!-- Services -->
            <div class="sm-services" id="sm-panel-missions">
              <div class="sm-svc-cell">
                <span class="sm-svc-label">Moteur proactif</span>
                <span class="sm-svc-val" id="sm-svc-proactive">—</span>
              </div>
              <div class="sm-svc-cell">
                <span class="sm-svc-label">Missions</span>
                <span class="sm-svc-val" id="sm-svc-missions">—</span>
                <span class="sm-svc-sub" id="sm-svc-missions-sub"></span>
              </div>
              <div class="sm-svc-cell">
                <span class="sm-svc-label">Mémoire</span>
                <span class="sm-svc-val" id="sm-svc-mem">—</span>
                <span class="sm-svc-sub" id="sm-svc-mem-sub"></span>
              </div>
              <div class="sm-svc-cell">
                <span class="sm-svc-label">Sessions</span>
                <span class="sm-svc-val" id="sm-svc-sessions">—</span>
              </div>
              <!-- Batterie : masquée si null (Windows desktop sans batterie) -->
              <div class="sm-svc-cell" id="sm-bat-cell" style="display:none">
                <span class="sm-svc-label">Batterie</span>
                <span class="sm-svc-val" id="sm-svc-bat">—</span>
                <div class="sm-bat-bar-bg">
                  <div class="sm-bat-bar-fg" id="sm-bat-bar"></div>
                </div>
              </div>
            </div>

            <!-- Process Jarvis -->
            <div class="sm-process">
              <div class="sm-proc-cell">
                <span class="sm-proc-label">Processus Jarvis</span>
                <span class="sm-proc-val" id="sm-proc-cpu">—</span>
                <span class="sm-proc-sub">CPU</span>
              </div>
              <div class="sm-proc-cell">
                <span class="sm-proc-label">&nbsp;</span>
                <span class="sm-proc-val" id="sm-proc-ram">—</span>
                <span class="sm-proc-sub">RAM</span>
              </div>
            </div>

          </div><!-- /sm-row-bot -->
        </div><!-- /sm-body -->
      </div><!-- /sm-wrap -->
    `;

    // Injecter les SVG rings dans leurs wrappers
    function injectRing(wrapId, ring) {
      const wrap = document.getElementById(wrapId);
      if (wrap) wrap.insertBefore(ring.svg, wrap.firstChild);
    }

    rings.cpu  = mkRing('sm-arc-cpu');
    rings.ram  = mkRing('sm-arc-ram');
    rings.disk = mkRing('sm-arc-disk');
    injectRing('sm-rw-cpu',  rings.cpu);
    injectRing('sm-rw-ram',  rings.ram);
    injectRing('sm-rw-disk', rings.disk);

    _domBuilt = true;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function fmtUptime(s) {
    if (s == null) return '—';
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}j ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function apiFetch(path) {
    return fetch(window.location.origin + path).then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  // ── Mise à jour des données ──────────────────────────────────────────────

  function updatePerf(d) {
    if (!d) return;

    // CPU
    const cpu = d.cpu_pct ?? 0;
    hist.cpu.shift(); hist.cpu.push(cpu);
    setText('sm-v-cpu', Math.round(cpu));
    setRing(rings.cpu, cpu);
    if (d.cpu_cores != null) {
      setText('sm-s-cpu', `${d.cpu_cores} cœurs · ${d.cpu_threads ?? '—'} threads`);
    }

    // RAM
    const ram = d.ram_pct ?? 0;
    hist.ram.shift(); hist.ram.push(ram);
    setText('sm-v-ram', Math.round(ram));
    setRing(rings.ram, ram);
    if (d.ram_used_gb != null && d.ram_total_gb != null) {
      setText('sm-s-ram', `${d.ram_used_gb.toFixed(1)} / ${d.ram_total_gb.toFixed(1)} Go`);
    }

    // Disque (champs possibles selon la version de l'API)
    const diskPct = d.disk_pct ?? d.disk_used_pct ?? 0;
    setText('sm-v-disk', Math.round(diskPct));
    setRing(rings.disk, diskPct);
    const du = d.disk_used_gb ?? d.disk_used;
    const dt = d.disk_total_gb ?? d.disk_total;
    if (du != null && dt != null) {
      setText('sm-s-disk',
        `${Number(du).toFixed(0)} / ${Number(dt).toFixed(0)} Go`);
    }

    // Uptime
    if (d.uptime_s != null) setText('sm-uptime', `UPTIME ${fmtUptime(d.uptime_s)}`);

    // Process Jarvis (premier process de la liste ou objet simple)
    const proc = Array.isArray(d.proc) ? d.proc[0] : d.proc;
    if (proc) {
      setText('sm-proc-cpu', proc.cpu_pct != null
        ? `${proc.cpu_pct.toFixed(1)} %` : '—');
      setText('sm-proc-ram', proc.ram_mb != null
        ? `${Math.round(proc.ram_mb)} Mo` : '—');
    }

    // Batterie — uniquement si présente (peut être null sur Windows desktop)
    const bat    = d.battery;
    const batCell = document.getElementById('sm-bat-cell');
    if (bat && batCell) {
      batCell.style.display = '';
      const pct = bat.percent ?? bat.pct ?? null;
      if (pct != null) {
        setText('sm-svc-bat', `${Math.round(pct)} %`);
        const bar = document.getElementById('sm-bat-bar');
        if (bar) {
          bar.style.width = `${Math.min(100, pct)}%`;
          bar.className = 'sm-bat-bar-fg' +
            (pct < 15 ? ' sm-bat-crit' : pct < 30 ? ' sm-bat-warn' : '');
        }
      }
    } else if (batCell) {
      batCell.style.display = 'none';
    }

    // Sparklines (après layout pour avoir offsetWidth)
    requestAnimationFrame(() => {
      drawSpark(
        document.getElementById('sm-spark-cpu'),
        hist.cpu, '#4A9EFF', 'rgba(74,158,255,.08)',
      );
      drawSpark(
        document.getElementById('sm-spark-ram'),
        hist.ram, '#A78BFA', 'rgba(167,139,250,.08)',
      );
    });
  }

  function updateStats(d) {
    if (!d) return;

    const p = d.projects;
    if (p) {
      const running = p.running ?? 0;
      setText('sm-svc-missions', `${running}`);
      if (p.total != null) {
        setText('sm-svc-missions-sub',
          `${p.done ?? 0} terminées / ${p.total} total`);
      }
    }

    const m = d.memory;
    if (m) {
      setText('sm-svc-mem', m.topics != null ? `${m.topics} sujets` : '—');
      if (m.size_kb != null) {
        setText('sm-svc-mem-sub', `${(m.size_kb / 1024).toFixed(1)} Mo`);
      }
    }

    const sess = d.sessions;
    if (sess && sess.total != null) {
      const sessTxt = sess.size_mb != null
        ? `${sess.total} (${sess.size_mb.toFixed(1)} Mo)`
        : `${sess.total}`;
      setText('sm-svc-sessions', sessTxt);
    }
  }

  function updateProactive(d) {
    if (!d) return;
    const el = document.getElementById('sm-svc-proactive');
    if (!el) return;
    const active = d.running ?? d.enabled ?? d.active ?? (d.status === 'running');
    el.textContent = active ? 'Actif' : 'Inactif';
    el.className   = 'sm-svc-val ' + (active ? 'sm-svc-val-green' : 'sm-svc-val-off');
  }

  function updateLLM(d) {
    if (!d) return;

    const LOCAL_KW = ['ollama', 'lmstudio', 'lm_studio', 'llamacpp', 'llama_cpp',
      'mistral.rs', 'vllm', 'local'];
    const ROUTE_KEYS = ['gateway', 'voice', 'worker', 'main', 'default'];

    let provider = null;
    let model    = null;
    let isLocal  = false;
    const routes = [];

    // Réponse structurée par route
    let hasRoutes = false;
    for (const key of ROUTE_KEYS) {
      const r = d[key];
      if (r && typeof r === 'object') {
        hasRoutes = true;
        if (!provider) {
          provider = r.provider ?? r.class ?? r.name ?? null;
          model    = r.model ?? r.model_id ?? null;
        }
        const pName = (r.provider ?? r.class ?? r.name ?? key);
        const mName = r.model ?? r.model_id ?? '?';
        routes.push({ key, val: `${pName} / ${mName}` });
      }
    }

    // Réponse plate { provider, model, class }
    if (!hasRoutes) {
      provider = d.provider ?? d.class ?? d.name ?? null;
      model    = d.model    ?? d.model_id          ?? null;
    }

    if (!provider) return;

    isLocal = LOCAL_KW.some(k => String(provider).toLowerCase().includes(k));

    const provEl = document.getElementById('sm-llm-provider');
    if (provEl) provEl.textContent = provider;

    const modelEl = document.getElementById('sm-llm-model');
    if (modelEl) modelEl.textContent = model || '—';

    const badgeEl = document.getElementById('sm-llm-badge');
    if (badgeEl) {
      badgeEl.style.display = '';
      badgeEl.className     = isLocal ? 'sm-badge-local' : 'sm-badge-cloud';
      badgeEl.textContent   = isLocal ? 'LOCAL' : 'CLOUD';
    }

    const routesEl = document.getElementById('sm-llm-routes');
    if (routesEl && routes.length > 0) {
      routesEl.innerHTML = routes.map(r =>
        `<div class="sm-brain-route">
          <span class="sm-brain-route-key">${esc(r.key)}</span>
          <span class="sm-brain-route-val">${esc(r.val)}</span>
        </div>`,
      ).join('');
    }
  }

  // ── Fetch ────────────────────────────────────────────────────────────────

  async function fetchPerf() {
    try { updatePerf(await apiFetch('/api/system/perf')); } catch (_) {}
  }

  async function fetchSlow() {
    const [statsR, proactiveR, llmR] = await Promise.allSettled([
      apiFetch('/api/system/stats'),
      apiFetch('/api/proactive/status'),
      apiFetch('/api/config/llm-status'),
    ]);
    if (statsR.status     === 'fulfilled') updateStats(statsR.value);
    if (proactiveR.status === 'fulfilled') updateProactive(proactiveR.value);
    if (llmR.status       === 'fulfilled') updateLLM(llmR.value);
  }

  // ── Timers ────────────────────────────────────────────────────────────────

  function startPolling() {
    stopPolling();
    fetchPerf();
    fetchSlow();
    perfTimer = setInterval(fetchPerf, PERF_MS);
    slowTimer = setInterval(fetchSlow, SLOW_MS);
  }

  function stopPolling() {
    clearInterval(perfTimer); perfTimer = null;
    clearInterval(slowTimer); slowTimer = null;
  }

  function startClock() {
    stopClock();
    const tick = () => {
      const el = document.getElementById('sm-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    };
    tick();
    clockTimer = setInterval(tick, 1000);
  }

  function stopClock() {
    clearInterval(clockTimer); clockTimer = null;
  }

  // ── Focus métrique ────────────────────────────────────────────────────────

  const FOCUS_MAP = {
    cpu:      'sm-panel-cpu',
    ram:      'sm-panel-ram',
    disk:     'sm-panel-disk',
    llm:      'sm-panel-llm',
    missions: 'sm-panel-missions',
  };

  function setFocus(metric) {
    document.querySelectorAll('.sm-panel.sm-focused').forEach(el => {
      el.classList.remove('sm-focused');
    });
    if (!metric) return;
    const panelId = FOCUS_MAP[String(metric).toLowerCase()];
    if (!panelId) return;
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add('sm-focused');
  }

  // ── Enregistrement de la vue ─────────────────────────────────────────────

  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'System Monitor',
      desc: 'Dashboard système temps réel — CPU, RAM, disque, cerveau LLM',
      glyph: 'SYS',
      tags: ['système', 'monitoring', 'dashboard', 'performance'],
    },

    show(params = {}) {
      ensureContainer();
      if (_visible) return;
      _visible = true;

      if (!_domBuilt) buildDOM();

      container.style.display = 'block';
      container.getBoundingClientRect(); // force reflow avant la transition
      container.style.opacity = '1';

      startClock();
      startPolling();
    },

    hide() {
      if (!container) return;
      _visible = false;
      container.style.opacity = '0';
      stopPolling();
      stopClock();
      setTimeout(() => {
        if (!_visible && container) container.style.display = 'none';
      }, 360);
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'show':
          this.show(params);
          break;

        case 'hide':
          this.hide();
          break;

        case 'focus_metric': {
          if (!_visible) this.show({});
          setFocus(params.metric || null);
          break;
        }

        case 'refresh':
          fetchPerf();
          fetchSlow();
          break;

        // Commandes inconnues ignorées silencieusement
      }
    },
  });

})();
