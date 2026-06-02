/**
 * Vue Command Center — jarvis-skills
 * Affiche en temps réel les initiatives proactives, missions et journal d'audit.
 * Dépend de : _shared.js (Jarvis.views doit être chargé avant ce fichier)
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'command-center';
  const STYLE_ID = 'cc-styles';
  const AUDIT_MAX = 100;

  let container = null;
  let clockTimer = null;
  let _visible = false;

  // État interne
  let initiatives = [];
  let missions = [];
  let auditLog = [];

  // ── Style ──────────────────────────────────────────────────────────────────

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #command-center-container {
        font-family: var(--sans, "Geist", "Inter", system-ui, sans-serif);
        color: var(--fg-1, rgba(220,232,255,.78));
      }
      .cc-wrap {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      /* ── Header ── */
      .cc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 28px;
        border-bottom: 1px solid var(--line-1, rgba(220,232,255,.06));
        background: rgba(6,8,13,.7);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        flex-shrink: 0;
        z-index: 1;
      }
      .cc-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .cc-glyph {
        font-family: var(--mono, "Geist Mono", monospace);
        font-size: 9.5px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent, #4A9EFF);
        background: var(--accent-soft, rgba(74,158,255,.14));
        border: 1px solid var(--accent-line, rgba(74,158,255,.32));
        padding: 3px 9px;
        border-radius: 4px;
      }
      .cc-title {
        font-family: var(--sans, "Geist", "Inter", system-ui);
        font-weight: 300;
        font-size: 17px;
        letter-spacing: -0.02em;
        color: var(--fg-0, #DCE8FF);
      }
      .cc-status {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: var(--mono, monospace);
        font-size: 10.5px;
        color: var(--fg-3, rgba(220,232,255,.36));
        letter-spacing: 0.06em;
      }
      .cc-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--green, #36D399);
        box-shadow: 0 0 8px var(--green, #36D399);
        animation: cc-pulse 2.8s ease-in-out infinite;
      }
      @keyframes cc-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: .45; }
      }
      .cc-live-lbl {
        font-size: 9px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: var(--green, #36D399);
      }
      .cc-sep {
        width: 1px;
        height: 12px;
        background: var(--line-2, rgba(220,232,255,.10));
      }
      .cc-clock {
        font-variant-numeric: tabular-nums;
        color: var(--fg-2, rgba(220,232,255,.55));
        min-width: 64px;
        text-align: right;
      }
      /* ── Body ── */
      .cc-body {
        display: grid;
        grid-template-columns: 2fr 1.35fr 1.65fr;
        flex: 1;
        overflow: hidden;
      }
      .cc-col {
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--line-1, rgba(220,232,255,.06));
        overflow: hidden;
      }
      .cc-col:last-child { border-right: none; }
      /* ── Column headers ── */
      .cc-col-hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 18px 11px;
        border-bottom: 1px solid var(--line-1, rgba(220,232,255,.06));
        flex-shrink: 0;
      }
      .cc-col-eyebrow {
        font-family: var(--mono, monospace);
        font-size: 9.5px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--fg-3, rgba(220,232,255,.36));
      }
      .cc-col-count {
        font-family: var(--mono, monospace);
        font-size: 9.5px;
        letter-spacing: 0.06em;
        color: var(--accent, #4A9EFF);
        background: var(--accent-soft, rgba(74,158,255,.14));
        border: 1px solid var(--accent-line, rgba(74,158,255,.32));
        padding: 2px 9px;
        border-radius: 999px;
      }
      /* ── Scrollable lists ── */
      .cc-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 7px;
        scrollbar-width: thin;
        scrollbar-color: rgba(220,232,255,.06) transparent;
      }
      .cc-list::-webkit-scrollbar { width: 4px; }
      .cc-list::-webkit-scrollbar-thumb {
        background: rgba(220,232,255,.08);
        border-radius: 2px;
      }
      /* ── Empty state ── */
      .cc-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        font-family: var(--mono, monospace);
        font-size: 11px;
        color: var(--fg-4, rgba(220,232,255,.20));
        letter-spacing: 0.06em;
        padding: 48px 20px;
        text-align: center;
      }
      /* ── Slide-in animation ── */
      @keyframes cc-slide-in {
        from { opacity: 0; transform: translateY(-7px); }
        to   { opacity: 1; transform: none; }
      }
      .cc-new { animation: cc-slide-in .28s cubic-bezier(.2,.8,.25,1) both; }
      /* ── Initiative cards ── */
      .cc-init-card {
        background: var(--bg-1, #0A0E16);
        border: 1px solid var(--line-1, rgba(220,232,255,.06));
        border-radius: 10px;
        padding: 13px 15px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color .18s ease, box-shadow .18s ease;
        cursor: default;
      }
      .cc-init-card:hover {
        border-color: var(--line-2, rgba(220,232,255,.10));
      }
      .cc-init-card.cc-focused {
        border-color: var(--accent-line, rgba(74,158,255,.32));
        box-shadow: 0 0 0 1px var(--accent-line, rgba(74,158,255,.32)),
                    0 0 22px -6px var(--accent, #4A9EFF);
      }
      .cc-init-card.cc-awaiting {
        border-color: rgba(184,150,62,.32);
      }
      .cc-init-top {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
      .cc-type-badge {
        font-family: var(--mono, monospace);
        font-size: 8.5px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent, #4A9EFF);
        background: var(--accent-soft, rgba(74,158,255,.14));
        border: 1px solid var(--accent-line, rgba(74,158,255,.32));
        padding: 2px 7px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .cc-priority-badge {
        font-family: var(--mono, monospace);
        font-size: 8.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--gold, #B8963E);
        background: var(--gold-soft, rgba(184,150,62,.12));
        border: 1px solid rgba(184,150,62,.32);
        padding: 2px 7px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .cc-init-suggestion {
        font-size: 13px;
        color: var(--fg-0, #DCE8FF);
        line-height: 1.45;
        letter-spacing: -0.005em;
      }
      .cc-reasoning {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 11px;
        background: var(--bg-2, #0F141F);
        border-left: 2px solid var(--accent-line, rgba(74,158,255,.32));
        border-radius: 0 5px 5px 0;
      }
      .cc-reasoning-label {
        font-family: var(--mono, monospace);
        font-size: 8.5px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent, #4A9EFF);
      }
      .cc-reasoning-text {
        font-size: 11.5px;
        color: var(--fg-2, rgba(220,232,255,.55));
        line-height: 1.5;
      }
      .cc-init-actions {
        display: flex;
        gap: 6px;
        margin-top: 1px;
        flex-wrap: wrap;
      }
      /* ── Buttons ── */
      .cc-btn {
        appearance: none;
        border: 1px solid var(--line-2, rgba(220,232,255,.10));
        background: var(--bg-2, #0F141F);
        color: var(--fg-2, rgba(220,232,255,.55));
        font-family: var(--sans, "Geist", "Inter", system-ui);
        font-size: 11px;
        font-weight: 500;
        padding: 5px 11px;
        border-radius: 6px;
        cursor: pointer;
        letter-spacing: 0.01em;
        transition: all .14s ease;
        line-height: 1.4;
      }
      .cc-btn:hover:not(:disabled) {
        background: var(--bg-3, #161C2A);
        color: var(--fg-0, #DCE8FF);
        border-color: var(--line-3, rgba(220,232,255,.16));
      }
      .cc-btn:disabled {
        opacity: .35;
        cursor: default;
      }
      .cc-btn-run {
        background: var(--accent-soft, rgba(74,158,255,.14));
        border-color: var(--accent-line, rgba(74,158,255,.32));
        color: var(--accent, #4A9EFF);
      }
      .cc-btn-run:hover:not(:disabled) {
        background: rgba(74,158,255,.22);
        color: var(--fg-0, #DCE8FF);
      }
      .cc-btn-confirm {
        background: rgba(54,211,153,.12);
        border-color: rgba(54,211,153,.32);
        color: var(--green, #36D399);
      }
      .cc-btn-confirm:hover:not(:disabled) {
        background: rgba(54,211,153,.2);
        color: var(--fg-0, #DCE8FF);
      }
      .cc-btn-dismiss:hover:not(:disabled) {
        color: var(--red, #E5484D);
        border-color: rgba(229,72,77,.3);
        background: rgba(229,72,77,.06);
      }
      /* ── Mission rows ── */
      .cc-mission {
        background: var(--bg-1, #0A0E16);
        border: 1px solid var(--line-1, rgba(220,232,255,.06));
        border-radius: 8px;
        padding: 11px 13px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cc-mission-header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .cc-mission-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .cc-mission-dot.run {
        background: var(--accent, #4A9EFF);
        box-shadow: 0 0 6px var(--accent, #4A9EFF);
        animation: cc-pulse 1.4s ease-in-out infinite;
      }
      .cc-mission-dot.wait {
        background: var(--gold, #B8963E);
        box-shadow: 0 0 6px var(--gold, #B8963E);
      }
      .cc-mission-dot.queue {
        background: var(--fg-3, rgba(220,232,255,.36));
      }
      .cc-mission-name {
        font-size: 13px;
        color: var(--fg-0, #DCE8FF);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        letter-spacing: -0.005em;
      }
      .cc-mission-status-lbl {
        font-family: var(--mono, monospace);
        font-size: 9px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-3, rgba(220,232,255,.36));
        flex-shrink: 0;
      }
      .cc-mission-sub {
        font-family: var(--mono, monospace);
        font-size: 10px;
        color: var(--fg-3, rgba(220,232,255,.36));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cc-prog-bar {
        height: 2px;
        background: var(--bg-3, #161C2A);
        border-radius: 2px;
        overflow: hidden;
      }
      .cc-prog-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent, #4A9EFF), #8FC4FF);
        border-radius: 2px;
        transition: width .4s ease;
      }
      .cc-prog-meta {
        display: flex;
        justify-content: flex-end;
        font-family: var(--mono, monospace);
        font-size: 9.5px;
        color: var(--fg-3, rgba(220,232,255,.36));
        font-variant-numeric: tabular-nums;
      }
      /* ── Journal ── */
      .cc-journal-clear {
        appearance: none;
        background: transparent;
        border: 0;
        font-family: var(--mono, monospace);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--fg-4, rgba(220,232,255,.20));
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 3px;
        transition: color .14s ease;
      }
      .cc-journal-clear:hover { color: var(--fg-2, rgba(220,232,255,.55)); }
      .cc-audit-row {
        border-bottom: 1px solid rgba(220,232,255,.04);
        padding: 8px 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cc-audit-row:last-child { border-bottom: none; }
      .cc-audit-top {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .cc-audit-ts {
        font-family: var(--mono, monospace);
        font-size: 9.5px;
        color: var(--fg-4, rgba(220,232,255,.20));
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .cc-audit-type {
        font-family: var(--mono, monospace);
        font-size: 8.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--fg-3, rgba(220,232,255,.36));
        background: var(--bg-2, #0F141F);
        padding: 1px 5px;
        border-radius: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 80px;
      }
      .cc-audit-decision {
        font-family: var(--mono, monospace);
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-left: auto;
        flex-shrink: 0;
      }
      .cc-audit-decision.cc-run    { color: var(--green, #36D399); }
      .cc-audit-decision.cc-skip   { color: var(--fg-3, rgba(220,232,255,.36)); }
      .cc-audit-decision.cc-warn   { color: var(--gold, #B8963E); }
      .cc-audit-just {
        font-size: 11.5px;
        color: var(--fg-2, rgba(220,232,255,.55));
        line-height: 1.5;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtTime(date) {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function apiBase() {
    return window.location.origin;
  }

  async function apiFetch(path, opts) {
    const res = await fetch(apiBase() + path, opts);
    if (!res.ok) throw new Error(res.status + ' ' + path);
    return res.json();
  }

  function postAction(path) {
    return apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  }

  function initId(init) {
    return init.id ?? init.initiative_id ?? null;
  }

  // ── Container ─────────────────────────────────────────────────────────────

  function ensureContainer() {
    if (container) return;

    injectStyle();

    container = document.createElement('div');
    container.id = 'command-center-container';
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2',
      background: 'var(--bg-0, #06080D)',
      opacity: '0',
      transition: 'opacity .3s ease',
      display: 'none',
    });

    container.innerHTML = `
      <div class="cc-wrap">
        <header class="cc-header">
          <div class="cc-brand">
            <span class="cc-glyph">CMD</span>
            <span class="cc-title">Command Center</span>
          </div>
          <div class="cc-status">
            <span class="cc-live-dot"></span>
            <span class="cc-live-lbl">Live</span>
            <span class="cc-sep"></span>
            <span class="cc-clock"></span>
          </div>
        </header>
        <div class="cc-body">
          <section class="cc-col">
            <div class="cc-col-hd">
              <span class="cc-col-eyebrow">Initiatives</span>
              <span class="cc-col-count" id="cc-init-count">0</span>
            </div>
            <div class="cc-list" id="cc-init-list"></div>
            <div class="cc-empty" id="cc-init-empty">Aucune initiative en attente</div>
          </section>
          <section class="cc-col">
            <div class="cc-col-hd">
              <span class="cc-col-eyebrow">Missions en cours</span>
              <span class="cc-col-count" id="cc-miss-count">0</span>
            </div>
            <div class="cc-list" id="cc-miss-list"></div>
            <div class="cc-empty" id="cc-miss-empty">Aucune mission active</div>
          </section>
          <section class="cc-col">
            <div class="cc-col-hd">
              <span class="cc-col-eyebrow">Journal d'audit</span>
              <button class="cc-journal-clear" id="cc-journal-clear">Vider</button>
            </div>
            <div class="cc-list" id="cc-journal-list"></div>
            <div class="cc-empty" id="cc-journal-empty">En attente d'événements…</div>
          </section>
        </div>
      </div>
    `;

    container.querySelector('#cc-journal-clear').addEventListener('click', clearJournal);
    document.body.appendChild(container);
  }

  // ── Clock ─────────────────────────────────────────────────────────────────

  function startClock() {
    stopClock();
    const el = () => container && container.querySelector('.cc-clock');
    const tick = () => { const c = el(); if (c) c.textContent = fmtTime(new Date()); };
    tick();
    clockTimer = setInterval(tick, 1000);
  }

  function stopClock() {
    clearInterval(clockTimer);
    clockTimer = null;
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadInitialData() {
    try {
      const [initRes, statusRes] = await Promise.allSettled([
        apiFetch('/api/proactive/initiatives?status=pending'),
        apiFetch('/api/proactive/status'),
      ]);

      if (initRes.status === 'fulfilled') {
        const d = initRes.value;
        initiatives = Array.isArray(d) ? d : (d.items ?? d.initiatives ?? []);
        renderInitiatives();
      }

      if (statusRes.status === 'fulfilled') {
        const d = statusRes.value;
        missions = Array.isArray(d) ? d : (d.missions ?? d.active ?? []);
        renderMissions();
      }
    } catch (_) {
      // API indisponible — la vue reste vide mais fonctionnelle
    }
  }

  // ── Render — initiatives ──────────────────────────────────────────────────

  function renderInitiatives() {
    const list = container && container.querySelector('#cc-init-list');
    const empty = container && container.querySelector('#cc-init-empty');
    const count = container && container.querySelector('#cc-init-count');
    if (!list) return;

    list.innerHTML = '';
    initiatives.forEach(init => list.appendChild(buildInitCard(init)));

    const n = initiatives.length;
    if (count) count.textContent = n;
    list.style.display = n === 0 ? 'none' : '';
    if (empty) empty.style.display = n === 0 ? '' : 'none';
  }

  function buildInitCard(init) {
    const card = document.createElement('div');
    const id = initId(init);
    card.className = 'cc-init-card' + (init.status === 'awaiting_confirm' ? ' cc-awaiting' : '');
    if (id !== null) card.dataset.initId = id;

    const type = init.type || init.category || 'initiative';
    const suggestion = init.suggestion || init.title || init.description || '—';
    const reasoning = init.reasoning || init.rationale || init.why || '';
    const priority = init.priority;
    const isAwaiting = init.status === 'awaiting_confirm';

    card.innerHTML = `
      <div class="cc-init-top">
        <span class="cc-type-badge">${esc(type)}</span>
        ${priority ? `<span class="cc-priority-badge">${esc(priority)}</span>` : ''}
      </div>
      <div class="cc-init-suggestion">${esc(suggestion)}</div>
      ${reasoning ? `
        <div class="cc-reasoning">
          <span class="cc-reasoning-label">Pourquoi</span>
          <span class="cc-reasoning-text">${esc(reasoning)}</span>
        </div>` : ''}
      <div class="cc-init-actions">
        ${isAwaiting
          ? `<button class="cc-btn cc-btn-confirm" data-action="confirm">Confirmer l'envoi</button>`
          : `<button class="cc-btn cc-btn-run" data-action="run">Lancer</button>`}
        <button class="cc-btn cc-btn-dismiss" data-action="dismiss">Ignorer</button>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => onInitAction(id, btn.dataset.action, card));
    });

    return card;
  }

  async function onInitAction(id, action, card) {
    if (id === null) return;
    card.querySelectorAll('.cc-btn').forEach(b => { b.disabled = true; });

    try {
      const result = await postAction(`/api/proactive/initiatives/${id}/${action}`);

      if (action === 'run' && (result?.status === 'awaiting_confirm' || result?.awaiting_confirm)) {
        const idx = initiatives.findIndex(i => initId(i) === id);
        if (idx !== -1) {
          initiatives[idx] = { ...initiatives[idx], status: 'awaiting_confirm' };
          renderInitiatives();
        }
      } else {
        initiatives = initiatives.filter(i => initId(i) !== id);
        renderInitiatives();
      }
    } catch (_) {
      card.querySelectorAll('.cc-btn').forEach(b => { b.disabled = false; });
    }
  }

  // ── Render — missions ─────────────────────────────────────────────────────

  function renderMissions() {
    const list = container && container.querySelector('#cc-miss-list');
    const empty = container && container.querySelector('#cc-miss-empty');
    const count = container && container.querySelector('#cc-miss-count');
    if (!list) return;

    list.innerHTML = '';
    missions.forEach(m => list.appendChild(buildMissionRow(m)));

    const n = missions.length;
    if (count) count.textContent = n;
    list.style.display = n === 0 ? 'none' : '';
    if (empty) empty.style.display = n === 0 ? '' : 'none';
  }

  function buildMissionRow(mission) {
    const row = document.createElement('div');
    row.className = 'cc-mission';

    const name = mission.name || mission.title || mission.id || 'Mission';
    const status = mission.status || 'running';
    const progress = typeof mission.progress === 'number' ? mission.progress : null;
    const sub = mission.description || mission.agent || '';

    const dotClass = status === 'running' ? 'run' : status === 'waiting' ? 'wait' : 'queue';
    const statusLbl = status === 'running' ? 'En cours' : status === 'waiting' ? 'Attente' : 'File';

    row.innerHTML = `
      <div class="cc-mission-header">
        <span class="cc-mission-dot ${dotClass}"></span>
        <span class="cc-mission-name">${esc(name)}</span>
        <span class="cc-mission-status-lbl">${esc(statusLbl)}</span>
      </div>
      ${sub ? `<div class="cc-mission-sub">${esc(sub)}</div>` : ''}
      ${progress !== null ? `
        <div class="cc-prog-bar">
          <div class="cc-prog-fill" style="width:${Math.min(100, Math.max(0, progress)).toFixed(1)}%"></div>
        </div>
        <div class="cc-prog-meta">${progress.toFixed(0)} %</div>` : ''}
    `;

    return row;
  }

  // ── Render — journal ──────────────────────────────────────────────────────

  function prependAuditEntry(entry) {
    const list = container && container.querySelector('#cc-journal-list');
    const empty = container && container.querySelector('#cc-journal-empty');
    if (!list) return;

    auditLog.push(entry);
    if (auditLog.length > AUDIT_MAX) auditLog.shift();

    const row = buildAuditRow(entry);
    row.classList.add('cc-new');
    list.insertBefore(row, list.firstChild);

    if (empty) empty.style.display = 'none';
    list.style.display = '';
  }

  function clearJournal() {
    auditLog = [];
    const list = container && container.querySelector('#cc-journal-list');
    const empty = container && container.querySelector('#cc-journal-empty');
    if (list) { list.innerHTML = ''; list.style.display = 'none'; }
    if (empty) empty.style.display = '';
  }

  function buildAuditRow(entry) {
    const row = document.createElement('div');
    row.className = 'cc-audit-row';

    const ts = entry.timestamp ? fmtTime(new Date(entry.timestamp)) : fmtTime(new Date());
    const decision = (entry.decision || entry.action || '—').toUpperCase();
    const justification = entry.justification || entry.reason || entry.message || '';
    const type = entry.type || entry.initiative_type || '';

    const isRun = decision === 'RUN' || decision === 'CONFIRM';
    const isSkip = decision === 'SKIP' || decision === 'DISMISS';
    const decClass = isRun ? 'cc-run' : isSkip ? 'cc-skip' : 'cc-warn';

    row.innerHTML = `
      <div class="cc-audit-top">
        <span class="cc-audit-ts">${esc(ts)}</span>
        ${type ? `<span class="cc-audit-type">${esc(type)}</span>` : ''}
        <span class="cc-audit-decision ${decClass}">${esc(decision)}</span>
      </div>
      ${justification ? `<div class="cc-audit-just">${esc(justification)}</div>` : ''}
    `;

    return row;
  }

  // ── Real-time: new initiative ─────────────────────────────────────────────

  function prependInitiative(init) {
    const id = initId(init);
    const existIdx = id !== null
      ? initiatives.findIndex(i => initId(i) === id)
      : -1;

    if (existIdx !== -1) {
      initiatives[existIdx] = init;
      renderInitiatives();
      return;
    }

    initiatives.unshift(init);

    const list = container && container.querySelector('#cc-init-list');
    const empty = container && container.querySelector('#cc-init-empty');
    const count = container && container.querySelector('#cc-init-count');
    if (!list) return;

    const card = buildInitCard(init);
    card.classList.add('cc-new');
    list.insertBefore(card, list.firstChild);

    if (count) count.textContent = initiatives.length;
    if (empty) empty.style.display = 'none';
    list.style.display = '';
  }

  // ── View registration ─────────────────────────────────────────────────────

  Jarvis.views.register(VIEW_ID, {

    meta: {
      name: 'Command Center',
      desc: 'Initiatives proactives, missions et journal d\'audit en temps réel',
      glyph: 'CMD',
      tags: ['initiatives', 'missions', 'proactif', 'dashboard'],
    },

    async show(params = {}) {
      ensureContainer();

      if (_visible) return;
      _visible = true;

      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      startClock();
      await loadInitialData();
    },

    hide() {
      if (!container) return;
      _visible = false;
      container.style.opacity = '0';
      stopClock();
      setTimeout(() => {
        if (!_visible && container) container.style.display = 'none';
      }, 320);
    },

    command(cmd, params = {}) {
      if (!container) return;

      switch (cmd) {

        case 'focus_initiative': {
          const id = params.initiative_id;
          if (!id) return;
          const card = container.querySelector(`[data-init-id="${id}"]`);
          if (!card) return;
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.classList.add('cc-focused');
          setTimeout(() => card.classList.remove('cc-focused'), 2200);
          break;
        }

        case 'refresh': {
          loadInitialData();
          break;
        }

        case 'initiative_pending': {
          const init = params.initiative ?? params;
          if (init && (init.id ?? init.initiative_id ?? init.type ?? init.suggestion)) {
            prependInitiative(init);
          }
          break;
        }

        case 'proactive_audit': {
          const entry = params.audit ?? params;
          prependAuditEntry(entry);
          break;
        }

        case 'initiatives_restored': {
          loadInitialData();
          break;
        }

        // Commandes inconnues ignorées silencieusement
      }
    },

  });

})();
