// jarvis-skills.com — router + rendering. Vanilla, zero deps (js-yaml from CDN).

const INDEX_URL = "https://raw.githubusercontent.com/Grominet95/jarvis-skills/main/index.json";
const SKILL_BASE = "https://raw.githubusercontent.com/Grominet95/jarvis-skills/main";
const REPO_URL = "https://github.com/Grominet95/jarvis-skills";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

function glyph(name) {
  // 2-letter glyph from name segments. e.g. "web-researcher" -> "WR", "mode-streameur" -> "MS"
  const parts = name.split(/[-_]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isPreset(s) { return (s.type || "").toLowerCase() === "preset"; }
function isView(s)   { return (s.type || "").toLowerCase() === "view"; }
function skillGlyph(s) { return s.glyph || glyph(s.name); }

function plats(s) {
  const all = ["mac", "windows", "linux"];
  const has = new Set((s.platforms || []).map(p => p.toLowerCase()));
  return all.map(p => ({ p, on: has.has(p) }));
}

function installPhrase(s) {
  if (isView(s))   return `installe la vue ${s.name}`;
  if (isPreset(s)) return `installe le preset ${s.name}`;
  return `installe le skill ${s.name}`;
}

function utteranceForPreset(s) {
  return (s.triggers && s.triggers[0]) || null;
}

// ──────────────────────────────────────────────────────────
// Data layer
// ──────────────────────────────────────────────────────────
let CATALOG = null;
const yamlCache = new Map();

async function loadCatalog() {
  if (CATALOG) return CATALOG;
  try {
    const r = await fetch(INDEX_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    CATALOG = await r.json();
  } catch (e) {
    console.warn("[jarvis-skills] index.json fetch failed, using embedded fallback.", e);
    CATALOG = window.JARVIS_FALLBACK;
  }
  // Normalize: ensure type is set ("skill" if missing)
  CATALOG.skills = CATALOG.skills.map(s => ({ ...s, type: (s.type || "skill").toLowerCase() }));
  return CATALOG;
}

async function loadSkillYaml(skill) {
  if (yamlCache.has(skill.name)) return yamlCache.get(skill.name);
  let parsed = null;
  try {
    const r = await fetch(`${SKILL_BASE}/${skill.path}/skill.yaml`, { cache: "no-store" });
    if (r.ok) {
      const txt = await r.text();
      parsed = window.jsyaml ? window.jsyaml.load(txt) : null;
    }
  } catch (e) {
    console.warn("[jarvis-skills] skill.yaml fetch failed for " + skill.name, e);
  }
  yamlCache.set(skill.name, parsed);
  return parsed;
}

// ──────────────────────────────────────────────────────────
// Renderers — List page
// ──────────────────────────────────────────────────────────
let listState = { filter: "all", q: "" };

function renderAbout() {
  const root = $("#app");
  root.innerHTML = "";
  syncNavOn();
  root.appendChild(el("div", { class: "wrap" }, [
    el("a", { class: "detail-back", href: "#/" }, [
      el("span", { class: "arr" }, "←"),
      document.createTextNode("Retour au catalogue"),
    ]),
    el("section", { class: "about" }, [
      el("div", { class: "about-eyebrow" }, [
        el("span", { class: "accent" }, "JARVIS · SKILLS"),
        el("span", {}, "À PROPOS"),
      ]),
      el("h1", { class: "about-h1" }, [
        document.createTextNode("Un catalogue ouvert pour "),
        el("span", { class: "em" }, "étendre"),
        document.createTextNode(" Jarvis."),
      ]),
      el("div", { class: "about-grid" }, [
        el("section", { class: "about-block" }, [
          el("div", { class: "about-num" }, "01"),
          el("h3", {}, "Le projet"),
          el("p", {}, "jarvis-skills est un dépôt public de modules conversationnels et de routines orchestrées. Chaque skill est une intégration : il donne à Jarvis un nouveau contexte d'action. Chaque preset enchaîne plusieurs skills derrière une phrase."),
        ]),
        el("section", { class: "about-block" }, [
          el("div", { class: "about-num" }, "02"),
          el("h3", {}, "Comment ça marche"),
          el("p", {}, "Tu choisis, Jarvis installe. Une phrase suffit : « installe le skill web-researcher » et le runtime récupère le module depuis le repo, vérifie les dépendances, puis l'enregistre dans ton profil. Les presets s'invoquent ensuite par leur trigger."),
        ]),
        el("section", { class: "about-block" }, [
          el("div", { class: "about-num" }, "03"),
          el("h3", {}, "Contribuer"),
          el("p", {}, "Le repo est ouvert. Tout le monde peut proposer un skill via pull request : un dossier, un skill.yaml, une logique Python. Le manifeste sert de source de vérité pour ce catalogue."),
          el("a", { class: "btn-cta", href: "https://github.com/Grominet95/jarvis-skills/blob/main/CONTRIBUTING.md", target: "_blank", rel: "noopener" }, [
            document.createTextNode("Lire le guide"),
            el("span", { class: "arr" }, "↗"),
          ]),
        ]),
        el("section", { class: "about-block" }, [
          el("div", { class: "about-num" }, "04"),
          el("h3", {}, "Stack"),
          el("p", {}, "Vitrine statique en HTML/CSS/JS, alimentée en direct par index.json depuis github/main. Aucun backend, aucun cookie, aucune analytique. Le contenu est la source, pas la couche de présentation."),
        ]),
      ]),
      el("div", { class: "about-foot" }, [
        el("a", { href: "#/", class: "btn-ghost-lg" }, "← Accueil"),
        el("a", { href: "#/skills", class: "btn-ghost-lg" }, "Skills →"),
        el("a", { href: "#/presets", class: "btn-ghost-lg" }, "Presets →"),
        el("a", { href: "#/views", class: "btn-ghost-lg" }, "Vues →"),
      ]),
    ]),
  ]));
}

function syncNavOn() {
  const route = (location.hash || "#/").replace(/^#/, "");
  const map = { "/": "home", "/skills": "skill", "/presets": "preset", "/views": "view", "/about": "about" };
  let key = map[route.replace(/\/$/, "")] || (route.match(/^\/skills\//) ? "skill" : route.match(/^\/views\//) ? "view" : "home");
  document.querySelectorAll(".nav-cat").forEach(a => {
    a.classList.toggle("is-on", a.dataset.cat === key);
  });
}

async function renderSection({ kind }) {
  const root = $("#app");
  root.innerHTML = "";
  root.appendChild(loadingNode("Catalogue Jarvis · Chargement"));
  const cat = await loadCatalog();
  const isP = kind === "preset";
  const isV = kind === "view";
  const items = cat.skills.filter(s => isP ? isPreset(s) : isV ? isView(s) : (!isPreset(s) && !isView(s)));
  listState.filter = kind; listState.q = "";

  root.innerHTML = "";
  syncNavOn();
  root.appendChild(el("section", { class: "sec-hero" }, [
    el("div", { class: "wrap" }, [
      el("div", { class: "sec-eyebrow" }, [
        el("span", { class: "accent" }, isP ? "PRESETS" : isV ? "VUES" : "SKILLS"),
        el("span", {}, isP ? "ROUTINES DÉCLENCHÉES PAR PHRASE" : isV ? "COMPOSANTS VISUELS FULL-SCREEN" : "MODULES CONVERSATIONNELS"),
        el("span", { class: "sec-flex" }),
        el("span", { class: "sec-count" }, String(items.length).padStart(2, "0") + " entrée" + (items.length>1?"s":"")),
      ]),
      el("h1", { class: "sec-h1" }, [
        document.createTextNode(isP ? "Lance un " : isV ? "Installe une " : "Étends Jarvis, "),
        el("span", { class: "em" }, isP ? "mode" : isV ? "vue" : "skill"),
        document.createTextNode(isP ? " complet en une phrase." : isV ? " full-screen en une phrase." : " par skill."),
      ]),
      el("p", { class: "sec-lead" }, isP
        ? "Un preset orchestre une séquence d'actions sur ta machine. Lance la phrase, tout se configure."
        : isV
          ? "Une vue est un composant visuel full-screen piloté par Jarvis. Installe-la, Jarvis pilote l'écran."
          : "Chaque skill est une intégration. Tu l'installes, Jarvis gagne une nouvelle capacité."
      ),
      el("div", { class: "sec-search" }, [
        el("span", { class: "sec-search-ico" }, "⌕"),
        el("input", { id: "sec-search", class: "sec-search-input", type: "search",
          placeholder: isP ? "Rechercher un preset…" : isV ? "Rechercher une vue…" : "Rechercher un skill…", autocomplete: "off" }),
        el("span", { class: "sec-search-kbd" }, "↵"),
      ]),
    ]),
  ]));

  root.appendChild(el("div", { class: "wrap" }, [
    el("div", { class: "grid", id: "grid" }),
  ]));
  root.appendChild(buildFooter(cat));

  function paint() {
    const grid = $("#grid"); grid.innerHTML = "";
    const filtered = items.filter(s => {
      if (!listState.q) return true;
      const hay = (s.name + " " + s.description + " " + (s.tags||[]).join(" ")).toLowerCase();
      return hay.includes(listState.q);
    });
    if (!filtered.length) {
      grid.appendChild(el("div", { class: "empty" }, [
        el("div", { class: "e-eyebrow" }, "AUCUN RÉSULTAT"),
        el("div", { class: "e-title" }, "Rien à montrer pour cette recherche."),
      ]));
      return;
    }
    filtered.forEach((s, i) => {
      const c = buildCard(s);
      if (i === 0 && !listState.q) {
        c.classList.add("is-featured");
        c.appendChild(el("div", { class: "sk-featured-mark" }, "À LA UNE"));
      }
      grid.appendChild(c);
    });
  }
  paint();
  $("#sec-search").addEventListener("input", e => {
    listState.q = e.target.value.toLowerCase().trim(); paint();
  });
}

function renderApp() {
  const route = (location.hash || "#/").replace(/^#/, "");
  const mS = route.match(/^\/skills\/([^/]+)\/?$/);
  const mV = route.match(/^\/views\/([^/]+)\/?$/);
  if (mS) return renderDetail(decodeURIComponent(mS[1]));
  if (mV) return renderDetail(decodeURIComponent(mV[1]));
  if (/^\/skills\/?$/.test(route))  return renderSection({ kind: "skill" });
  if (/^\/presets\/?$/.test(route)) return renderSection({ kind: "preset" });
  if (/^\/views\/?$/.test(route))   return renderSection({ kind: "view" });
  if (/^\/about\/?$/.test(route))   return renderAbout();
  return renderList({ filter: "all" });
}

async function renderList(opts) {
  opts = opts || {};
  listState.filter = opts.filter || "all";
  listState.q = "";
  const root = $("#app");
  root.innerHTML = "";
  root.appendChild(loadingNode("Catalogue Jarvis · Chargement"));

  const cat = await loadCatalog();
  const skills = cat.skills;

  const counts = {
    all: skills.length,
    skill: skills.filter(s => !isPreset(s) && !isView(s)).length,
    preset: skills.filter(isPreset).length,
    view: skills.filter(isView).length,
  };
  const authors = new Set(skills.map(s => s.author)).size;

  root.innerHTML = "";
  root.appendChild(buildHero({ counts, authors, updated: cat.updated_at, version: cat.version }));

  const toolbar = buildToolbar(counts);
  root.appendChild(toolbar);

  const secHd = el("div", { class: "wrap" }, [
    el("div", { class: "sk-sec-hd" }, [
      el("div", { class: "sk-sec-hd-l" }, [
        el("div", { class: "sk-sec-hd-meta" }, [
          el("span", { class: "num" }, "01"),
          el("span", {}, "Catalogue · Disponibles"),
        ]),
        el("div", { class: "sk-sec-hd-disp", id: "sec-disp" }, "Ce que la communauté a publié"),
      ]),
      el("div", { class: "sk-sec-hd-r" }, [
        el("span", { id: "sec-count" }, `${counts.all} entrées`)
      ])
    ])
  ]);
  root.appendChild(secHd);

  const gridWrap = el("div", { class: "wrap" }, [el("div", { class: "grid", id: "grid" })]);
  root.appendChild(gridWrap);

  root.appendChild(buildFooter(cat));

  paintGrid();
  animateCountUps();

  // Wire filters / search
  $$(".filter").forEach(btn => btn.addEventListener("click", () => {
    listState.filter = btn.dataset.f;
    $$(".filter").forEach(b => b.classList.toggle("is-on", b.dataset.f === listState.filter));
    paintGrid();
  }));
  $("#search").addEventListener("input", e => {
    listState.q = e.target.value.toLowerCase().trim();
    paintGrid();
  });
}

function paintGrid() {
  const grid = $("#grid");
  if (!grid) return;
  const skills = CATALOG.skills.filter(s => {
    if (listState.filter === "skill" && (isPreset(s) || isView(s))) return false;
    if (listState.filter === "preset" && !isPreset(s)) return false;
    if (listState.filter === "view" && !isView(s)) return false;
    if (listState.q) {
      const hay = (s.name + " " + s.description + " " + (s.tags || []).join(" ")).toLowerCase();
      if (!hay.includes(listState.q)) return false;
    }
    return true;
  });
  grid.innerHTML = "";
  if (!skills.length) {
    grid.appendChild(el("div", { class: "empty" }, [
      el("div", { class: "e-eyebrow" }, "AUCUN RÉSULTAT"),
      el("div", { class: "e-title" }, "Rien à montrer pour cette recherche."),
    ]));
  } else {
    skills.forEach((s, i) => {
      const c = buildCard(s);
      if (i === 0 && listState.filter === "all" && !listState.q) {
        c.classList.add("is-featured");
        c.appendChild(el("div", { class: "sk-featured-mark" }, "À LA UNE"));
      }
      grid.appendChild(c);
    });
  }
  const c = $("#sec-count");
  if (c) c.textContent = `${skills.length} entrée${skills.length > 1 ? "s" : ""}`;
}

function buildHero({ counts, authors, updated, version }) {
  return el("section", { class: "nav-spacer-none" }, [
    el("div", { class: "wrap" }, [
      el("div", { class: "hero" }, [
        el("div", { class: "hero-l" }, [
          el("div", { class: "hero-eyebrow" }, [
            el("span", { class: "accent" }, "JARVIS · SKILLS"),
            el("span", {}, "MARKETPLACE PUBLIC"),
          ]),
          el("h1", {}, [
            document.createTextNode("Étends les "),
            el("span", { class: "em" }, "capacités"),
            document.createTextNode(" de Jarvis."),
          ]),
          el("p", { class: "lead" },
            "Skills et presets créés par la communauté. Tu choisis, Jarvis installe."
          ),
          el("div", { class: "hero-cta" }, [
            el("a", { class: "btn-cta", href: "#grid",
              onclick: (e) => { e.preventDefault(); document.querySelector(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" }); }
            }, [
              document.createTextNode("Découvrir les skills"),
              el("span", { class: "arr" }, "→"),
            ]),
            el("a", { class: "btn-ghost-lg", href: REPO_URL, target: "_blank", rel: "noopener" }, [
              document.createTextNode("Voir le repo"),
              el("span", { class: "arr" }, "↗"),
            ]),
          ]),
        ]),
        buildFeaturedAside({ counts, authors, updated, version }),
      ]),
    ])
  ]);
}

function buildStat(lbl, val, sub, gold) {
  return el("div", { class: "hero-stat" + (gold ? " is-gold" : "") }, [
    el("div", {}, [
      el("div", { class: "hs-lbl" }, lbl),
      el("div", { class: "hs-sub" }, sub),
    ]),
    el("div", { class: "hs-val" }, val),
  ]);
}

function buildFeaturedAside_unused_stub_DEPRECATED({ counts, authors, updated, version }) {
  // Sync nav meta now that we know the version/updated
  setTimeout(() => {
    const v = document.getElementById("nav-version");
    const u = document.getElementById("nav-updated");
    if (v) v.textContent = version || "";
    if (u) u.textContent = updated || "";
  }, 0);
  return null;
}

const ASIDE_VARIANTS = ["editorial", "poster", "ledger", "bars", "ticker"];
function getAsideVariant() {
  const v = localStorage.getItem("jsk_aside") || "editorial";
  return ASIDE_VARIANTS.includes(v) ? v : "editorial";
}
function setAsideVariant(v) { localStorage.setItem("jsk_aside", v); }

function buildFeaturedAside(ctx) {
  // Sync nav meta
  setTimeout(() => {
    const v = document.getElementById("nav-version");
    const u = document.getElementById("nav-updated");
    if (v) v.textContent = ctx.version || "";
    if (u) u.textContent = ctx.updated || "";
    syncNavOn();
  }, 0);
  return el("aside", { class: "stats-col v-editorial" }, [
    renderAsideVariant("editorial", ctx),
  ]);
}

function buildFeaturedAside_with_switcher_DEPRECATED(ctx) {

  const variant = getAsideVariant();
  const aside = el("aside", { class: "stats-col v-" + variant }, [
    el("div", { class: "sc-switcher" }, ASIDE_VARIANTS.map((v, i) =>
      el("button", {
        class: "scs-btn" + (v === variant ? " is-on" : ""),
        title: v,
        "data-v": v,
        onclick: (e) => {
          setAsideVariant(e.currentTarget.dataset.v);
          const host = aside.parentNode;
          host.replaceChild(buildFeaturedAside(ctx), aside);
        }
      }, String(i + 1).padStart(2, "0"))
    )),
    renderAsideVariant(variant, ctx),
  ]);
  return aside;
}

function renderAsideVariant(v, ctx) {
  const { counts, authors, updated, version } = ctx;
  const total = counts.skill + counts.preset;
  const rows = [
    { lbl: "Skills",  sub: "modules conversationnels", val: counts.skill,     accentClass: "is-accent" },
    { lbl: "Presets", sub: "routines déclenchées",     val: counts.preset,    accentClass: "is-gold" },
    { lbl: "Vues",    sub: "composants full-screen",   val: counts.view || 0, accentClass: "is-green" },
    { lbl: "Auteurs", sub: "contributeurs publics",    val: authors,          accentClass: "" },
  ];

  if (v === "editorial") {
    return el("div", { class: "v-body" }, [
      el("div", { class: "sc-head" }, [
        el("span", { class: "sc-tick" }, "↳"),
        el("span", {}, "Catalogue · " + (updated || "")),
        el("span", { class: "sc-flex" }),
        el("span", { class: "sc-v" }, "v" + (version || "")),
      ]),
      el("ol", { class: "sc-list" },
        rows.map((r, i) => el("li", { class: "sc-row " + r.accentClass }, [
          el("span", { class: "sc-n" }, String(i + 1).padStart(2, "0")),
          el("div", { class: "sc-id" }, [
            el("div", { class: "sc-lbl" }, r.lbl),
            el("div", { class: "sc-sub" }, r.sub),
          ]),
          el("div", { class: "sc-val" }, String(r.val).padStart(2, "0")),
        ]))
      ),
      el("div", { class: "sc-foot" }, [el("span", { class: "sc-dot" }), document.createTextNode("LIVE · github/main")]),
    ]);
  }
  if (v === "poster") {
    return el("div", { class: "v-body poster" }, [
      el("div", { class: "po-head" }, [
        el("span", {}, "ÉTAT DU CATALOGUE"),
        el("span", { class: "po-v" }, "v" + (version || "")),
      ]),
      el("div", { class: "po-grid" },
        rows.map((r, i) => el("div", { class: "po-cell " + r.accentClass }, [
          el("div", { class: "po-n" }, String(i + 1).padStart(2, "0")),
          el("div", { class: "po-val" }, String(r.val).padStart(2, "0")),
          el("div", { class: "po-lbl" }, r.lbl),
        ]))
      ),
      el("div", { class: "po-foot" }, [el("span", { class: "sc-dot" }), document.createTextNode("MAJ " + (updated || ""))]),
    ]);
  }
  if (v === "ledger") {
    return el("div", { class: "v-body ledger" }, [
      el("div", { class: "ld-head" }, [
        el("span", {}, "RELEVÉ · " + (updated || "")),
        el("span", { class: "ld-no" }, "N° v" + (version || "")),
      ]),
      el("div", { class: "ld-rule"}),
      el("div", { class: "ld-list" },
        rows.map((r, i) => el("div", { class: "ld-row " + r.accentClass }, [
          el("span", { class: "ld-l" }, [
            el("span", { class: "ld-n" }, String(i + 1).padStart(2, "0")),
            el("span", { class: "ld-lbl" }, r.lbl),
            el("span", { class: "ld-sub" }, r.sub),
          ]),
          el("span", { class: "ld-leader" }),
          el("span", { class: "ld-v" }, String(r.val).padStart(2, "0")),
        ]))
      ),
      el("div", { class: "ld-rule"}),
      el("div", { class: "ld-foot" }, [el("span", {}, "github/main"), el("span", { class: "sc-dot" })]),
    ]);
  }
  if (v === "bars") {
    const max = Math.max(counts.skill, counts.preset, authors, total) || 1;
    return el("div", { class: "v-body bars" }, [
      el("div", { class: "br-head" }, [
        el("span", {}, "RÉPARTITION"),
        el("span", { class: "br-tot" }, total + " entrées · v" + (version || "")),
      ]),
      el("div", { class: "br-list" },
        rows.map((r) => el("div", { class: "br-row " + r.accentClass }, [
          el("div", { class: "br-l" }, [
            el("span", { class: "br-lbl" }, r.lbl),
            el("span", { class: "br-val" }, String(r.val).padStart(2, "0")),
          ]),
          el("div", { class: "br-track" }, [el("div", { class: "br-fill", style: `width:${(r.val / max) * 100}%` })]),
          el("div", { class: "br-sub" }, r.sub),
        ]))
      ),
    ]);
  }
  if (v === "ticker") {
    const items = (CATALOG.skills || []).slice(0, 6).map((s, i) => ({
      time: ["00:14","00:42","01:08","02:51","04:09","07:33"][i] || "",
      name: s.name,
      kind: isPreset(s) ? "PRESET" : isView(s) ? "VUE" : "SKILL",
      ver: s.version,
    }));
    return el("div", { class: "v-body ticker" }, [
      el("div", { class: "tk-head" }, [
        el("span", { class: "sc-dot" }),
        el("span", {}, "FEED · " + (updated || "")),
        el("span", { class: "tk-flex" }),
        el("span", { class: "tk-v" }, "v" + (version || "")),
      ]),
      el("div", { class: "tk-summary" },
        rows.map((r) => el("span", { class: "tk-s " + r.accentClass }, [
          el("span", { class: "tk-s-v" }, String(r.val).padStart(2, "0")),
          el("span", { class: "tk-s-l" }, r.lbl),
        ]))
      ),
      el("div", { class: "tk-list" },
        items.map(it => el("div", { class: "tk-row" }, [
          el("span", { class: "tk-time" }, it.time),
          el("span", { class: "tk-kind" + (it.kind === "PRESET" ? " is-gold" : it.kind === "VUE" ? " is-green" : "") }, it.kind),
          el("span", { class: "tk-name" }, it.name),
          el("span", { class: "tk-ver" }, "v" + it.ver),
        ]))
      ),
    ]);
  }
  return el("div", {}, "");
}

function buildStatRibbon() { return el("div", {}, ""); }
function statCell() { return el("div", {}, ""); }
function animateCountUps() {}
function buildOrb() { return el("div", {}, ""); }
function buildLiveRibbon() { return el("div", {}, ""); }
function mountParticleSphere() {}
/* orphan-start
    el("div", { class: "wrap" }, [
      el("div", { class: "hero" }, [
        el("div", { class: "hero-bg" }),
        el("div", { class: "hero-eyebrow" }, [
          el("span", { class: "dot" }),
          el("span", { class: "accent" }, "JARVIS / SKILLS"),
          el("span", { class: "sep" }, "—"),
          el("span", {}, "MARKETPLACE PUBLIC · v" + (version || "")),
        ]),
        el("h1", {}, [
          document.createTextNode("Étends les "),
          el("em", {}, "capacités"),
          document.createTextNode(" de Jarvis."),
        ]),
        el("aside", { class: "hero-side" }, [
          el("div", { class: "hs-row" }, [
            el("span", { class: "hs-lbl" }, "Indexé"),
            el("span", { class: "hs-val" }, String(total).padStart(2, "0")),
          ]),
          el("div", { class: "hs-row" }, [
            el("span", { class: "hs-lbl" }, "Skills"),
            el("span", { class: "hs-val" }, String(counts.skill).padStart(2, "0")),
          ]),
          el("div", { class: "hs-row" }, [
            el("span", { class: "hs-lbl" }, "Presets"),
            el("span", { class: "hs-val" }, String(counts.preset).padStart(2, "0")),
          ]),
          el("div", { class: "hs-row" }, [
            el("span", { class: "hs-lbl" }, "MAJ"),
            el("span", { class: "hs-val" }, updated || ""),
          ]),
          el("div", { class: "hs-bar" }, [el("span", {})]),
          el("div", { class: "hs-foot" }, [
            el("span", { class: "hs-dot" }),
            document.createTextNode("LIVE · github/main"),
          ]),
        ]),
        el("div", { class: "hero-foot" }, [
          el("p", {},
            "Skills et presets construits par la communauté. Tu dis, Jarvis installe — depuis le repo public."
          ),
          el("div", { class: "hero-cta" }, [
            el("a", { class: "btn-cta", href: "#grid",
              onclick: (e) => { e.preventDefault(); document.querySelector(".toolbar").scrollIntoView({ behavior: "smooth", block: "start" }); }
            }, [
              document.createTextNode("Parcourir"),
              el("span", { class: "arr" }, "→"),
            ]),
            el("a", { class: "btn-ghost-lg", href: REPO_URL, target: "_blank", rel: "noopener" }, [
              document.createTextNode("Repo"),
              el("span", { class: "arr" }, "↗"),
            ]),
          ]),
        ]),
      ]),
    ]),
orphan-end */

function buildStatRibbon2({ counts, authors, updated, version }) {
  const total = counts.skill + counts.preset;
  return el("section", {}, [el("div", { class: "wrap" }, [
    el("div", { class: "stat-row" }, [
      statCell("01 · Skills", counts.skill, "modules conversationnels"),
      statCell("02 · Presets", counts.preset, "routines déclenchées"),
      statCell("03 · Auteurs", authors, "contributeurs publics"),
      statCell("04 · MAJ", updated || "", `v${version || ""}`, true),
    ])
  ])]);
}
function statCell(lbl, val, sub, isText) {
  const valNode = isText
    ? el("div", { class: "val" }, String(val))
    : el("div", { class: "val", "data-count": String(val) }, [
        document.createTextNode("00"),
        el("span", { class: "arr" }, "↗"),
      ]);
  return el("div", { class: "stat-cell" }, [
    el("div", { class: "lbl" }, lbl),
    valNode,
    el("div", { class: "sub" }, sub),
  ]);
}

function animateCountUps() {
  $$(".stat-cell .val[data-count]").forEach(node => {
    const target = parseInt(node.dataset.count, 10);
    if (!isFinite(target)) return;
    const dur = 1200; const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(target * e);
      node.firstChild.nodeValue = String(v).padStart(2, "0");
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// Old helpers kept for compatibility (unused)
function buildOrb() { return el("div", {}, ""); }
function buildLiveRibbon() { return el("div", {}, ""); }
function mountParticleSphere() {}
function buildStat() { return el("div", {}, ""); }

function mountParticleSphere(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
  const N = 3200;
  // Fibonacci-distributed points on unit sphere
  const pts = [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = phi * i;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  // Add small radius jitter for organic feel
  const jit = pts.map(() => 0.94 + Math.random() * 0.12);

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width  - 0.5) * 0.6;
    tmy = ((e.clientY - r.top)  / r.height - 0.5) * 0.6;
  });

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    // ease mouse
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    const yaw = t * 0.18 + mx * 1.2;
    const pitch = -0.2 + my * 0.8;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);

    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // soft inner glow
    const cx = cw / 2, ccy = ch / 2;
    const R = Math.min(cw, ch) * 0.42;
    const g = ctx.createRadialGradient(cx, ccy, 0, cx, ccy, R * 1.4);
    g.addColorStop(0, "rgba(74,158,255,0.18)");
    g.addColorStop(0.4, "rgba(74,158,255,0.06)");
    g.addColorStop(1, "rgba(74,158,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // project + draw points (depth sorted not strictly needed; we modulate alpha by z)
    for (let i = 0; i < N; i++) {
      const p = pts[i]; const jr = jit[i];
      let x = p[0] * jr, y = p[1] * jr, z = p[2] * jr;
      // yaw around Y
      let x1 = x * cy + z * sy;
      let z1 = -x * sy + z * cy;
      // pitch around X
      let y1 = y * cp - z1 * sp;
      let z2 = y * sp + z1 * cp;

      // simple orthographic projection
      const px = cx + x1 * R;
      const py = ccy + y1 * R;
      // depth in [-1..1], front = +1
      const depth = (z2 + 1) / 2;
      // size + alpha by depth
      const size = (0.4 + depth * 1.7) * DPR;
      const alpha = 0.18 + depth * 0.78;

      // bluer in front, dimmer in back
      const r = 130 + depth * 80;
      const gr = 180 + depth * 50;
      const b = 255;
      ctx.fillStyle = `rgba(${r|0},${gr|0},${b},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function buildStatRibbon({ counts, authors, updated, version }) {
  const total = counts.skill + counts.preset;
  return el("section", { class: "stat-ribbon" }, [
    statCell("01", "Skills disponibles", counts.skill, "modules conversationnels"),
    statCell("02", "Presets", counts.preset, "routines déclenchées par phrase", true),
    statCell("03", "Auteurs", authors, "contributeurs publics"),
    statCell("04", "Total", total, `mis à jour ${updated || ""}`),
  ]);
}
function statCell(num, lbl, val, sub, gold) {
  return el("div", { class: "stat" + (gold ? " is-gold" : "") }, [
    el("div", { class: "l" }, [el("span", { class: "num" }, num), el("span", {}, lbl)]),
    el("div", { class: "v", "data-count": String(val) }, [document.createTextNode("00"), el("span", { class: "u" }, "↗")]),
    el("div", { class: "s" }, sub),
  ]);
}

function buildLiveRibbon(triggers) {
  // duplicate for seamless loop
  const items = triggers.concat(triggers).map(({ t, name }) =>
    el("span", { class: "item" }, [
      el("span", { class: "q" }, "» "),
      document.createTextNode(t),
      el("span", { class: "sep" }, "· " + name),
    ])
  );
  return el("section", { class: "live-ribbon" }, [
    el("div", { class: "pill" }, [el("span", { class: "dot" }), document.createTextNode("ON ENTEND")]),
    el("div", { class: "marquee" }, items),
  ]);
}

// Count-up animation
function animateCountUps() {
  $$(".stat .v[data-count]").forEach(node => {
    const target = parseInt(node.dataset.count, 10);
    if (!isFinite(target)) return;
    const dur = 1200; const start = performance.now();
    const u = node.querySelector(".u");
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(target * e);
      node.firstChild.nodeValue = String(v).padStart(2, "0");
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function buildStat(lbl, val, sub, gold) {
  return el("div", { class: "hero-stat" + (gold ? " is-gold" : "") }, [
    el("div", {}, [
      el("div", { class: "hs-lbl" }, lbl),
      el("div", { class: "hs-sub" }, sub),
    ]),
    el("div", { class: "hs-val" }, val),
  ]);
}

function buildToolbar(counts) {
  return el("div", { class: "wrap" }, [
    el("div", { class: "toolbar" }, [
      el("div", { class: "filters" }, [
        buildFilter("all", "Tous", counts.all, true),
        buildFilter("skill", "Skills", counts.skill, false),
        buildFilter("preset", "Presets", counts.preset, false),
        buildFilter("view", "Vues", counts.view, false),
      ]),
      el("div", {}),
      el("div", { class: "search-wrap" }, [
        el("input", { id: "search", class: "search", type: "search",
          placeholder: "Rechercher · nom, tag, description…", autocomplete: "off" })
      ]),
    ])
  ]);
}

function buildFilter(key, label, count, on) {
  return el("button", { class: "filter" + (on ? " is-on" : ""), "data-f": key }, [
    document.createTextNode(label),
    el("span", { class: "cnt" }, String(count).padStart(2, "0")),
  ]);
}

function buildCard(s) {
  const caps = window.JARVIS_CAPABILITIES[s.name] || [];
  const trigger = utteranceForPreset(s);
  const reqApps = window.JARVIS_REQUIRES_APPS[s.name];

  const body = [];
  body.push(el("div", { class: "sk-card-desc" }, s.description));

  if (isView(s)) {
    const vcmds = window.JARVIS_VIEW_COMMANDS?.[s.name] || [];
    if (vcmds.length) {
      body.push(el("div", { class: "sk-card-bullets" },
        vcmds.slice(0, 3).map(c => el("div", { class: "b" }, c))
      ));
    }
  } else if (isPreset(s) && trigger) {
    body.push(el("div", { class: "sk-card-trigger" }, `"${trigger}"`));
  } else if (caps.length) {
    body.push(el("div", { class: "sk-card-bullets" },
      caps.slice(0, 3).map(c => el("div", { class: "b" }, c))
    ));
  }

  if (reqApps && reqApps.length) {
    body.push(el("div", { class: "t-eyebrow", style: "margin-top:4px" },
      "REQUIERT · " + reqApps.map(a => a.name).join(" · ").toUpperCase()
    ));
  }

  if (s.tags && s.tags.length) {
    body.push(el("div", { class: "sk-card-tags" },
      s.tags.slice(0, 6).map(t => el("span", { class: "tag" }, t))
    ));
  }

  const card = el("a", {
    class: "sk-card" + (isPreset(s) ? " is-preset" : "") + (isView(s) ? " is-view" : ""),
    href: isView(s) ? `#/views/${encodeURIComponent(s.name)}` : `#/skills/${encodeURIComponent(s.name)}`,
    "data-name": s.name,
  }, [
    el("div", { class: "sk-card-watermark" }, skillGlyph(s)),
    el("div", { class: "sk-card-hd" }, [
      el("div", { class: "sk-glyph" }, skillGlyph(s)),
      el("div", { class: "sk-card-id" }, [
        el("div", { class: "sk-card-name" }, s.name),
        el("div", { class: "sk-card-meta" }, [
          el("span", { class: "v" }, "v" + s.version),
          el("span", { class: "sep" }, "·"),
          el("span", { class: "a" }, s.author),
        ]),
      ]),
      el("span", { class: "badge " + (isPreset(s) ? "badge--gold" : isView(s) ? "badge--green" : "badge--accent") }, [
        el("span", { class: "pri-dot" }),
        document.createTextNode(isPreset(s) ? "PRESET" : isView(s) ? "VUE" : "SKILL"),
      ]),
    ]),
    el("div", { class: "sk-card-body" }, body),
    el("div", { class: "sk-card-ft" }, [
      el("div", { class: "sk-card-plats" },
        plats(s).map(({ p, on }) => el("span", { class: "p" + (on ? " on" : "") }, p))
      ),
      el("div", { class: "sk-card-go" }, [
        document.createTextNode(isPreset(s) ? "Voir le preset" : isView(s) ? "Voir la vue" : "Voir le skill"),
        el("span", { class: "arr" }, "→"),
      ]),
    ]),
  ]);
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
  return card;
}

function buildFooter(cat) {
  return el("div", { class: "wrap" }, [
    el("footer", { class: "foot" }, [
      el("div", {}, `JARVIS · SKILLS · v${cat.version} · MAJ ${cat.updated_at}`),
      el("div", {}, [
        el("a", { href: REPO_URL, target: "_blank", rel: "noopener" }, "Repo GitHub ↗"),
        el("a", { href: REPO_URL + "/blob/main/CONTRIBUTING.md", target: "_blank", rel: "noopener" }, "Contribuer ↗"),
        el("a", { href: "#/" }, "Accueil"),
      ])
    ])
  ]);
}

function loadingNode(label) {
  return el("div", { class: "loading" }, [
    el("div", { class: "pulse" }),
    el("div", {}, label || "Chargement"),
  ]);
}

// ──────────────────────────────────────────────────────────
// Detail page
// ──────────────────────────────────────────────────────────
async function renderDetail(name) {
  const root = $("#app");
  root.innerHTML = "";
  root.appendChild(loadingNode(`SKILL · ${name.toUpperCase()}`));

  await loadCatalog();
  const s = CATALOG.skills.find(x => x.name === name);

  if (!s) {
    root.innerHTML = "";
    root.appendChild(el("div", { class: "wrap" }, [
      el("a", { class: "detail-back", href: "#/" }, [
        el("span", { class: "arr" }, "←"),
        document.createTextNode("Retour au catalogue"),
      ]),
      el("div", { class: "error-box" }, `Aucun skill « ${name} » dans le catalogue.`),
    ]));
    return;
  }

  // Try fetching yaml; non-blocking — render shell first then augment
  const yamlPromise = loadSkillYaml(s);

  root.innerHTML = "";
  root.appendChild(buildDetailShell(s));

  const yaml = await yamlPromise;
  augmentDetail(s, yaml);
}

function buildDetailShell(s) {
  const caps = isView(s)
    ? (window.JARVIS_VIEW_COMMANDS?.[s.name] || [])
    : (window.JARVIS_CAPABILITIES[s.name] || []);
  const reqApps = window.JARVIS_REQUIRES_APPS[s.name] || [];
  const phrase = installPhrase(s);
  const trigger = utteranceForPreset(s);

  // Capabilities block
  const capsBlock = caps.length ? el("section", { class: "dcard" }, [
    el("div", { class: "dcard-hd" }, [
      el("div", { class: "dcard-title" }, [
        el("span", { class: "num" }, "02"),
        document.createTextNode(isPreset(s) ? "Ce que ce preset fait" : isView(s) ? "Commandes" : "Capacités"),
      ]),
      el("div", { class: "dcard-sub" }, String(caps.length).padStart(2, "0") + (isView(s) ? " commande" : " étape") + (caps.length > 1 ? "s" : "")),
    ]),
    el("div", { class: "cap-list" },
      caps.map((c, i) => el("div", { class: "cap-row" }, [
        el("span", { class: "n" }, String(i + 1).padStart(2, "0")),
        el("span", {}, c),
      ]))
    )
  ]) : null;

  // Triggers block (presets)
  const triggersBlock = isPreset(s) && s.triggers && s.triggers.length ? el("section", { class: "dcard" }, [
    el("div", { class: "dcard-hd" }, [
      el("div", { class: "dcard-title" }, [
        el("span", { class: "num" }, "03"),
        document.createTextNode("Phrases déclencheurs"),
      ]),
      el("div", { class: "dcard-sub" }, `${s.triggers.length} variantes`),
    ]),
    el("div", { class: "trigger-list" },
      s.triggers.map(t => el("div", { class: "tr" }, t))
    )
  ]) : null;

  // Env block
  const env = s.requires_env || [];
  const envBlock = env.length ? el("section", { class: "dcard" }, [
    el("div", { class: "dcard-hd" }, [
      el("div", { class: "dcard-title" }, [
        el("span", { class: "num" }, "04"),
        document.createTextNode("Variables d'environnement"),
      ]),
      el("div", { class: "dcard-sub" }, `${env.length} requise${env.length > 1 ? "s" : ""}`),
    ]),
    el("div", { class: "req-list" },
      env.map(k => el("div", { class: "req-row" }, [
        el("div", {}, [
          el("div", { class: "req-key" }, k),
          el("div", { class: "req-key-sub" }, window.JARVIS_ENV_HELP[k] || "À renseigner dans ton .env Jarvis local."),
        ]),
        el("div", { class: "req-val" }, [
          el("span", { class: "mask" }, "•••••••"),
          el("span", {}, "MASQUÉE"),
        ]),
      ]))
    )
  ]) : null;

  // Apps block
  const appsBlock = reqApps.length ? el("section", { class: "dcard" }, [
    el("div", { class: "dcard-hd" }, [
      el("div", { class: "dcard-title" }, [
        el("span", { class: "num" }, "05"),
        document.createTextNode("Apps requises"),
      ]),
      el("div", { class: "dcard-sub" }, `${reqApps.length} à installer`),
    ]),
    el("div", { class: "req-list" },
      reqApps.map(a => el("div", { class: "req-row" }, [
        el("div", { class: "req-key" }, a.name),
        el("a", { class: "req-val", href: a.url, target: "_blank", rel: "noopener", style: "text-decoration:none;color:var(--accent)" }, [
          document.createTextNode("Télécharger"),
          el("span", { class: "arr", style: "margin-left:6px" }, "↗"),
        ])
      ]))
    )
  ]) : null;

  const left = el("div", {}, [
    el("section", { class: "dcard" }, [
      el("div", { class: "dcard-hd" }, [
        el("div", { class: "dcard-title" }, [
          el("span", { class: "num" }, "01"),
          document.createTextNode("Installation"),
        ]),
        el("div", { class: "dcard-sub" }, "Dis-le à Jarvis"),
      ]),
      buildInstallBox(phrase),
    ]),
    capsBlock,
    triggersBlock,
    envBlock,
    appsBlock,
  ].filter(Boolean));

  const right = el("div", {}, [
    el("section", { class: "dcard" }, [
      el("div", { class: "dcard-hd" }, [
        el("div", { class: "dcard-title" }, [
          el("span", { class: "num" }, "·"),
          document.createTextNode("Métadonnées"),
        ]),
        el("div", { class: "dcard-sub" }, "skill.yaml"),
      ]),
      buildMetaList(s),
    ]),
    el("section", { class: "dcard" }, [
      el("div", { class: "dcard-hd" }, [
        el("div", { class: "dcard-title" }, [
          el("span", { class: "num" }, "·"),
          document.createTextNode("Source"),
        ]),
        el("div", { class: "dcard-sub" }, "github.com"),
      ]),
      el("div", { style: "display:flex;flex-direction:column;gap:8px" }, isView(s) ? [
        sourceLink("Voir view.js", `${REPO_URL}/blob/main/${s.path}/view.js`),
        sourceLink("Voir VIEW.md", `${REPO_URL}/blob/main/${s.path}/VIEW.md`),
        sourceLink("Voir tool.py", `${REPO_URL}/blob/main/${s.path}/tool.py`),
        sourceLink("Voir dans le repo", `${REPO_URL}/tree/main/${s.path}`),
      ] : [
        sourceLink("Voir skill.yaml", `${REPO_URL}/blob/main/${s.path}/skill.yaml`),
        sourceLink("Voir skill.py", `${REPO_URL}/blob/main/${s.path}/skill.py`),
        sourceLink("Voir dans le repo", `${REPO_URL}/tree/main/${s.path}`),
      ])
    ])
  ]);

  return el("div", { class: "wrap detail" + (isPreset(s) ? " is-preset" : "") + (isView(s) ? " is-view" : "") }, [
    el("a", { class: "detail-back", href: isView(s) ? "#/views" : "#/" }, [
      el("span", { class: "arr" }, "←"),
      document.createTextNode("Retour au catalogue"),
    ]),
    el("section", { class: "detail-hero" }, [
      el("div", { class: "detail-glyph" }, skillGlyph(s)),
      el("div", { class: "detail-hero-id" }, [
        el("div", { class: "detail-eyebrow" }, [
          el("span", { class: "v" }, isPreset(s) ? "PRESET" : isView(s) ? "VUE" : "SKILL"),
          el("span", { class: "sep" }, "·"),
          el("span", {}, "v" + s.version),
          el("span", { class: "sep" }, "·"),
          el("span", { class: "detail-author" }, s.author),
        ]),
        el("h1", { class: "detail-name" }, s.name),
        el("p", { class: "detail-desc" }, s.description),
      ]),
      el("div", { class: "detail-hero-r" }, [
        el("div", {}, "Plateformes"),
        el("div", { class: "plats-row" },
          plats(s).map(({ p, on }) => el("span", { class: "p" + (on ? " on" : "") }, p))
        ),
      ])
    ]),
    el("div", { class: "detail-body" }, [left, right])
  ]);
}

function buildInstallBox(phrase) {
  const copyBtn = el("button", { class: "install-copy" }, "Copier");
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(phrase); } catch (e) {}
    copyBtn.classList.add("is-ok");
    copyBtn.textContent = "Copié";
    setTimeout(() => { copyBtn.classList.remove("is-ok"); copyBtn.textContent = "Copier"; }, 1600);
  });
  return el("div", { class: "install" }, [
    el("div", { class: "install-l" }, [
      el("div", { class: "install-lbl" }, "Phrase à dire à Jarvis"),
      el("div", { class: "install-cmd" }, [
        el("span", { class: "quote" }, "» "),
        document.createTextNode(phrase),
      ]),
    ]),
    copyBtn,
  ]);
}

function buildMetaList(s) {
  const rows = [];
  rows.push(["Type", isPreset(s) ? "PRESET" : isView(s) ? "VUE" : "SKILL", isPreset(s) ? "gold" : isView(s) ? "green" : "accent"]);
  rows.push(["Version", "v" + s.version]);
  rows.push(["Auteur", s.author]);
  if (s.tags && s.tags.length) rows.push(["Tags", null, null, s.tags]);
  if (s.requires_tools && s.requires_tools.length) rows.push(["Tools", s.requires_tools.join(" · ")]);
  return el("div", { class: "meta-list" },
    rows.map(([k, v, klass, tags]) => el("div", { class: "meta-row" }, [
      el("div", { class: "meta-key" }, k),
      tags
        ? el("div", { class: "tag-list" }, tags.map(t => el("span", { class: "tag" }, t)))
        : el("div", { class: "meta-val" }, [
            klass ? el("span", { class: klass }, v) : document.createTextNode(v)
          ])
    ]))
  );
}

function sourceLink(label, url) {
  return el("a", {
    href: url, target: "_blank", rel: "noopener",
    style: "font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;color:var(--fg-1);text-decoration:none;padding:8px 10px;border:1px solid var(--line-1);border-radius:6px;display:flex;justify-content:space-between;align-items:center;transition:all .15s ease"
  }, [
    document.createTextNode(label),
    el("span", { style: "color:var(--fg-3)" }, "↗"),
  ]);
}

// Augment detail with live yaml info if present (steps count, jarvis_min_version, etc.)
function augmentDetail(s, yaml) {
  if (!yaml) return;
  const metaList = $(".detail-body .meta-list");
  if (metaList && yaml.jarvis_min_version) {
    metaList.appendChild(el("div", { class: "meta-row" }, [
      el("div", { class: "meta-key" }, "Jarvis min"),
      el("div", { class: "meta-val" }, "≥ " + yaml.jarvis_min_version),
    ]));
  }
  if (metaList && Array.isArray(yaml.steps)) {
    metaList.appendChild(el("div", { class: "meta-row" }, [
      el("div", { class: "meta-key" }, "Étapes"),
      el("div", { class: "meta-val" }, String(yaml.steps.length).padStart(2, "0")),
    ]));
  }
}

// ──────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────
window.addEventListener("hashchange", () => {
  renderApp();
  window.scrollTo({ top: 0, behavior: "instant" });
});
document.addEventListener("DOMContentLoaded", renderApp);
