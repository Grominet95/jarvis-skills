/**
 * Vue [NOM] — jarvis-skills
 *
 * TODO: Remplacer MA-VUE par l'id kebab-case de ta vue (ex: "star-map")
 * TODO: Remplacer toutes les occurrences de MA-VUE et MA_VUE
 *
 * Dépend de : _shared.js (Jarvis.views doit être chargé avant ce fichier)
 */
(function () {
  // Guard : si Jarvis.views n'est pas disponible, on ne fait rien
  if (!window.Jarvis?.views) return;

  // TODO: Remplacer 'ma-vue' par l'id de ta vue (kebab-case minuscule)
  const VIEW_ID = 'ma-vue';

  // État interne de la vue
  let container = null;
  // TODO: Ajouter ici les variables d'état dont ta vue a besoin
  // Exemples : let myLib = null; let animFrame = null; let eventListeners = [];

  // ── Helpers ─────────────────────────────────────────────────────────────

  function ensureContainer() {
    if (container) return container;

    container = document.createElement('div');
    container.id = `${VIEW_ID}-container`;
    // OBLIGATOIRE : position fixed, inset 0, z-index 2
    Object.assign(container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2',
      // TODO: Adapter le fond à ta vue. Utiliser les variables CSS de _shared.css :
      // --bg-0 (fond principal), --fg-1 (texte), --accent (couleur d'accent), --line-1 (bordures)
      background: 'var(--bg-0, #0e0e0e)',
      opacity: '0',
      transition: 'opacity .3s ease',
      display: 'none',
    });

    document.body.appendChild(container);

    // TODO: Créer ici le DOM initial de ta vue et l'injecter dans container
    // Exemple :
    // const canvas = document.createElement('canvas');
    // canvas.style.cssText = 'width:100%;height:100%;';
    // container.appendChild(canvas);

    return container;
  }

  // ── Enregistrement ───────────────────────────────────────────────────────

  Jarvis.views.register(VIEW_ID, {

    meta: {
      // TODO: Remplir les métadonnées (doivent correspondre à VIEW.md)
      name: 'Ma Vue',
      desc: 'Description courte affichée dans le marketplace',
      glyph: 'MV',
      tags: ['tag1', 'tag2'],
    },

    /**
     * Affiche la vue.
     * OBLIGATOIRE : doit être idempotent (safe si appelé deux fois sans hide entre).
     *
     * @param {object} params  Paramètres optionnels envoyés par le backend
     */
    show(params = {}) {
      ensureContainer();

      // Guard idempotence : déjà visible → on ne refait rien
      if (container.style.display !== 'none') return;

      container.style.display = 'block';
      // Force reflow avant la transition d'opacité
      container.getBoundingClientRect();
      container.style.opacity = '1';

      // TODO: Initialiser ta vue ici (librairie, canvas, connexion WebSocket, etc.)
      // Si l'init est async, utiliser un try/catch et afficher une erreur dans le container.
      //
      // Exemple :
      // try {
      //   myLib = new MyLib(container.querySelector('canvas'));
      //   myLib.start();
      // } catch (err) {
      //   container.innerHTML = `<div style="color:var(--fg-1);padding:24px;">${err.message}</div>`;
      // }
    },

    /**
     * Masque la vue et nettoie toutes les ressources.
     * OBLIGATOIRE : doit supprimer tout ce que show() a créé (timers, listeners, etc.)
     */
    hide() {
      if (!container) return;

      container.style.opacity = '0';

      // TODO: Stopper les animations, déconnecter les listeners, libérer la mémoire
      // Exemples :
      // cancelAnimationFrame(animFrame); animFrame = null;
      // myLib?.destroy(); myLib = null;
      // eventListeners.forEach(([el, ev, fn]) => el.removeEventListener(ev, fn));
      // eventListeners = [];

      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 320);
    },

    /**
     * Exécute une commande envoyée par le backend.
     * OBLIGATOIRE : ignorer silencieusement les commandes inconnues.
     *
     * @param {string} cmd     Nom de la commande (ex: 'fly_to', 'refresh')
     * @param {object} params  Paramètres de la commande
     */
    command(cmd, params = {}) {
      switch (cmd) {

        // TODO: Implémenter tes commandes ici
        // Exemple :
        // case 'ma-commande': {
        //   if (!myLib) return;
        //   myLib.doSomething(params.param1, params.param2);
        //   break;
        // }

        // IMPORTANT : ne pas ajouter de `default` qui throw — les commandes
        // inconnues doivent être ignorées silencieusement.
      }
    },

  });

})();
