/**
 * Vue Planétarium — jarvis-skills
 * Stellarium Web embed via iframe. Domaine externe (cross-origin), donc
 * impossible de modifier le DOM Stellarium depuis ici. On le masque avec
 * des panneaux opaques solides (pas de dégradés) pour avoir des bords nets.
 *
 *   • Top bar opaque (56px) : cache la barre de recherche + hamburger
 *     (le hamburger doit être caché sinon son clic casse la mise en page).
 *   • Panneau latéral gauche opaque (vertical-center) : cache le promo
 *     "Stellarium Mobile". Démarre sous le top bar, laisse les 300 px du
 *     haut libres pour le panneau d'infos quand on clique un astre.
 *   • Bandeau bas opaque (130px) : cache le bandeau cookies, accueille le
 *     hint. L'iframe est raccourcie pour faire remonter les boutons.
 *
 * Pour aller plus loin (vraiment supprimer les éléments Stellarium au
 * lieu de les masquer) il faudrait self-host Stellarium Web ou utiliser
 * Stellarium Web Engine (wasm) directement. Les deux exigent du travail
 * backend.
 *
 * Dépend de : _shared.js.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'planetarium';
  const STYLE_ID = 'planetarium-css';
  const STELLARIUM_URL = 'https://stellarium-web.org/';

  /* Dimensions des panneaux opaques — ajuster ici */
  const TOP_BAR_H = 56;          // cache la barre de recherche + hamburger
  const BOTTOM_RESERVE = 70;     // iframe raccourcie de cette valeur au pied
  const BOTTOM_CHROME_H = 130;   // bandeau bas opaque (cache cookies)
  const PROMO_TOP = 300;         // y où commence le panneau latéral gauche
  const PROMO_H = 520;           // hauteur du panneau latéral gauche
  const PROMO_W = 280;           // largeur du panneau latéral gauche

  let container = null, iframe = null, overlay = null, _visible = false;

  function ensureContainer() {
    if (container) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #planetarium-container { background:#020407; overflow:hidden; }
      #planetarium-container iframe { position:absolute; border:none; display:block; }

      #planetarium-container .pla-ov { position:absolute; inset:0; z-index:10; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }

      /* Panneaux opaques, fond solide, pas de dégradés */
      #planetarium-container .pla-top { position:absolute; top:0; left:0; right:0; height:${TOP_BAR_H}px;
        background:#020407; pointer-events:auto;
        display:flex; align-items:center; justify-content:space-between; padding:0 24px; }
      #planetarium-container .pla-promo { position:absolute; top:${PROMO_TOP}px; left:0; width:${PROMO_W}px; height:${PROMO_H}px;
        background:#020407; pointer-events:auto; }
      #planetarium-container .pla-bottom { position:absolute; bottom:0; left:0; right:0; height:${BOTTOM_CHROME_H}px;
        background:#020407; pointer-events:auto;
        display:flex; align-items:flex-end; justify-content:center; padding-bottom:18px; }

      /* Textes Jarvis dans les panneaux */
      #planetarium-container .pla-brand { font-family:var(--display-mark,"Landasans",var(--serif));
        font-weight:500; font-size:13px; letter-spacing:.22em; color:var(--fg-0,#DCE8FF); }
      #planetarium-container .pla-brand small { font-family:var(--mono,monospace); font-weight:400;
        font-size:9.5px; letter-spacing:.18em; color:var(--fg-3,rgba(220,232,255,.45)); margin-right:10px; }
      #planetarium-container .pla-right { font-family:var(--mono,monospace); font-size:9.5px;
        letter-spacing:.18em; text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.5)); }
      #planetarium-container .pla-hint { font-family:var(--mono,monospace); font-size:10px;
        letter-spacing:.16em; text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.5)); }

      /* Loading */
      #planetarium-container .pla-loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        background:#020407; color:var(--fg-2,rgba(220,232,255,.55)); font-family:var(--mono,monospace);
        font-size:11px; letter-spacing:.16em; text-transform:uppercase; transition:opacity .4s ease; z-index:20; }
      #planetarium-container .pla-loading.gone { opacity:0; pointer-events:none; }
    `;
    document.head.appendChild(s);

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    Object.assign(container.style, {
      position: 'fixed', inset: '0', zIndex: '2',
      background: '#020407', opacity: '0',
      transition: 'opacity .4s ease', display: 'none',
    });

    const loading = document.createElement('div');
    loading.className = 'pla-loading';
    loading.textContent = 'Chargement Stellarium Web…';
    container.appendChild(loading);

    iframe = document.createElement('iframe');
    iframe.src = STELLARIUM_URL;
    iframe.setAttribute('allow', 'fullscreen; geolocation');
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = `calc(100% - ${BOTTOM_RESERVE}px)`;
    iframe.addEventListener('load', () => {
      loading.classList.add('gone');
      setTimeout(() => loading.remove(), 500);
    });
    container.appendChild(iframe);

    overlay = document.createElement('div');
    overlay.className = 'pla-ov';
    overlay.innerHTML = `
      <div class="pla-top">
        <span class="pla-brand"><small>PLANÉTARIUM ·</small>JARVIS</span>
        <span class="pla-right">STELLARIUM WEB</span>
      </div>
      <div class="pla-promo"></div>
      <div class="pla-bottom">
        <span class="pla-hint">souris pour explorer · molette pour zoomer · cliquer un astre</span>
      </div>
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
