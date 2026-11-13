// Numéro de version affiché dans la barre latérale (voir CHANGELOG.md).
const VERSION = "2.0.0";
// Les 4 types de blocs d'une fiche : clé -> libellé affiché.
const TYPES = { C: "CONFIG", S: "SHOW", T: "TROUBLESHOOT", D: "DEBUG" };
// Les 4 vues de l'application : [identifiant (aussi utilisé dans l'URL : #ref, #fav…), libellé].
const NAV = [
  ["guide", "📘 Guide"],
  ["ref", "📚 Référence"],
  ["fav", "⭐ Favoris"],
  ["quiz", "🎯 Entraînement"],
];
const LEVELS = [
  ["CCNA", "CCNA"],
  ["ENCOR", "CCNP ENCOR"],
];
const CATS = [
  ["sec", "Sécurité"],
  ["svc", "Services"],
];
const LVL = { req: "Obligatoire", reco: "Recommandé", opt: "Optionnel" };
// Exemples affichés en grisé dans les champs de variables du Guide.
const EX = {
  HOSTNAME: "R1",
  INTERFACE: "gi0/1",
  VLAN_ID: "10",
  VLAN_NAME: "USERS",
  IP_ADDRESS: "192.168.1.1",
  SUBNET_MASK: "255.255.255.0",
  NETWORK: "192.168.1.0",
  WILDCARD: "0.0.0.255",
  AREA: "0",
  PROCESS_ID: "1",
  ROUTER_ID: "1.1.1.1",
  NEXT_HOP: "10.0.0.2",
  USERNAME: "admin",
  DOMAIN_NAME: "lab.local",
  GROUP: "10",
  VIRTUAL_IP: "192.168.1.254",
  PEER_IP: "203.0.113.2",
  LOCAL_AS: "65001",
  REMOTE_AS: "65002",
};

// Raccourcis.
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const enc = encodeURIComponent;
const dec = decodeURIComponent;
// Lecture / écriture dans localStorage (sans planter si le navigateur le bloque).
const ls = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};
const byId = (id) => D.find((t) => t.id == id);
// Lignes non vides d'un texte de commandes.
const lines = (s) => (s || "").split("\n").filter(Boolean);
// Échappe le HTML pour afficher du texte brut sans risque (y compris dans un attribut).
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// État de l'application.
const st = {
  view: "guide", // vue active : guide, ref, fav ou quiz
  q: "", // texte de la recherche
  gid: ls.get("gid", null), // fiche ouverte dans le Guide
  open: new Set(), // prérequis dont l'aperçu est déplié (Guide)
  exp: new Set(), // fiches dépliées (Référence)
  // Filtres de la Référence : niveaux, catégories, types de blocs, affichage (cards ou list).
  f: Object.assign({ lv: [], cat: [], types: [], mode: "cards" }, ls.get("flt", {})),
  rec: ls.get("rec", []), // recherches récentes
  vars: ls.get("vars", {}), // valeurs saisies pour les <VARIABLES>
  vo: ls.get("varsOpen", null), // panneau des variables ouvert ou fermé (null = pas encore choisi)
  // Favoris : { k: la commande (précédée de ses lignes parentes), id: fiche d'origine }.
  // Ils sont rangés sous la clé « favs2 ». Au premier lancement, ceux de la v1 (clé « favs », de simples
  // textes) sont repris en retrouvant leur fiche d'origine ; la v1 archivée dans /v1/ garde les siens.
  favs: (ls.get("favs2", null) || ls.get("favs", [])).map((f) =>
    typeof f == "string"
      ? {
          k: f,
          id:
            (
              D.find((t) =>
                [t.config, t.show, t.troubleshoot, t.debug].some((s) => lines(s).includes(f)),
              ) || {}
            ).id || "",
        }
      : f,
  ),
};

// Découpe la recherche en mots : tous doivent être présents pour qu'une ligne corresponde.
const tokens = () => st.q.toLowerCase().split(/\s+/).filter(Boolean);
// Remplace les <VARIABLES> par les valeurs saisies dans le Guide (texte copié).
const fill = (s) => s.replace(/<([A-Z_0-9]+)>/g, (m, v) => st.vars[v] || m);

// Coloration d'une ligne : commentaires (!), <VARIABLES> (ou leur valeur), nombres/IP et premier mot.
function hl(l) {
  if (l.trim().startsWith("!")) return `<span class="cm">${esc(l)}</span>`;
  const h = esc(l).replace(/&lt;([A-Z_0-9]+)&gt;|(\b\d[\d.\/:]*\b)/g, (m, v, n) =>
    v
      ? st.vars[v]
        ? `<span class="vv" title="&lt;${v}&gt;">${esc(st.vars[v])}</span>`
        : `<span class="vr">${m}</span>`
      : `<span class="nm">${n}</span>`,
  );
  return h.replace(/^(\s*)([a-z][\w-]*)/, '$1<span class="k">$2</span>');
}

// Transforme un texte de commandes en lignes : { l: la ligne, cm: commentaire ?, p: lignes parentes, pi: leurs positions }.
// Une ligne indentée dépend des lignes moins indentées qui la précèdent (interface … puis ses sous-commandes).
function parse(txt, sid) {
  const stack = [];
  return lines(txt).map((l, i) => {
    const cm = l.trim().startsWith("!");
    const it = { l, cm, p: "", pi: [], sid };
    if (cm) return it;
    const ind = l.length - l.trimStart().length;
    while (stack.length && stack[stack.length - 1].ind >= ind) stack.pop();
    it.p = stack.map((s) => s.l).join("\n");
    it.pi = stack.map((s) => s.i);
    stack.push({ ind, l, i });
    return it;
  });
}
// Clé d'un favori : la commande précédée de ses lignes parentes.
const favKey = (it) => (it.p ? it.p + "\n" : "") + it.l;
const isFav = (k) => st.favs.some((f) => f.k == k);

// Une ligne de commande avec son bouton favori (★/☆). Les commentaires n'en ont pas.
function row(it) {
  if (it.cm) return `<div class="l"><span class="t">${hl(it.l)}</span></div>`;
  const k = favKey(it),
    f = isFav(k);
  return `<div class="l"><span class="t">${hl(it.l) || " "}</span><button class="st${f ? " f" : ""}" data-fav="${enc(k)}" data-sid="${it.sid || ""}" title="${f ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="Favori" aria-pressed="${f}">${f ? "★" : "☆"}</button></div>`;
}
// Un bloc de commandes (CONFIG, SHOW, TROUBLESHOOT ou DEBUG) avec son bouton Copier.
function blk(type, items, prompt, label) {
  if (!items.length) return "";
  return `
    <div class="blk">
      <div class="bh ${type}">
        <span>${label || TYPES[type]}</span>
        <em>${prompt ? esc(prompt) + (type == "C" ? "(config)" : "") + "#" : ""}</em>
        <button data-copy="${enc(items.map((i) => i.l).join("\n"))}">Copier</button>
      </div>
      <pre>${items.map(row).join("")}</pre>
    </div>`;
}
const tags = (t) =>
  `<span class="tag ${t.level}">${t.level == "ENCOR" ? "CCNP ENCOR" : t.level}</span>${t.category ? `<span class="tag">${t.category == "sec" ? "SÉCURITÉ" : "SERVICES"}</span>` : ""}`;

// ================= GUIDE =================
// Une grande fiche par protocole : schéma, variables, étapes numérotées, exemples de sortie, pièges.
const guides = () => D.filter((t) => t.guide);
// Lien vers la fiche d'un protocole.
const glink = (t, txt) => `<a href="#guide/${t.id}">${esc(txt || t.name)}</a>`;
// Une fiche correspond-elle à la recherche ? (nom, description, étapes, pièges)
function gmatch(t, tk) {
  const txt = [
    t.name,
    t.description,
    ...t.guide.steps.map((s) => [s.title, s.note, s.config, s.verify].join(" ")),
    ...(t.guide.pitfalls || []),
  ]
    .join(" ")
    .toLowerCase();
  return tk.every((w) => txt.includes(w));
}
const gname = (t, tk) => tk.every((w) => t.name.toLowerCase().includes(w));
// Pendant la saisie d'une recherche : ouvre la fiche qui correspond le mieux (le nom d'abord).
function gjump() {
  const tk = tokens();
  if (!tk.length) return;
  const M = guides().filter((t) => gmatch(t, tk));
  if (!M.length) return;
  const cur = byId(st.gid),
    best = M.find((t) => gname(t, tk)) || M[0];
  if (!M.includes(cur) || (!gname(cur, tk) && gname(best, tk))) {
    st.gid = best.id;
    st.open.clear();
    window.scrollTo(0, 0);
  }
}
// Config d'une fiche sous forme de lignes, avec le titre de chaque étape en commentaire.
// onlyReq : uniquement les étapes obligatoires (aperçu des prérequis).
function allCfg(t, onlyReq) {
  return t.guide.steps
    .filter((s) => !onlyReq || s.level == "req")
    .flatMap((s, i) => [
      `! ${i + 1}. ${s.title}${s.prompt && s.prompt != t.prompt ? " (" + s.prompt + ")" : ""}`,
      ...lines(s.config),
    ]);
}
// Exemples de sortie (extras.js) des commandes d'un bloc de vérification.
function outs(verify) {
  return lines(verify)
    .filter((c) => X.out[c])
    .map(
      (c) => `
      <details class="out">
        <summary>Exemple de sortie : <code>${esc(fill(c))}</code></summary>
        <pre class="raw">${esc(X.out[c].out)}</pre>
        <p><b>À lire :</b> ${esc(X.out[c].read)}</p>
      </details>`,
    )
    .join("");
}
// Étapes numérotées d'une fiche.
function stepsHTML(t) {
  return t.guide.steps
    .map(
      (s, i) => `${s.section ? `<h3 class="gsec">${esc(s.section)}</h3>` : ""}
      <div class="step">
        <div class="sh"><span class="num">${i + 1}</span><h3>${esc(s.title)}</h3><span class="lvl ${s.level}">${LVL[s.level]}</span></div>
        ${s.note ? `<p>${esc(s.note)}</p>` : ""}
        ${blk("C", parse(s.config, t.id), s.prompt || t.prompt)}
        ${s.verify ? blk("S", parse(s.verify, t.id), s.prompt || t.prompt, "VÉRIFIER") + outs(s.verify) : ""}
      </div>`,
    )
    .join("");
}
// <VARIABLES> utilisées dans une fiche, dans l'ordre d'apparition.
const varsOf = (t) => [
  ...new Set(
    t.guide.steps.flatMap((s) => (s.config + "\n" + (s.verify || "")).match(/<[A-Z_0-9]+>/g) || []),
  ),
].map((v) => v.slice(1, -1));
const varsCount = (names) =>
  `${names.filter((v) => st.vars[v]).length}/${names.length} renseignée${names.length > 1 ? "s" : ""}`;
// Panneau des variables : les valeurs saisies remplacent les <VARIABLES> à l'écran et dans le texte copié.
function varsPanel(t) {
  const names = varsOf(t);
  if (!names.length) return "";
  const open = st.vo == null ? matchMedia("(min-width: 821px)").matches : st.vo;
  return `
    <details class="vars" id="vars" ${open ? "open" : ""}>
      <summary>Variables <small id="vcount">${varsCount(names)}</small></summary>
      <p>Saisis tes valeurs : elles remplacent les <span class="vr">&lt;VARIABLES&gt;</span> dans les commandes affichées et copiées. Elles sont gardées d'une fiche à l'autre.</p>
      <div class="vgrid">${names
        .map(
          (v) =>
            `<label><span>${v}</span><input data-var="${v}" value="${esc(st.vars[v] || "")}" placeholder="${esc(EX[v] || "")}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`,
        )
        .join("")}</div>
      <button data-a="vclear">Effacer les valeurs</button>
    </details>`;
}
// Affiche le Guide : liste des protocoles à gauche (menu déroulant sur mobile), fiche détaillée à droite.
function guide() {
  const G = guides(),
    tk = tokens();
  if (!byId(st.gid) || !byId(st.gid).guide) st.gid = G[0].id;
  const t = byId(st.gid);
  // L'URL suit la fiche ouverte : #guide/<id> (partageable, et conservée au rechargement).
  const h = "#guide/" + t.id;
  if (location.hash != h) history.replaceState(null, "", h);
  ls.set("last", h);
  ls.set("gid", t.id);
  // Fiches qui correspondent à la recherche.
  const M = tk.length ? G.filter((x) => gmatch(x, tk)) : G;
  const list = LEVELS.map(([lv, lab]) => {
    const L = M.filter((x) => x.level == lv);
    return L.length
      ? `<h3>${lab}</h3>${L.map((x) => `<a href="#guide/${x.id}" class="${x.id == t.id ? "on" : ""}">${esc(x.name)}<small>${x.guide.steps.length}</small></a>`).join("")}`
      : "";
  }).join("");
  // Menu déroulant (mobile) : lui aussi filtré par la recherche.
  const S = M.includes(t) ? M : [t, ...M];
  const sel = `<select id="gsel" aria-label="Choisir une fiche">${LEVELS.map(([lv, lab]) => {
    const L = S.filter((x) => x.level == lv);
    return L.length
      ? `<optgroup label="${lab}">${L.map((x) => `<option value="${x.id}" ${x.id == t.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`
      : "";
  }).join("")}</select>`;
  const info = tk.length
    ? `<p class="ginfo">${M.length ? `${M.length} fiche${M.length > 1 ? "s" : ""} pour « ${esc(st.q)} »` : `Aucune fiche ne correspond à « ${esc(st.q)} ».`}</p>`
    : "";
  // Prérequis : lien + bouton ▸ qui déplie les étapes obligatoires sur place.
  const req = (t.requires || []).map(byId).filter(Boolean);
  const reqBar = req.length
    ? `<div class="gbar"><b>Nécessite</b>${req
        .map(
          (r) =>
            `<span class="chip">${glink(r)}<button data-pre="${r.id}" aria-expanded="${st.open.has(r.id)}" title="Aperçu des étapes obligatoires">${st.open.has(r.id) ? "▾" : "▸"}</button></span>`,
        )
        .join('<i aria-hidden="true">+</i>')}</div>${req
        .filter((r) => st.open.has(r.id))
        .map(
          (r) =>
            `<div class="pre"><div class="pre-h">Étapes obligatoires de <b>${esc(r.name)}</b> · ${glink(r, "ouvrir la fiche complète →")}</div>${blk("C", parse(allCfg(r, true).join("\n"), r.id), r.prompt)}</div>`,
        )
        .join("")}`
    : "";
  const pit = t.guide.pitfalls && t.guide.pitfalls.length
    ? `<div class="pit"><h3>⚠ Pièges courants</h3><ul>${t.guide.pitfalls.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`
    : "";
  // « Utilisé par » : fiches dont les requires contiennent celle-ci.
  const used = D.filter((x) => (x.requires || []).includes(t.id));
  const usedBar = used.length
    ? `<div class="gbar used"><b>Utilisé par</b>${used.map((x) => `<span class="chip">${glink(x)}</span>`).join("")}</div>`
    : "";
  const nq = Q.filter((q) => q.t == t.id).length;
  $("#out").innerHTML = `
    <div class="guide">
      <div class="glist" role="navigation" aria-label="Fiches">${info}${list}</div>
      <div class="gmob">${sel}${info}</div>
      <article class="card gcard">
        <h2>${esc(t.name)} ${tags(t)}</h2>
        <p>${esc(t.description)}</p>
        ${X.topo[t.id] ? `<details class="topo" open><summary>Schéma</summary><pre class="raw">${esc(X.topo[t.id])}</pre></details>` : ""}
        ${reqBar}
        ${varsPanel(t)}
        <div class="acts">
          <button class="pri" data-copy="${enc(allCfg(t).join("\n"))}">Copier toute la config</button>
          ${nq ? `<a class="btn" href="#quiz" data-qt="${t.id}">🎯 S'entraîner sur ce thème (${nq})</a>` : ""}
        </div>
        <div id="gsteps">${stepsHTML(t)}</div>
        ${pit}
        ${usedBar}
      </article>
    </div>`;
}

// ================= RÉFÉRENCE =================
// Toutes les fiches en aide-mémoire (repliées par défaut), ou la liste à plat des commandes de vérification.
// Garde les lignes qui correspondent à la recherche (et leurs lignes parentes), sans répéter une commande déjà vue.
function filt(L, tk, name, seen) {
  const keep = new Set();
  L.forEach((it, i) => {
    const c = it.l.trim();
    if (it.cm || seen.has(c)) return;
    if (tk.every((x) => (it.l + " " + name).toLowerCase().includes(x))) {
      seen.add(c);
      keep.add(i);
      it.pi.forEach((p) => keep.add(p));
    }
  });
  return L.filter((it, i) => keep.has(i));
}
function ref() {
  const tk = tokens(),
    f = st.f;
  const items = D.filter(
    (t) => (!f.lv.length || f.lv.includes(t.level)) && (!f.cat.length || f.cat.includes(t.category)),
  );
  if (f.mode == "list") return refList(items, tk);
  const types = f.types.length ? Object.keys(TYPES).filter((k) => f.types.includes(k)) : Object.keys(TYPES);
  const out = [];
  items.forEach((t) => {
    const secs = { C: t.config, S: t.show, T: t.troubleshoot, D: t.debug };
    const head = (t.name + " " + t.level + " " + t.description).toLowerCase();
    // Si le nom ou la description correspond, toute la fiche s'affiche ; sinon seules les lignes qui correspondent.
    const hit = tk.length && tk.every((x) => head.includes(x));
    const open = tk.length ? true : st.exp.has(t.id);
    const seen = new Set();
    let body = "",
      n = 0;
    types.forEach((k) => {
      let L = parse(secs[k], t.id);
      if (tk.length && !hit) L = filt(L, tk, t.name, seen);
      n += L.filter((i) => !i.cm).length;
      if (open) body += blk(k, L, t.prompt);
    });
    if (!n) return;
    out.push(`
      <div class="card rc${open ? " x" : ""}${tk.length ? " s" : ""}">
        <h2><button class="rch" data-exp="${t.id}" aria-expanded="${open}" ${tk.length ? "disabled" : ""}><span>${esc(t.name)}</span>${tags(t)}<i class="chev" aria-hidden="true">${tk.length ? "" : open ? "▾" : "▸"}</i></button></h2>
        <p${open ? "" : ' class="clip"'}>${esc(t.description)}</p>
        ${open ? `<div class="rcb">${body}</div><a class="more" href="#guide/${t.id}">Ouvrir le guide pas à pas →</a>` : `<small class="rn">${n} commande${n > 1 ? "s" : ""}</small>`}
      </div>`);
  });
  const s = out.length > 1 ? "s" : "";
  $("#out").innerHTML = out.length
    ? `<div class="rtool"><span>${out.length} fiche${s}${tk.length ? ` pour « ${esc(st.q)} »` : ""}</span>${tk.length ? "" : `<button data-a="expall">Tout déplier</button><button data-a="colall">Tout replier</button>`}</div><div class="grid">${out.join("")}</div>`
    : `<div class="empty">${tk.length ? `Aucune commande ne correspond à « ${esc(st.q)} » avec ces filtres. Essaie un seul mot, comme « ospf » ou « vlan ».` : "Aucune fiche ne correspond à ces filtres."}</div>`;
}
// Liste à plat, sans doublon, des commandes show / troubleshoot / debug des fiches filtrées.
function refList(items, tk) {
  const f = st.f,
    sel = f.types.filter((k) => k != "C"),
    types = ["S", "T", "D"].filter((k) => !sel.length || sel.includes(k)),
    key = { S: "show", T: "troubleshoot", D: "debug" },
    seen = new Set();
  let n = 0;
  const body = types
    .map((k) => {
      const L = [];
      items.forEach((t) =>
        parse(t[key[k]], t.id).forEach((it) => {
          if (it.cm || seen.has(it.l) || !tk.every((x) => it.l.toLowerCase().includes(x))) return;
          seen.add(it.l);
          L.push(it);
        }),
      );
      n += L.length;
      return blk(k, L, "");
    })
    .join("");
  $("#out").innerHTML = n
    ? `<div class="card"><h2>Commandes de vérification <span class="tag">${n}</span></h2><p>Les commandes show, troubleshoot et debug des fiches sélectionnées, sans doublon. Les commandes de configuration dépendent de leur contexte : elles restent dans l'affichage par fiches.</p>${body}</div>`
    : `<div class="empty">Aucune commande ne correspond${tk.length ? ` à « ${esc(st.q)} »` : ""} avec ces filtres.</div>`;
}

// ================= FAVORIS =================
// Les commandes marquées d'une étoile, regroupées par fiche d'origine.
function fav() {
  if (!st.favs.length) {
    $("#out").innerHTML =
      `<div class="empty">Aucun favori pour l'instant.<br>Clique sur l'étoile ☆ à droite d'une commande, dans le Guide ou la Référence, pour la retrouver ici.</div>`;
    return;
  }
  const tk = tokens();
  const F = st.favs.filter((f) => tk.every((x) => f.k.toLowerCase().includes(x)));
  const groups = [];
  F.forEach((f) => {
    let g = groups.find((x) => x.id == f.id);
    if (!g) groups.push((g = { id: f.id, L: [] }));
    g.L.push(f);
  });
  const body = groups
    .map((g) => {
      const t = byId(g.id);
      const rows = g.L.map((f) => {
        const L = f.k.split("\n"),
          last = L.pop();
        // Les lignes parentes (interface …) sont rappelées en grisé au-dessus de la commande.
        return `<div class="fv">${L.map((p) => `<div class="l par"><span class="t">${hl(p)}</span></div>`).join("")}<div class="l"><span class="t">${hl(last)}</span><button class="st f" data-fav="${enc(f.k)}" title="Retirer des favoris" aria-label="Retirer des favoris">★</button></div></div>`;
      }).join("");
      return `
        <div class="card">
          <h2>${t ? `${glink(t)} ${tags(t)}` : "Autres commandes"}</h2>
          <div class="blk">
            <div class="bh S"><span>FAVORIS</span><em></em><button data-copy="${enc(g.L.map((f) => f.k).join("\n"))}">Copier</button></div>
            <pre>${rows}</pre>
          </div>
        </div>`;
    })
    .join("");
  $("#out").innerHTML = F.length
    ? `<div class="rtool"><span>${F.length} favori${F.length > 1 ? "s" : ""}${tk.length ? ` pour « ${esc(st.q)} »` : ""}</span><button data-copy="${enc(F.map((f) => f.k).join("\n"))}">Tout copier</button><button data-a="favclear">Tout supprimer</button></div><div class="grid">${body}</div>`
    : `<div class="empty">Aucun favori ne correspond à « ${esc(st.q)} ».</div>`;
}

// ================= ENTRAÎNEMENT (QCM) =================
// Les questions sont dans quiz.js. Les réussites et erreurs sont mémorisées dans le navigateur.
const qz = {
  stats: ls.get("quiz", {}), // par question : { n: tentatives, ok: réussites, last: dernière tentative réussie ? }
  // Réglages de l'écran d'accueil : niveau, type de question, thème, nombre de questions (0 = toutes).
  cfg: Object.assign({ lv: "all", k: "all", t: "all", n: 10 }, ls.get("quizcfg", {})),
  run: null, // session en cours : { list, i, sel, ord, done, res }
};
// Catégories du QCM : les niveaux Cisco, plus les autres valeurs de lv présentes dans quiz.js (ex. CSNE).
const QLV = [...LEVELS, ...[...new Set(Q.map((q) => q.lv))].filter((v) => !LEVELS.some(([k]) => k == v)).map((v) => [v, v])];
const qtName = (t) => (byId(t) || {}).name || QT[t] || t;
// Questions qui correspondent aux réglages (skip : réglage à ignorer).
const qpool = (skip) =>
  Q.filter(
    (q) =>
      (qz.cfg.lv == "all" || q.lv == qz.cfg.lv) &&
      (qz.cfg.k == "all" || q.k == qz.cfg.k) &&
      (skip == "t" || qz.cfg.t == "all" || q.t == qz.cfg.t),
  );
// Questions ratées à la dernière tentative.
const qwrong = () => Q.filter((q) => qz.stats[q.id] && !qz.stats[q.id].last);
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Démarre une session avec une liste de questions.
function qstart(list) {
  if (!list.length) return;
  qz.run = { list, i: 0, res: [] };
  qnext(0);
}
// Passe à la question i : mélange ses réponses et vide la sélection.
function qnext(i) {
  const r = qz.run;
  r.i = i;
  r.done = false;
  r.sel = new Set();
  // Les réponses sont mélangées, sauf si la question demande de garder l'ordre (fix : Vrai / Faux).
  if (i < r.list.length) {
    const ord = r.list[i].o.map((_, j) => j);
    r.ord = r.list[i].fix ? ord : shuffle(ord);
  }
  render();
  window.scrollTo(0, 0);
}
// Énoncé : le texte entre `accents graves` devient du code.
const qtext = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
// Une réponse : texte simple, ou commandes colorées (une par ligne).
const qopt = (q, j) =>
  q.cmd
    ? `<span class="oc">${q.o[j]
        .split("\n")
        .map((l) => `<span>${hl(l)}</span>`)
        .join("")}</span>`
    : esc(q.o[j]);
function quiz() {
  const r = qz.run;
  if (!r) return qhome();
  if (r.i >= r.list.length) return qend();
  const q = r.list[r.i],
    multi = q.a.length > 1,
    good = r.done && r.res[r.i].ok;
  const opts = r.ord
    .map((j, n) => {
      const sel = r.sel.has(j),
        ok = q.a.includes(j);
      // Après validation : bonne réponse cochée, bonne réponse oubliée, mauvaise réponse cochée.
      const cls = r.done ? (ok ? (sel ? " good" : " miss") : sel ? " bad" : "") : sel ? " sel" : "";
      return `<button class="opt${cls}" data-o="${j}" role="${multi ? "checkbox" : "radio"}" aria-checked="${sel}" ${r.done ? "disabled" : ""}><span class="ol">${"ABCDEFGH"[n]}</span><span class="ob">${qopt(q, j)}</span><span class="om">${r.done ? (ok ? "✓" : sel ? "✗" : "") : ""}</span></button>`;
    })
    .join("");
  $("#out").innerHTML = `
    <div class="card qcard">
      <div class="qtop">
        <b>Question ${r.i + 1} / ${r.list.length}</b>
        <span class="tag ${q.lv}">${q.lv == "ENCOR" ? "CCNP ENCOR" : q.lv}</span>
        <span class="tag">${esc(qtName(q.t))}</span>
        <span class="tag">${q.k == "sit" ? "Mise en situation" : "Théorie"}</span>
        <button data-a="qquit">Quitter</button>
      </div>
      <div class="qbar"><i style="width:${(100 * (r.i + (r.done ? 1 : 0))) / r.list.length}%"></i></div>
      <p class="qq">${qtext(q.q)}</p>
      ${q.ctx ? `<pre class="raw qctx">${esc(q.ctx)}</pre>` : ""}
      <p class="qhint">${multi ? `Plusieurs réponses : choisis-en ${q.a.length}.` : "Une seule réponse."}</p>
      <div class="opts">${opts}</div>
      ${
        r.done
          ? `<div class="why ${good ? "ok" : "ko"}"><b>${good ? "✓ Bonne réponse" : "✗ Mauvaise réponse"}</b>${q.why ? `<p>${esc(q.why)}</p>` : ""}${byId(q.t) ? `<a href="#guide/${q.t}">Revoir la fiche ${esc(qtName(q.t))} →</a>` : ""}</div>
             <div class="acts"><button class="pri" data-a="qnext">${r.i + 1 < r.list.length ? "Question suivante" : "Voir le résultat"}</button></div>`
          : `<div class="acts"><button class="pri" data-a="qcheck" ${r.sel.size ? "" : "disabled"}>Valider</button></div>`
      }
    </div>`;
}
// Valide la réponse : juste seulement si toutes les bonnes réponses, et elles seules, sont cochées.
function qcheck() {
  const r = qz.run,
    q = r.list[r.i];
  if (r.done || !r.sel.size) return;
  const ok = r.sel.size == q.a.length && q.a.every((j) => r.sel.has(j));
  const s = qz.stats[q.id] || (qz.stats[q.id] = { n: 0, ok: 0 });
  s.n++;
  s.ok += ok ? 1 : 0;
  s.last = ok;
  ls.set("quiz", qz.stats);
  r.res[r.i] = { q, ok };
  r.done = true;
  render();
}
// Barre de progression d'un thème : part des questions réussies à la dernière tentative.
function qbar(ok, n) {
  return `<span class="tbar"><i style="width:${n ? (100 * ok) / n : 0}%"></i></span><small>${ok}/${n}</small>`;
}
// Écran d'accueil : statistiques, réglages, progression par thème.
function qhome() {
  const c = qz.cfg,
    pool = qpool(),
    seen = Q.filter((q) => qz.stats[q.id]),
    tries = seen.reduce((a, q) => a + qz.stats[q.id].n, 0),
    oks = seen.reduce((a, q) => a + qz.stats[q.id].ok, 0),
    wrong = qwrong();
  // Thèmes proposés : ceux qui ont des questions avec le niveau et le type choisis.
  const topics = [...new Set(qpool("t").map((q) => q.t))];
  if (c.t != "all" && !topics.includes(c.t)) c.t = "all";
  const chips = (key, list) =>
    list
      .map(([v, l]) => `<button class="${c[key] == v ? "on" : ""}" data-qc="${key}:${v}">${l}</button>`)
      .join("");
  const n = c.n ? Math.min(c.n, pool.length) : pool.length;
  // Progression par thème (tous les thèmes, du moins maîtrisé au plus maîtrisé une fois commencé).
  const prog = [...new Set(Q.map((q) => q.t))]
    .map((t) => {
      const L = Q.filter((q) => q.t == t);
      return { t, n: L.length, ok: L.filter((q) => qz.stats[q.id] && qz.stats[q.id].last).length, seen: L.filter((q) => qz.stats[q.id]).length };
    })
    .sort((a, b) => (b.seen > 0) - (a.seen > 0) || a.ok / a.n - b.ok / b.n);
  $("#out").innerHTML = `
    <div class="card qcard">
      <h2>Entraînement</h2>
      <p>${Q.length} questions à choix unique ou multiple, réparties en ${QLV.length} catégories : ${QLV.map(([, l]) => l).join(", ")}. ${Math.round((100 * Q.filter((q) => q.k == "sit").length) / Q.length)} % sont des mises en situation : un besoin ou une panne, et les commandes à choisir. Chaque réponse est expliquée.</p>
      <div class="tiles">
        <div><b>${seen.length}<small> / ${Q.length}</small></b><span>questions vues</span></div>
        <div><b>${tries ? Math.round((100 * oks) / tries) + " %" : "–"}</b><span>de réussite</span></div>
        <div><b>${wrong.length}</b><span>à revoir</span></div>
      </div>
      <div class="qcfg">
        <div><span>Catégorie</span>${chips("lv", [["all", "Toutes"], ...QLV])}</div>
        <div><span>Type</span>${chips("k", [["all", "Tous"], ["sit", "Mises en situation"], ["th", "Théorie"]])}</div>
        <div><span>Thème</span><select id="qtopic" aria-label="Thème"><option value="all">Tous les thèmes</option>${topics
          .map((t) => `<option value="${t}" ${c.t == t ? "selected" : ""}>${esc(qtName(t))} (${qpool("t").filter((q) => q.t == t).length})</option>`)
          .join("")}</select></div>
        <div><span>Questions</span>${chips("n", [[10, "10"], [20, "20"], [0, "Toutes"]])}</div>
      </div>
      <div class="acts">
        <button class="pri" data-a="qgo" ${pool.length ? "" : "disabled"}>Commencer (${n} question${n > 1 ? "s" : ""})</button>
        ${wrong.length ? `<button data-a="qwrong">Revoir mes erreurs (${wrong.length})</button>` : ""}
        ${seen.length ? `<button data-a="qreset">Remettre mes statistiques à zéro</button>` : ""}
      </div>
      <p class="qnote">Les questions jamais vues ou ratées la dernière fois sont proposées en premier.</p>
      <h3 class="gsec">Progression par thème</h3>
      <div class="prog">${prog.map((p) => `<button data-qc="t:${p.t}" title="Choisir ce thème"><span>${esc(qtName(p.t))}</span>${qbar(p.ok, p.n)}</button>`).join("")}</div>
    </div>`;
}
// Écran de fin : score, détail par thème, correction des questions ratées.
function qend() {
  const r = qz.run,
    n = r.res.length,
    ok = r.res.filter((x) => x.ok).length,
    pct = Math.round((100 * ok) / n),
    bad = r.res.filter((x) => !x.ok);
  const by = [...new Set(r.res.map((x) => x.q.t))].map((t) => {
    const L = r.res.filter((x) => x.q.t == t);
    return `<div><span>${esc(qtName(t))}</span>${qbar(L.filter((x) => x.ok).length, L.length)}</div>`;
  });
  $("#out").innerHTML = `
    <div class="card qcard">
      <h2>Résultat : ${ok} / ${n} <span class="tag ${pct >= 80 ? "okt" : ""}">${pct} %</span></h2>
      <p>${pct == 100 ? "Sans faute." : pct >= 80 ? "Solide. Revois les quelques questions ratées ci-dessous." : pct >= 50 ? "La base est là. Reprends les fiches des thèmes ratés, puis refais les questions." : "Reprends les fiches des thèmes ci-dessous avant de retenter."}</p>
      <div class="prog static">${by.join("")}</div>
      <div class="acts">
        ${bad.length ? `<button class="pri" data-a="qretry">Refaire les questions ratées (${bad.length})</button>` : ""}
        <button ${bad.length ? "" : 'class="pri"'} data-a="qquit">Nouvelle session</button>
      </div>
      ${
        bad.length
          ? `<h3 class="gsec">Correction</h3>${bad
              .map(
                ({ q }) => `
        <div class="corr">
          <p class="qq">${qtext(q.q)}</p>
          ${q.a.map((j) => `<div class="opt good static"><span class="ol">✓</span><span class="ob">${qopt(q, j)}</span></div>`).join("")}
          ${q.why ? `<p>${esc(q.why)}</p>` : ""}
          ${byId(q.t) ? `<a href="#guide/${q.t}">Revoir la fiche ${esc(qtName(q.t))} →</a>` : ""}
        </div>`,
              )
              .join("")}`
          : ""
      }
    </div>`;
}
// Actions des boutons de l'entraînement.
function qact(a) {
  const r = qz.run;
  if (a == "qgo") {
    // Priorité aux questions ratées la dernière fois, puis à celles jamais vues.
    const rank = (q) => (!qz.stats[q.id] ? 1 : qz.stats[q.id].last ? 2 : 0);
    const L = shuffle(qpool()).sort((a, b) => rank(a) - rank(b));
    return qstart(shuffle(qz.cfg.n ? L.slice(0, qz.cfg.n) : L));
  }
  if (a == "qwrong") return qstart(shuffle(qwrong()));
  if (a == "qretry") return qstart(shuffle(r.res.filter((x) => !x.ok).map((x) => x.q)));
  if (a == "qcheck") return qcheck();
  if (a == "qnext") return qnext(r.i + 1);
  if (a == "qquit") {
    qz.run = null;
    render();
    return window.scrollTo(0, 0);
  }
  if (a == "qreset" && confirm("Effacer toutes tes statistiques d'entraînement ?")) {
    qz.stats = {};
    ls.set("quiz", qz.stats);
    render();
  }
}

// ================= INTERFACE COMMUNE =================
const VIEWS = { guide, ref, fav, quiz };
// Redessine le contenu de la vue active.
function render() {
  VIEWS[st.view]();
}
// Menu latéral (avec le nombre de favoris).
function navUI() {
  $("#nav").innerHTML = NAV.map(
    ([k, l]) =>
      `<a href="#${k == "guide" && st.gid ? "guide/" + st.gid : k}" class="${st.view == k ? "on" : ""}" ${st.view == k ? 'aria-current="page"' : ""}>${l}${k == "fav" && st.favs.length ? `<small>${st.favs.length}</small>` : ""}</a>`,
  ).join("");
}
// Recherches récentes.
function recUI() {
  $("#rec").innerHTML =
    st.rec.length && st.view != "quiz"
      ? "Récent :" + st.rec.map((r) => `<button data-r="${enc(r)}">${esc(r)}</button>`).join("")
      : "";
}
// Filtres de la Référence. Seuls les filtres qui ont un effet dans l'affichage choisi sont proposés.
function fltUI() {
  if (st.view != "ref") return ($("#flt").innerHTML = "");
  const f = st.f,
    chips = (key, list) =>
      list
        .map(
          ([v, l]) =>
            `<button class="${f[key].includes(v) ? "on" : ""}" data-f="${key}:${v}" aria-pressed="${f[key].includes(v)}">${l}</button>`,
        )
        .join("");
  $("#flt").innerHTML = `
    <div class="fg"><span>Niveau</span>${chips("lv", LEVELS)}</div>
    <div class="fg"><span>Catégorie</span>${chips("cat", CATS)}</div>
    <div class="fg"><span>Type</span>${chips("types", Object.entries(TYPES).filter(([k]) => f.mode == "cards" || k != "C"))}</div>
    <div class="fg"><span>Affichage</span>${[["cards", "Fiches"], ["list", "Liste de commandes"]].map(([v, l]) => `<button class="${f.mode == v ? "on" : ""}" data-m="${v}" aria-pressed="${f.mode == v}">${l}</button>`).join("")}</div>`;
}
const PH = {
  guide: "ospf, trunk, etherchannel…",
  ref: "ospf neighbor, show vlan…",
  fav: "filtrer mes favoris…",
};
// Redessine le menu, la recherche, les filtres, puis le contenu.
function ui() {
  navUI();
  $(".hero").hidden = st.view == "quiz";
  $("#q").placeholder = PH[st.view] || "";
  fltUI();
  recUI();
  // Hauteur de la zone de recherche collante : la liste du Guide se colle juste en dessous.
  document.documentElement.style.setProperty("--hh", $(".hero").offsetHeight + "px");
  render();
}
// Lit l'URL (#guide/<id>, #ref, #fav, #quiz) et affiche la vue correspondante.
function route() {
  const [v, id] = location.hash.slice(1).split("/");
  const view = VIEWS[v] ? v : "guide";
  if (view == "guide" && id && byId(id) && byId(id).guide && id != st.gid) {
    st.gid = id;
    st.open.clear();
    window.scrollTo(0, 0);
  }
  if (view != st.view) window.scrollTo(0, 0);
  st.view = view;
  document.body.dataset.view = view;
  if (VIEWS[v]) ls.set("last", location.hash);
  $("aside").classList.remove("open");
  $("#burger").setAttribute("aria-expanded", "false");
  ui();
}
addEventListener("hashchange", route);

// Copie le texte dans le presse-papiers (avec une solution de secours pour les anciens navigateurs).
function copy(t, b) {
  const ok = () => {
    const o = b.textContent;
    b.textContent = "Copié ✓";
    setTimeout(() => (b.textContent = o), 1200);
  };
  const fb = () => {
    const a = document.createElement("textarea");
    a.value = t;
    document.body.appendChild(a);
    a.select();
    try {
      document.execCommand("copy");
      ok();
    } catch (e) {}
    a.remove();
  };
  navigator.clipboard ? navigator.clipboard.writeText(t).then(ok, fb) : fb();
}
// Applique le thème mémorisé (clair / sombre), sinon celui du système.
function theme(t) {
  if (t) document.documentElement.dataset.theme = t;
}
// Gestion centralisée des clics, d'après l'attribut data-* de l'élément cliqué.
document.addEventListener("click", (e) => {
  const aside = $("aside");
  // Lien « S'entraîner sur ce thème » : règle le thème du QCM avant d'y aller.
  const qt = e.target.closest("a[data-qt]");
  if (qt) {
    Object.assign(qz.cfg, { t: qt.dataset.qt, lv: "all", k: "all" });
    ls.set("quizcfg", qz.cfg);
    qz.run = null;
  }
  const b = e.target.closest("button");
  // Menu mobile : se referme si on clique en dehors de la barre latérale.
  if (aside.classList.contains("open") && !e.target.closest("aside")) aside.classList.remove("open");
  if (!b) return;
  const d = b.dataset;
  // Bouton hamburger : ouvre / ferme le menu déroulant.
  if (b.id == "burger") return b.setAttribute("aria-expanded", aside.classList.toggle("open"));
  // Thème clair / sombre, mémorisé.
  if (b.id == "th") {
    const el = document.documentElement,
      dark = el.dataset.theme ? el.dataset.theme == "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
    theme(dark ? "light" : "dark");
    return ls.set("theme", el.dataset.theme);
  }
  // Copier : les <VARIABLES> renseignées sont remplacées par leur valeur.
  if (d.copy) return copy(fill(dec(d.copy)), b);
  // Étoile : ajoute ou retire un favori, sans redessiner la page (sauf dans la vue Favoris).
  if (d.fav) {
    const k = dec(d.fav),
      i = st.favs.findIndex((f) => f.k == k);
    i < 0 ? st.favs.push({ k, id: d.sid || "" }) : st.favs.splice(i, 1);
    ls.set("favs2", st.favs);
    navUI();
    if (st.view == "fav") return render();
    return $$(".st").forEach((x) => {
      if (x.dataset.fav != d.fav) return;
      x.classList.toggle("f", i < 0);
      x.textContent = i < 0 ? "★" : "☆";
      x.title = i < 0 ? "Retirer des favoris" : "Ajouter aux favoris";
      x.setAttribute("aria-pressed", i < 0);
    });
  }
  // Guide : déplie / replie l'aperçu d'un prérequis.
  if (d.pre) {
    st.open.has(d.pre) ? st.open.delete(d.pre) : st.open.add(d.pre);
    return render();
  }
  // Référence : filtres (niveau, catégorie, type), affichage, fiche dépliée.
  if (d.f) {
    const [key, v] = d.f.split(":"),
      a = st.f[key],
      i = a.indexOf(v);
    i < 0 ? a.push(v) : a.splice(i, 1);
    ls.set("flt", st.f);
    return ui();
  }
  if (d.m) {
    st.f.mode = d.m;
    ls.set("flt", st.f);
    return ui();
  }
  if (d.exp) {
    st.exp.has(d.exp) ? st.exp.delete(d.exp) : st.exp.add(d.exp);
    return render();
  }
  // Recherche récente.
  if (d.r) {
    $("#q").value = st.q = dec(d.r);
    if (st.view == "guide") gjump();
    return render();
  }
  // Entraînement : réglage, réponse cochée.
  if (d.qc) {
    const [key, v] = d.qc.split(":");
    qz.cfg[key] = key == "n" ? +v : v;
    ls.set("quizcfg", qz.cfg);
    render();
    return key == "t" ? window.scrollTo(0, 0) : 0;
  }
  if (d.o) {
    const r = qz.run,
      j = +d.o;
    if (r.list[r.i].a.length > 1) r.sel.has(j) ? r.sel.delete(j) : r.sel.add(j);
    else r.sel = new Set([j]);
    return render();
  }
  // Autres actions.
  const a = d.a;
  if (!a) return;
  if (a[0] == "q") return qact(a);
  if (a == "expall" || a == "colall") {
    st.exp = new Set(a == "expall" ? D.map((t) => t.id) : []);
    return render();
  }
  if (a == "favclear" && confirm("Supprimer tous tes favoris ?")) {
    st.favs = [];
    ls.set("favs2", st.favs);
    return ui();
  }
  if (a == "vclear") {
    varsOf(byId(st.gid)).forEach((v) => delete st.vars[v]);
    ls.set("vars", st.vars);
    render();
  }
});
// Barre de recherche : filtre à chaque frappe, mémorise la recherche à la validation.
const q = $("#q");
q.addEventListener("input", () => {
  st.q = q.value;
  // Dans le Guide, la fiche qui correspond le mieux s'ouvre toute seule.
  if (st.view == "guide") gjump();
  render();
});
q.addEventListener("change", () => {
  const v = q.value.trim();
  if (v) {
    st.rec = [v, ...st.rec.filter((x) => x != v)].slice(0, 8);
    ls.set("rec", st.rec);
    // Affichage différé : si la recherche est validée par un clic ailleurs dans la page,
    // la barre « Récent » ne doit pas décaler la mise en page sous le pointeur pendant ce clic.
    setTimeout(() => {
      recUI();
      document.documentElement.style.setProperty("--hh", $(".hero").offsetHeight + "px");
    }, 300);
  }
});
// Champs de variables du Guide : met à jour les commandes pendant la saisie, sans perdre le curseur.
document.addEventListener("input", (e) => {
  const v = e.target.dataset && e.target.dataset.var;
  if (!v) return;
  e.target.value.trim() ? (st.vars[v] = e.target.value.trim()) : delete st.vars[v];
  ls.set("vars", st.vars);
  const t = byId(st.gid),
    open = $$("#gsteps details").map((x) => x.open);
  $("#gsteps").innerHTML = stepsHTML(t);
  $$("#gsteps details").forEach((x, i) => (x.open = open[i]));
  $("#vcount").textContent = varsCount(varsOf(t));
});
// Menus déroulants : fiche du Guide (mobile) et thème de l'entraînement.
document.addEventListener("change", (e) => {
  if (e.target.id == "gsel") location.hash = "#guide/" + e.target.value;
  if (e.target.id == "qtopic") {
    qz.cfg.t = e.target.value;
    ls.set("quizcfg", qz.cfg);
    render();
  }
});
// Mémorise si le panneau des variables est ouvert ou fermé.
document.addEventListener(
  "toggle",
  (e) => {
    if (e.target.id == "vars") ls.set("varsOpen", (st.vo = e.target.open));
  },
  true,
);
// Raccourcis clavier : « / » pour chercher, Échap pour effacer ; dans le QCM, A-F ou 1-6 pour cocher, Entrée pour valider.
document.addEventListener("keydown", (e) => {
  const typing = document.activeElement.matches("input, select, textarea");
  if (e.key == "/" && !typing && st.view != "quiz") {
    e.preventDefault();
    return q.focus();
  }
  if (e.key == "Escape" && document.activeElement == q && q.value) {
    q.value = st.q = "";
    return render();
  }
  const r = qz.run;
  if (st.view != "quiz" || !r || r.i >= r.list.length || typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key == "Enter") {
    e.preventDefault();
    return qact(r.done ? "qnext" : "qcheck");
  }
  const n = "abcdefgh".indexOf(e.key.toLowerCase()) + 1 || +e.key;
  const b = n && $$(".opts .opt")[n - 1];
  if (b && !r.done) b.click();
});

// Démarrage : thème mémorisé, puis la vue indiquée dans l'URL, sinon la dernière vue utilisée, sinon le Guide.
theme(ls.get("theme", ""));
$("#ver").textContent = "v" + VERSION;
if (!location.hash) {
  const last = ls.get("last", "");
  if (last) history.replaceState(null, "", last);
}
route();
