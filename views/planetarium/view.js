/**
 * Vue Planétarium — jarvis-skills
 * Stellarium Web embed via iframe avec décalage agressif pour cacher
 * la barre de recherche (haut), le promo "Stellarium Mobile" (gauche)
 * et le bandeau cookies (bas-gauche). L'iframe est élargie et décalée
 * pour pousser tous ces éléments hors-écran.
 *
 * Dépend de : _shared.js.
 */
(function () {
  if (!window.Jarvis?.views) return;

  const VIEW_ID = 'planetarium';
  const STYLE_ID = 'planetarium-css';
  const STELLARIUM_URL = 'https://stellarium-web.org/';

  /* Décalages — à ajuster si Stellarium change sa mise en page */
  const TOP_OFFSET = 64;       // shift vers le haut (cache la barre de recherche)
  const LEFT_OFFSET = 320;     // shift vers la gauche (cache pub + cookies)
  const BOTTOM_BAR_H = 32;     // hauteur du hint Jarvis en bas

  let container = null, iframe = null, overlay = null, _visible = false;

  function ensureContainer() {
    if (container) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #planetarium-container { background:#020407; overflow:hidden; }
      #planetarium-container iframe { position:absolute; border:none; display:block; }

      /* Chrome Jarvis (au-dessus de l'iframe, sans capter les clics sauf le voile latéral) */
      #planetarium-container .pla-ov { position:absolute; inset:0; z-index:10; pointer-events:none; font-family:var(--sans,"Geist",system-ui,sans-serif); }

      /* Voile gauche : un dégradé très court contre le bord, juste pour la transition */
      #planetarium-container .pla-fade-left { position:absolute; top:0; left:0; bottom:0; width:90px; pointer-events:none;
        background: linear-gradient(90deg, rgba(2,4,7,.85) 0%, rgba(2,4,7,.35) 50%, transparent 100%); }

      /* Voile haut : court fade au-dessus */
      #planetarium-container .pla-fade-top { position:absolute; top:0; left:0; right:0; height:40px; pointer-events:none;
        background: linear-gradient(180deg, rgba(2,4,7,.7) 0%, transparent 100%); }

      /* Bande Jarvis au pied avec hint */
      #planetarium-container .pla-bottom { position:absolute; left:0; right:0; bottom:0; height:${BOTTOM_BAR_H}px;
        background: linear-gradient(0deg, rgba(2,4,7,.85) 0%, transparent 100%); pointer-events:none;
        display:flex; align-items:center; justify-content:center; }

      /* Tag Jarvis (haut-gauche) */
      #planetarium-container .pla-tag { position:absolute; top:24px; left:28px; z-index:11; pointer-events:none;
        font-family:var(--mono,monospace); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
        color:var(--fg-2,rgba(220,232,255,.6)); }
      #planetarium-container .pla-tag b { display:block; font-family:var(--display-mark,"Landasans",var(--serif));
        font-weight:500; font-size:13px; letter-spacing:.22em; color:var(--fg-0,#DCE8FF); margin-top:6px; }

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

    /* Iframe : décalée -top + -left, élargie de la même valeur dans chaque axe
       → barre de recherche (haut), pub Stellarium Mobile (gauche) et bandeau
         cookies (bas-gauche) sortent du viewport. */
    iframe = document.createElement('iframe');
    iframe.src = STELLARIUM_URL;
    iframe.setAttribute('allow', 'fullscreen; geolocation');
    iframe.style.top = `-${TOP_OFFSET}px`;
    iframe.style.left = `-${LEFT_OFFSET}px`;
    iframe.style.width = `calc(100% + ${LEFT_OFFSET}px)`;
    iframe.style.height = `calc(100% + ${TOP_OFFSET}px)`;
    iframe.addEventListener('load', () => {
      loading.classList.add('gone');
      setTimeout(() => loading.remove(), 500);
    });
    container.appendChild(iframe);

    overlay = document.createElement('div');
    overlay.className = 'pla-ov';
    overlay.innerHTML = `
      <div class="pla-fade-top"></div>
      <div class="pla-fade-left"></div>
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
