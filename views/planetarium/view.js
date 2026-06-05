/**
 * Vue Planétarium — jarvis-skills
 * Stellarium Web embed via iframe avec masques opaques :
 *   • Masque haut complet : cache la barre de recherche ET le hamburger
 *     (pour empêcher l'ouverture des panneaux Stellarium qui cassent la
 *     mise en page en flexbox).
 *   • Masque latéral gauche centré : cache le promo "Stellarium Mobile".
 *   • Bandeau bas opaque : cache le bandeau cookies, remonte la barre de
 *     boutons Stellarium (iframe raccourcie).
 *
 * Limite assumée : quand on clique sur un astre, Stellarium ouvre son
 * panneau d'infos au top-left ; l'en-tête (titre + bouton fermer) est
 * caché par notre masque haut. Le corps reste lisible. Clic ailleurs
 * pour fermer.
 *
 * Dépend de : _shared.js.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'planetarium';
  const STYLE_ID = 'planetarium-css';
  const STELLARIUM_URL = 'https://stellarium-web.org/';

  /* Dimensions des masques — ajuster ici si Stellarium change sa mise en page */
  const BOTTOM_RESERVE = 70;       // l'iframe s'arrête à 70 px du bas
  const BOTTOM_CHROME_H = 150;     // bandeau Jarvis bas (solide, cache cookies)
  const BOTTOM_FADE_H = 28;        // fondu au-dessus du bandeau pour la transition douce
  const TOP_MASK_H = 56;           // hauteur du masque haut (solide, cache top bar Stellarium)
  const PROMO_W = 320;             // largeur du masque latéral gauche
  const PROMO_TOP_PCT = 22;        // % depuis le haut où commence le masque promo
  const PROMO_BOTTOM_PCT = 26;     // % depuis le bas où s'arrête le masque promo

  let container = null, iframe = null, overlay = null, _visible = false;

  function ensureContainer() {
    if (container) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #planetarium-container { background:#020407; overflow:hidden; }
      #planetarium-container iframe { position:absolute; border:none; display:block; }

      #planetarium-container .pla-ov { position:absolute; inset:0; z-index:10; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }
      #planetarium-container .pla-ov .mask { position:absolute; pointer-events:auto; background:#020407; }
      #planetarium-container .pla-ov .fade { position:absolute; pointer-events:none; }

      /* Masque haut complet : cache la barre de recherche, le hamburger et OBSERVE
         (empêche l'ouverture des panneaux Stellarium qui cassent la mise en page) */
      #planetarium-container .pla-mask-top { top:0; left:0; right:0; height:${TOP_MASK_H}px; }
      #planetarium-container .pla-fade-top { top:${TOP_MASK_H}px; left:0; right:0; height:24px;
        background: linear-gradient(180deg, #020407 0%, transparent 100%); }

      /* Masque latéral gauche centré : cache le promo Stellarium Mobile */
      #planetarium-container .pla-mask-promo { top:${PROMO_TOP_PCT}%; bottom:${PROMO_BOTTOM_PCT}%; left:0; width:${PROMO_W}px; }
      #planetarium-container .pla-fade-promo { top:${PROMO_TOP_PCT}%; bottom:${PROMO_BOTTOM_PCT}%; left:${PROMO_W}px; width:60px;
        background: linear-gradient(90deg, #020407 0%, transparent 100%); }

      /* Bandeau bas opaque + fondu au-dessus */
      #planetarium-container .pla-chrome-bottom { position:absolute; left:0; right:0; bottom:0; height:${BOTTOM_CHROME_H}px;
        background: #020407; pointer-events:auto;
        display:flex; align-items:flex-end; justify-content:center; padding-bottom:20px; }
      #planetarium-container .pla-fade-bottom { left:0; right:0; bottom:${BOTTOM_CHROME_H}px; height:${BOTTOM_FADE_H}px;
        background: linear-gradient(0deg, #020407 0%, transparent 100%); }

      /* Tag Jarvis (top-right au-dessus du masque haut) */
      #planetarium-container .pla-tag { position:absolute; top:14px; right:24px; z-index:11; pointer-events:none;
        font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
        color:var(--fg-2,rgba(220,232,255,.6)); text-align:right; }
      #planetarium-container .pla-tag b { display:block; font-family:var(--display-mark,"Landasans",var(--serif));
        font-weight:500; font-size:12px; letter-spacing:.22em; color:var(--fg-0,#DCE8FF); margin-top:3px; }

      /* Tag haut-gauche en miniature (juste pour identifier la vue) */
      #planetarium-container .pla-corner { position:absolute; top:18px; left:24px; z-index:11; pointer-events:none;
        font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
        color:var(--fg-3,rgba(220,232,255,.45)); }

      #planetarium-container .pla-hint { font-family:var(--mono,monospace); font-size:10px; letter-spacing:.16em;
        text-transform:uppercase; color:var(--fg-3,rgba(220,232,255,.5)); pointer-events:none; }

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
      <div class="mask pla-mask-top"></div>
      <div class="fade pla-fade-top"></div>
      <div class="mask pla-mask-promo"></div>
      <div class="fade pla-fade-promo"></div>
      <div class="fade pla-fade-bottom"></div>
      <div class="pla-chrome-bottom"><span class="pla-hint">souris pour explorer · molette pour zoomer · cliquer un astre</span></div>
      <div class="pla-corner">Planétarium</div>
      <div class="pla-tag">Jarvis<b>Stellarium</b></div>
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
