/**
 * Vue Memory Map — jarvis-skills
 * Enregistre la vue "memory-map" dans Jarvis.views.
 * Dépend de : _shared.js (Jarvis.views, CSS variables)
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'memory-map';

  let container = null;
  let _built = false;
  let _state = { topics: [], selectedTopic: null };

  // ── CSS ───────────────────────────────────────────────────────────────────

  const CSS = `
    #memory-map-container {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      background: var(--bg-0, #0a0a0f);
      color: var(--fg-1, #e0e0e0);
    }

    #mm-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 54px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 32px;
      border-bottom: 1px solid var(--line-1, rgba(255,255,255,.07));
      background: rgba(10,10,15,.92);
      backdrop-filter: blur(12px);
      z-index: 3;
    }
    #mm-header-left {
      display: flex; align-items: center; gap: 14px;
    }
    #mm-title {
      font-size: 10px;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: var(--accent, #3b82f6);
      font-weight: 700;
    }
    #mm-badge {
      font-size: 9px;
      letter-spacing: .1em;
      background: rgba(59,130,246,.12);
      border: 1px solid rgba(59,130,246,.25);
      color: var(--accent, #3b82f6);
      padding: 2px 8px;
      border-radius: 3px;
    }
    #mm-stats {
      font-size: 10px;
      letter-spacing: .07em;
      color: rgba(224,224,224,.35);
    }

    #mm-body {
      position: absolute;
      inset: 54px 0 0 0;
      overflow: hidden;
    }

    #mm-graph {
      position: absolute;
      inset: 0;
    }
    #mm-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #mm-nodes {
      position: absolute;
      inset: 0;
    }

    .mm-node {
      position: absolute;
      transform: translate(-50%, -50%);
      cursor: default;
      transition: transform .2s ease;
    }
    .mm-node-topic { cursor: pointer; }
    .mm-node-topic:hover { transform: translate(-50%,-50%) scale(1.1); }

    .mm-node-inner {
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      text-align: center;
      font-weight: 700;
      line-height: 1.2;
      transition: box-shadow .3s ease, background .3s ease, border-color .3s ease;
    }

    .mm-node-center .mm-node-inner {
      width: 100px; height: 100px;
      font-size: 10px; letter-spacing: .15em; text-transform: uppercase;
      background: radial-gradient(circle, rgba(59,130,246,.22) 0%, rgba(59,130,246,.06) 100%);
      border: 2px solid var(--accent, #3b82f6);
      color: var(--accent, #3b82f6);
      box-shadow: 0 0 36px rgba(59,130,246,.32), inset 0 0 28px rgba(59,130,246,.08);
      animation: mm-pulse 3.5s ease-in-out infinite;
    }

    .mm-node-topic .mm-node-inner {
      width: 62px; height: 62px;
      font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase;
      background: rgba(255,255,255,.025);
      border: 1px solid var(--line-1, rgba(255,255,255,.07));
      color: rgba(224,224,224,.6);
    }
    .mm-node-topic:hover .mm-node-inner {
      background: rgba(59,130,246,.1);
      border-color: rgba(59,130,246,.45);
      color: var(--fg-1, #e0e0e0);
      box-shadow: 0 0 18px rgba(59,130,246,.18);
    }
    .mm-node-topic.mm-selected .mm-node-inner {
      background: rgba(59,130,246,.18);
      border: 2px solid var(--accent, #3b82f6);
      color: var(--accent, #3b82f6);
      box-shadow: 0 0 28px rgba(59,130,246,.38);
    }

    .mm-node-label {
      position: absolute;
      bottom: -20px; left: 50%;
      transform: translateX(-50%);
      font-size: 8.5px; letter-spacing: .06em;
      color: rgba(224,224,224,.38);
      white-space: nowrap;
      pointer-events: none;
      max-width: 90px;
      overflow: hidden; text-overflow: ellipsis;
    }
    .mm-node-topic.mm-selected .mm-node-label {
      color: rgba(59,130,246,.75);
    }

    #mm-panel {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 370px;
      background: rgba(10,10,15,.9);
      backdrop-filter: blur(14px);
      border-left: 1px solid var(--line-1, rgba(255,255,255,.07));
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform .38s cubic-bezier(.4,0,.2,1);
      z-index: 2;
    }
    #mm-panel.mm-open {
      transform: translateX(0);
    }

    #mm-panel-head {
      flex-shrink: 0;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--line-1, rgba(255,255,255,.07));
      position: relative;
    }
    #mm-panel-label {
      font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
      color: rgba(59,130,246,.55);
      margin-bottom: 5px;
    }
    #mm-panel-title {
      font-size: 13px; letter-spacing: .04em;
      color: var(--fg-1, #e0e0e0);
      padding-right: 28px;
    }
    #mm-panel-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; padding: 4px;
      color: rgba(224,224,224,.3); cursor: pointer; font-size: 15px;
      transition: color .2s;
      line-height: 1;
    }
    #mm-panel-close:hover { color: rgba(224,224,224,.8); }

    #mm-panel-body {
      flex: 1; overflow-y: auto;
      padding: 20px 24px;
      font-size: 12px; line-height: 1.8;
      color: rgba(224,224,224,.65);
    }
    #mm-panel-body::-webkit-scrollbar { width: 3px; }
    #mm-panel-body::-webkit-scrollbar-track { background: transparent; }
    #mm-panel-body::-webkit-scrollbar-thumb {
      background: rgba(59,130,246,.25); border-radius: 2px;
    }

    .mm-md-h { display: block; margin: 16px 0 5px; font-size: 9.5px;
      letter-spacing: .14em; text-transform: uppercase;
      color: rgba(224,224,224,.85); font-weight: 700; }
    .mm-md-b { color: var(--fg-1, #e0e0e0); font-weight: 700; }
    .mm-md-c { background: rgba(59,130,246,.13); padding: 1px 5px;
      border-radius: 3px; font-size: 11px; color: rgba(224,224,224,.8); }
    .mm-md-li { display: flex; gap: 8px; margin: 2px 0; }
    .mm-md-li-dot { color: var(--accent, #3b82f6); flex-shrink: 0; }

    #mm-loading {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; gap: 12px;
      color: rgba(224,224,224,.3);
      font-size: 10px; letter-spacing: .12em;
      text-transform: uppercase;
    }
    .mm-spinner {
      width: 22px; height: 22px;
      border: 2px solid rgba(59,130,246,.15);
      border-top-color: var(--accent, #3b82f6);
      border-radius: 50%;
      animation: mm-spin .75s linear infinite;
    }

    #mm-empty {
      position: absolute; inset: 0;
      display: none; align-items: center; justify-content: center;
      font-size: 11px; letter-spacing: .1em;
      color: rgba(224,224,224,.2);
    }

    @keyframes mm-spin { to { transform: rotate(360deg); } }
    @keyframes mm-pulse {
      0%,100% { box-shadow: 0 0 36px rgba(59,130,246,.32), inset 0 0 28px rgba(59,130,246,.08); }
      50%      { box-shadow: 0 0 54px rgba(59,130,246,.55), inset 0 0 40px rgba(59,130,246,.14); }
    }
  `;

  function injectCSS() {
    if (document.getElementById('mm-styles')) return;
    const s = document.createElement('style');
    s.id = 'mm-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Container ─────────────────────────────────────────────────────────────

  function ensureContainer() {
    if (container) return container;
    injectCSS();
    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2',
      display: 'none',
      opacity: '0',
      transition: 'opacity .35s ease',
    });
    document.body.appendChild(container);
    return container;
  }

  // ── Skeleton DOM ──────────────────────────────────────────────────────────

  function buildSkeleton() {
    container.innerHTML = `
      <div id="mm-header">
        <div id="mm-header-left">
          <span id="mm-title">Mémoire de Jarvis</span>
          <span id="mm-badge">SOUVERAIN</span>
        </div>
        <span id="mm-stats">Chargement…</span>
      </div>
      <div id="mm-body">
        <div id="mm-graph">
          <div id="mm-loading">
            <div class="mm-spinner"></div>
            <span>Lecture de la mémoire…</span>
          </div>
          <div id="mm-empty">Aucun sujet en mémoire</div>
          <svg id="mm-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          <div id="mm-nodes"></div>
        </div>
        <div id="mm-panel">
          <div id="mm-panel-head">
            <div id="mm-panel-label">Sujet mémorisé</div>
            <div id="mm-panel-title">—</div>
            <button id="mm-panel-close" aria-label="Fermer">✕</button>
          </div>
          <div id="mm-panel-body"></div>
        </div>
      </div>
    `;
    document.getElementById('mm-panel-close').addEventListener('click', closePanel);
  }

  // ── Panel ──────────────────────────────────────────────────────────────────

  function closePanel() {
    const panel = document.getElementById('mm-panel');
    if (panel) panel.classList.remove('mm-open');
    document.querySelectorAll('.mm-node-topic.mm-selected')
      .forEach(n => n.classList.remove('mm-selected'));
    setLineHighlight(null);
    _state.selectedTopic = null;
  }

  function setLineHighlight(topicName) {
    const svg = document.getElementById('mm-svg');
    if (!svg) return;
    svg.querySelectorAll('line[data-topic]').forEach(l => {
      const active = topicName && l.dataset.topic === topicName;
      l.setAttribute('stroke', active
        ? 'rgba(59,130,246,.65)'
        : 'rgba(59,130,246,.15)');
      l.setAttribute('stroke-width', active ? '1.5' : '1');
    });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function fetchMemoryData() {
    const base = window.location.origin;
    const [idxRes, topicsRes] = await Promise.all([
      fetch(`${base}/api/memory/index`),
      fetch(`${base}/api/memory/topics`),
    ]);
    const indexData = idxRes.ok ? await idxRes.json() : null;
    const raw = topicsRes.ok ? await topicsRes.json() : [];
    const topics = Array.isArray(raw) ? raw : (raw.topics || raw.items || []);
    return { indexData, topics };
  }

  async function fetchTopic(name) {
    const res = await fetch(
      `${window.location.origin}/api/memory/topics/${encodeURIComponent(name)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.content || data.body || data.text
      || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }

  // ── Graph rendering ───────────────────────────────────────────────────────

  function renderGraph(topics) {
    const loadingEl = document.getElementById('mm-loading');
    const emptyEl   = document.getElementById('mm-empty');
    const statsEl   = document.getElementById('mm-stats');
    const svg       = document.getElementById('mm-svg');
    const nodesEl   = document.getElementById('mm-nodes');

    if (loadingEl) loadingEl.style.display = 'none';

    if (!topics || topics.length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      if (statsEl) statsEl.textContent = '0 sujet mémorisé';
      return;
    }

    if (statsEl) {
      statsEl.textContent = `${topics.length} sujet${topics.length > 1 ? 's' : ''} mémorisé${topics.length > 1 ? 's' : ''}`;
    }

    const graphEl = document.getElementById('mm-graph');
    const W = graphEl.clientWidth;
    const H = graphEl.clientHeight;
    const cx = W / 2;
    const cy = H / 2;

    const n = topics.length;
    const useDouble = n > 10;
    const innerCount = useDouble ? Math.ceil(n / 2) : n;
    const outerCount = useDouble ? Math.floor(n / 2) : 0;
    const R1 = Math.min(W, H) * (useDouble ? 0.24 : 0.30);
    const R2 = Math.min(W, H) * 0.40;

    svg.innerHTML = '';
    nodesEl.innerHTML = '';

    const positions = [];

    // Inner ring
    for (let i = 0; i < innerCount; i++) {
      const angle = (2 * Math.PI * i / innerCount) - Math.PI / 2;
      positions.push({ x: cx + Math.cos(angle) * R1, y: cy + Math.sin(angle) * R1 });
    }
    // Outer ring
    for (let i = 0; i < outerCount; i++) {
      const angle = (2 * Math.PI * i / outerCount) - Math.PI / 2 + (Math.PI / outerCount);
      positions.push({ x: cx + Math.cos(angle) * R2, y: cy + Math.sin(angle) * R2 });
    }

    // SVG lines center → topics
    topics.forEach((t, i) => {
      const topicName = _topicName(t, i);
      const pos = positions[i];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', pos.x); line.setAttribute('y2', pos.y);
      line.setAttribute('stroke', 'rgba(59,130,246,.15)');
      line.setAttribute('stroke-width', '1');
      line.dataset.topic = topicName;
      svg.appendChild(line);
    });

    // Center node
    const centerEl = document.createElement('div');
    centerEl.className = 'mm-node mm-node-center';
    centerEl.style.left = `${cx}px`;
    centerEl.style.top  = `${cy}px`;
    centerEl.innerHTML  = `<div class="mm-node-inner">MÉM</div>`;
    nodesEl.appendChild(centerEl);

    // Topic nodes
    topics.forEach((t, i) => {
      const topicName = _topicName(t, i);
      const pos = positions[i];
      const abbr = topicName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
        .split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 4)
        || topicName.substring(0, 4).toUpperCase();

      const node = document.createElement('div');
      node.className = 'mm-node mm-node-topic';
      node.dataset.topic = topicName;
      node.style.left = `${pos.x}px`;
      node.style.top  = `${pos.y}px`;
      node.innerHTML  = `
        <div class="mm-node-inner">${abbr}</div>
        <div class="mm-node-label">${topicName}</div>
      `;
      node.addEventListener('click', () => focusTopic(topicName));
      nodesEl.appendChild(node);
    });
  }

  function _topicName(t, i) {
    if (typeof t === 'string') return t;
    return t.name || t.id || t.slug || `topic-${i}`;
  }

  // ── Focus topic ───────────────────────────────────────────────────────────

  async function focusTopic(name) {
    if (_state.selectedTopic === name) {
      closePanel();
      return;
    }

    _state.selectedTopic = name;

    document.querySelectorAll('.mm-node-topic').forEach(n => {
      n.classList.toggle('mm-selected', n.dataset.topic === name);
    });
    setLineHighlight(name);

    const panel    = document.getElementById('mm-panel');
    const titleEl  = document.getElementById('mm-panel-title');
    const bodyEl   = document.getElementById('mm-panel-body');

    if (titleEl) titleEl.textContent = name;
    if (bodyEl)  bodyEl.innerHTML    = '<div style="display:flex;justify-content:center;padding:24px 0;"><div class="mm-spinner"></div></div>';
    if (panel)   panel.classList.add('mm-open');

    try {
      const content = await fetchTopic(name);
      if (bodyEl) bodyEl.innerHTML = renderMd(content);
    } catch (err) {
      if (bodyEl) bodyEl.innerHTML = `<span style="color:rgba(224,224,224,.3);font-size:11px;">${err.message}</span>`;
    }
  }

  // ── Minimal markdown renderer ─────────────────────────────────────────────

  function renderMd(text) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text.split('\n').map(line => {
      const l = esc(line);
      if (/^#{1,3} /.test(line)) {
        return `<span class="mm-md-h">${esc(line.replace(/^#{1,3} /, ''))}</span>`;
      }
      if (/^[-*] /.test(line)) {
        const inner = l.replace(/^[-*] /, '')
          .replace(/\*\*(.+?)\*\*/g, '<strong class="mm-md-b">$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="mm-md-c">$1</code>');
        return `<div class="mm-md-li"><span class="mm-md-li-dot">·</span><span>${inner}</span></div>`;
      }
      if (line.trim() === '' || line.startsWith('---')) return '<br>';
      return l
        .replace(/\*\*(.+?)\*\*/g, '<strong class="mm-md-b">$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="mm-md-c">$1</code>') + '<br>';
    }).join('');
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async function refresh() {
    const loadingEl = document.getElementById('mm-loading');
    const nodesEl   = document.getElementById('mm-nodes');
    const svg       = document.getElementById('mm-svg');
    const emptyEl   = document.getElementById('mm-empty');

    if (loadingEl) loadingEl.style.display = 'flex';
    if (nodesEl)   nodesEl.innerHTML       = '';
    if (svg)       svg.innerHTML           = '';
    if (emptyEl)   emptyEl.style.display   = 'none';
    closePanel();

    try {
      const { topics } = await fetchMemoryData();
      _state.topics = topics;
      renderGraph(topics);
    } catch (err) {
      if (loadingEl) {
        loadingEl.innerHTML = `<span style="color:rgba(224,224,224,.25);font-size:11px;">${err.message}</span>`;
      }
    }
  }

  // ── View registration ─────────────────────────────────────────────────────

  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'Memory Map',
      desc: 'Visualisation de la mémoire de Jarvis — sujets et souvenirs',
      glyph: 'MEM',
      tags: ['mémoire', 'memory', 'knowledge', 'privacy'],
    },

    async show(params = {}) {
      ensureContainer();
      if (container.style.display !== 'none') return;
      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      if (!_built) {
        _built = true;
        buildSkeleton();
        await refresh();
      }
    },

    hide() {
      if (!container) return;
      container.style.opacity = '0';
      setTimeout(() => { if (container) container.style.display = 'none'; }, 360);
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'show':
          this.show(params);
          break;
        case 'hide':
          this.hide();
          break;
        case 'focus_topic':
          if (params.name) focusTopic(params.name);
          break;
        case 'refresh':
          refresh();
          break;
      }
    },
  });
})();
