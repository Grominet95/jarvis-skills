/**
 * Vue Planétarium — jarvis-skills
 * Stellarium Web embed via iframe avec masquage Jarvis :
 *   • iframe décalée vers le haut pour cacher la barre de recherche
 *     (et remonter la barre de boutons du bas)
 *   • dégradé sombre à gauche pour masquer la pub "Stellarium Mobile"
 *   • dégradé sombre en bas-gauche pour masquer le bandeau cookies
 *   • chrome Jarvis (label haut-gauche + hint bas-centre) en superposition
 *
 * Dépend de : _shared.js. Pas de chrome partagé — Stellarium occupe tout.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'planetarium';
  const STYLE_ID = 'planetarium-css';
  const STELLARIUM_URL = 'https://stellarium-web.org/';

  /* Hauteurs/largeurs des éléments Stellarium à masquer (ajuster ici) */
  const TOP_OFFSET = 56;       // décalage vers le haut de l'iframe (cache la barre)
  const SIDEBAR_W = 300;       // largeur masque gauche (pub Stellarium Mobile)
  const COOKIE_W = 460;        // largeur masque bandeau cookies bas-gauche
  const COOKIE_H = 70;
  const BOTTOM_BAR_H = 36;     // bande Jarvis au pied (au-dessus des boutons remontés)

  let container = null, iframe = null, overlay = null, _visible = false;

  function ensureContainer() {
    if (container) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #planetarium-container { background:#020407; overflow:hidden; }
      #planetarium-container iframe { position:absolute; left:0; width:100%; border:none; display:block; }

      /* Overlay : aucun pointer-events sauf sur les masques explicites */
      #planetarium-container .pla-ov { position:absolute; inset:0; z-index:10; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }
      #planetarium-container .pla-ov .mask { position:absolute; pointer-events:auto; }

      /* Top : dégradé sombre vers le haut, lisse le décalage de l'iframe */
      #planetarium-container .pla-mask-top { top:0; left:0; right:0; height:${TOP_OFFSET}px;
        background: linear-gradient(180deg, rgba(2,4,7,.95) 0%, rgba(2,4,7,.55) 70%, transparent 100%); }

      /* Gauche : couvre la pub Stellarium Mobile */
      #planetarium-container .pla-mask-left { top:0; left:0; width:${SIDEBAR_W}px; bottom:0;
        background: linear-gradient(90deg, rgba(2,4,7,.94) 0%, rgba(2,4,7,.86) 55%, rgba(2,4,7,.4) 85%, transparent 100%); }

      /* Cookies en bas-gauche */
      #planetarium-container .pla-mask-cookie { bottom:0; left:0; width:${COOKIE_W}px; height:${COOKIE_H}px;
        background: linear-gradient(0deg, rgba(2,4,7,.96) 0%, rgba(2,4,7,.7) 60%, transparent 100%); }

      /* Bande Jarvis au pied — au-dessus des boutons remontés */
      #planetarium-container .pla-bottom { position:absolute; left:0; right:0; bottom:0; height:${BOTTOM_BAR_H}px;
        background: linear-gradient(0deg, rgba(2,4,7,.92) 0%, transparent 100%); pointer-events:none;
        display:flex; align-items:center; justify-content:center; }

      /* Tag Jarvis (haut-gauche, par-dessus le masque gauche) */
      #planetarium-container .pla-tag { position:absolute; top:24px; left:28px; z-index:11;
        font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
        color:var(--fg-2,rgba(220,232,255,.6)); pointer-events:none; }
      #planetarium-container .pla-tag b { display:block; font-family:var(--display-mark,"Landasans",var(--serif));
        font-weight:500; font-size:13px; letter-spacing:.22em; color:var(--fg-0,#DCE8FF); margin-top:6px; }

      /* Hint bas-centre */
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

    // Écran de chargement
    const loading = document.createElement('div');
    loading.className = 'pla-loading';
    loading.textContent = 'Chargement Stellarium Web…';
    container.appendChild(loading);

    // Iframe Stellarium : décalée vers le haut + étirée de la même valeur
    // → masque la barre de recherche, remonte la barre de boutons du bas
    iframe = document.createElement('iframe');
    iframe.src = STELLARIUM_URL;
    iframe.setAttribute('allow', 'fullscreen; geolocation');
    iframe.style.top = `-${TOP_OFFSET}px`;
    iframe.style.height = `calc(100% + ${TOP_OFFSET}px)`;
    iframe.addEventListener('load', () => {
      loading.classList.add('gone');
      setTimeout(() => loading.remove(), 500);
    });
    container.appendChild(iframe);

    // Overlay Jarvis
    overlay = document.createElement('div');
    overlay.className = 'pla-ov';
    overlay.innerHTML = `
      <div class="mask pla-mask-top"></div>
      <div class="mask pla-mask-left"></div>
      <div class="mask pla-mask-cookie"></div>
      <div class="pla-bottom"><span class="pla-hint">souris pour explorer · molette pour zoomer · cliquer un astre</span></div>
      <div class="pla-tag">Planétarium<b>Jarvis · Stellarium</b></div>
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
