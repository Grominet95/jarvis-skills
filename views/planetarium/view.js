/**
 * Vue Planétarium — jarvis-skills
 * Stellarium Web embed via iframe. UI Stellarium imposée, chrome Jarvis
 * en superposition (coins/bords) avec pointer-events: none.
 *
 * Dépend de : _shared.js. Pas de chrome partagé — Stellarium occupe tout.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'planetarium';
  const STYLE_ID = 'planetarium-css';
  const STELLARIUM_URL = 'https://stellarium-web.org/';

  let container = null, iframe = null, overlay = null, _visible = false;

  function ensureContainer() {
    if (container) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #planetarium-container { background:#000; overflow:hidden; }
      #planetarium-container iframe { width:100%; height:100%; border:none; display:block; }
      #planetarium-container .pla-overlay { position:absolute; inset:0; z-index:10; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }
      #planetarium-container .pla-hint { position:absolute; bottom:24px; left:50%; transform:translateX(-50%);
        font-family:var(--mono,monospace); font-size:10px; letter-spacing:.14em; text-transform:uppercase;
        color:var(--fg-3,rgba(220,232,255,.4)); background:rgba(6,8,13,.55); border:1px solid var(--line-2,rgba(220,232,255,.1));
        border-radius:999px; padding:6px 14px; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); }
      #planetarium-container .pla-tag { position:absolute; top:24px; left:24px;
        font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
        color:var(--fg-3,rgba(220,232,255,.5)); background:rgba(6,8,13,.5);
        border:1px solid var(--line-2,rgba(220,232,255,.12)); border-radius:6px; padding:5px 10px;
        backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }
      #planetarium-container .pla-loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        background:#020407; color:var(--fg-2,rgba(220,232,255,.55)); font-family:var(--mono,monospace);
        font-size:11px; letter-spacing:.16em; text-transform:uppercase; transition:opacity .4s ease; }
      #planetarium-container .pla-loading.gone { opacity:0; pointer-events:none; }
    `;
    document.head.appendChild(s);

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position: 'fixed', inset: '0', zIndex: '2',
      background: '#000', opacity: '0',
      transition: 'opacity .4s ease', display: 'none',
    });

    // écran de chargement
    const loading = document.createElement('div');
    loading.className = 'pla-loading';
    loading.textContent = 'Chargement Stellarium Web…';
    container.appendChild(loading);

    iframe = document.createElement('iframe');
    iframe.src = STELLARIUM_URL;
    iframe.setAttribute('allow', 'fullscreen; geolocation');
    iframe.addEventListener('load', () => {
      loading.classList.add('gone');
      setTimeout(() => loading.remove(), 500);
    });
    container.appendChild(iframe);

    // overlay chrome Jarvis (sans bloquer les clics)
    overlay = document.createElement('div');
    overlay.className = 'pla-overlay';
    overlay.innerHTML = `
      <div class="pla-tag">PLANÉTARIUM · STELLARIUM WEB</div>
      <div class="pla-hint">souris pour explorer · molette pour zoomer</div>
    `;
    container.appendChild(overlay);

    document.body.appendChild(container);
  }

  function focusObject(name) {
    if (!iframe || !name) return;
    iframe.src = STELLARIUM_URL + 'skysource/' + encodeURIComponent(name);
  }

  Jarvis.views.register(VIEW_ID, {
    meta: {
      name: 'Planétarium',
      desc: 'Stellarium Web embed — rendu pro du ciel temps réel',
      glyph: 'PLA',
      tags: ['astronomie', 'planétarium', 'stellarium'],
    },

    show(params = {}) {
      ensureContainer();
      if (_visible) return;
      _visible = true;
      container.style.display = 'block';
      container.getBoundingClientRect();
      container.style.opacity = '1';

      if (params.object || params.target) focusObject(params.object || params.target);
    },

    hide() {
      if (!container) return;
      _visible = false;
      container.style.opacity = '0';
      setTimeout(() => { if (!_visible && container) container.style.display = 'none'; }, 400);
    },

    command(cmd, params = {}) {
      switch (cmd) {
        case 'focus_object':
        case 'focus_planet':
        case 'focus_constellation':
          focusObject(params.object || params.planet || params.constellation || params.name || '');
          break;
        case 'reload':
          if (iframe) iframe.src = STELLARIUM_URL;
          break;
      }
    },
  });
})();
