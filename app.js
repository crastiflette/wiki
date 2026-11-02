// Les 4 types de blocs d'une fiche : clé -> libellé affiché.
const TYPES = { C: "CONFIG", S: "SHOW", T: "TROUBLESHOOT", D: "DEBUG" };
// Entrées du menu latéral : [identifiant de la vue, libellé].
// Les vues CCNA / ENCOR / sec / svc filtrent les fiches ; TS, ALL, FAV et TRAIN sont des vues spéciales.
const NAV = [
  ["all", "Tout"],
  ["CCNA", "CCNA"],
  ["ENCOR", "CCNP ENCOR"],
  ["sec", "Security"],
  ["svc", "Services"],
  ["TS", "Troubleshooting"],
  ["ALL", "All commands"],
  ["FAV", "⭐ Favoris"],
  ["TRAIN", "🎯 Entraînement"],
];
// Raccourci pour document.querySelector.
const $ = (s) => document.querySelector(s);
// État de l'application : vue active, recherche, types filtrés, favoris et historique de recherche.
const st = { view: "all", q: "", types: new Set(), favs: [], rec: [] };
// Lecture / écriture dans localStorage (sans planter si le navigateur le bloque).
const ls = {
  get(k, d) {
    try {
      return JSON.parse(localStorage.getItem(k)) || d;
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
st.favs = ls.get("favs", []);
st.rec = ls.get("rec", []);
// Échappe le HTML pour afficher du texte brut sans risque.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Coloration syntaxique d'une ligne : commentaires (!), <VARIABLES>, nombres/IP et premier mot (la commande).
function hl(l) {
  if (l.trim().startsWith("!")) return `<span class="cm">${esc(l)}</span>`;
  let h = esc(l).replace(/(&lt;[A-Z_0-9]+&gt;)|(\b\d[\d.\/:]*\b)/g, (m, v, n) =>
    v ? `<span class="vr">${v}</span>` : `<span class="nm">${n}</span>`,
  );
  return h.replace(/^(\s*)([a-z][\w-]*)/, '$1<span class="k">$2</span>');
}
// Une ligne de commande avec son bouton favori (★/☆). Les lignes indentées et les commentaires n'en ont pas.
function line(l) {
  const cmd = !l.startsWith(" ") && !l.trim().startsWith("!");
  const f = st.favs.includes(l);
  return `<div class="l"><span class="t">${hl(l) || " "}</span>${cmd ? `<button class="st ${f ? "f" : ""}" data-fav="${encodeURIComponent(l)}" title="Favori">${f ? "★" : "☆"}</button>` : ""}</div>`;
}
// Un bloc de commandes (CONFIG, SHOW, TROUBLESHOOT ou DEBUG) avec son bouton Copy.
function blk(type, ls_, prompt) {
  if (!ls_.length) return "";
  return `
    <div class="blk">
<div class="bh ${type}">
  <span>${TYPES[type]}</span>
  <em>${prompt}${type == "C" ? "(config)" : ""}#</em>
  <button data-copy="${encodeURIComponent(ls_.join("\n"))}">Copy</button>
</div>
<pre>${ls_.map(line).join("")}</pre>
    </div>`;
}
// Découpe la recherche en mots : tous doivent être présents pour qu'une commande corresponde.
function tokens() {
  return st.q.toLowerCase().split(/\s+/).filter(Boolean);
}
// Affiche la zone principale selon la vue active et la recherche.
// Si le nom ou la description d'une fiche correspond, toute la fiche s'affiche ; sinon seules les lignes qui correspondent.
function render() {
  if (st.view == "TRAIN") return train();
  const tk = tokens(),
    out = [];
  const types = st.types.size ? [...st.types] : Object.keys(TYPES);
  let items = D.filter(
    (t) =>
      st.view == "all" ||
      st.view == "TS" ||
      st.view == "ALL" ||
      st.view == "FAV" ||
      t.level == st.view ||
      t.category == st.view,
  );
  if (st.view == "FAV") {
    let f = st.favs.filter((c) => tk.every((x) => c.toLowerCase().includes(x)));
    $("#out").innerHTML = f.length
      ? `<div class="card"><div class="blk"><div class="bh S"><span>FAVORIS</span><button data-copy="${encodeURIComponent(f.join("\n"))}">Copy</button></div><pre>${f.map(line).join("")}</pre></div></div>`
      : `<div class="empty">Aucun favori. Clique sur ☆ à côté d'une commande pour l'ajouter.</div>`;
    return;
  }
  if (st.view == "ALL") {
    const seen = new Set(),
      all = [];
    D.forEach((t) =>
      [t.show, t.troubleshoot].forEach((txt) =>
        txt.split("\n").forEach((l) => {
          if (
            l &&
            !seen.has(l) &&
            (!tk.length || tk.every((x) => l.toLowerCase().includes(x)))
          ) {
            seen.add(l);
            all.push(l);
          }
        }),
      ),
    );
    $("#out").innerHTML =
      `<div class="card"><h2>SHOW COMMANDS <span class="tag">${all.length}</span></h2><div class="blk"><div class="bh S"><span>SHOW</span><button data-copy="${encodeURIComponent(all.join("\n"))}">Copy</button></div><pre>${all.map(line).join("")}</pre></div></div>`;
    return;
  }
  items.forEach((t) => {
    const { name: n, level: lv, category: cat, description: desc } = t,
      secs = { C: t.config, S: t.show, T: t.troubleshoot, D: t.debug };
    const th = (n + " " + lv + " " + cat + " " + desc).toLowerCase();
    const hit = tk.length && tk.every((x) => th.includes(x));
    let body = "";
    (st.view == "TS" ? ["T", "D"] : types).forEach((k) => {
      let L = secs[k].split("\n").filter(Boolean);
      if (tk.length && !hit)
        L = L.filter((l) => tk.every((x) => (l + " " + n).toLowerCase().includes(x)));
      body += blk(k, L, t.prompt);
    });
    if (body)
      out.push(`
<div class="card">
  <h2>
    ${n}
    <span class="tag ${lv}">${lv}</span>
    ${cat ? `<span class="tag">${cat == "sec" ? "SECURITY" : "SERVICES"}</span>` : ""}
  </h2>
  <p>${desc}</p>
  ${body}
</div>`);
  });
  $("#out").innerHTML = out.length
    ? `<div class="grid">${out.join("")}</div>`
    : `<div class="empty">Aucune commande ne correspond à « ${esc(st.q)} ». Essaie un seul mot, comme « ospf » ou « vlan ».</div>`;
}
// Redessine le menu, les filtres, l'historique, puis le contenu.
function ui() {
  $("#nav").innerHTML = NAV.map(
    ([k, l]) => `<button class="${st.view == k ? "on" : ""}" data-v="${k}">${l}</button>`,
  ).join("");
  const T_ = st.view == "TRAIN";
  document.querySelector(".prompt").style.display = T_ ? "none" : "";
  $("#flt").innerHTML = T_
    ? "Difficulté :" +
      DIFF.map(
        ([k, l]) => `<button class="${tr.mode == k ? "on" : ""}" data-d="${k}">${l}</button>`,
      ).join("")
    : "Type :" +
      Object.entries(TYPES)
        .map(
          ([k, l]) =>
            `<button class="${st.types.has(k) ? "on" : ""}" data-t="${k}">${l}</button>`,
        )
        .join("");
  $("#rec").innerHTML =
    st.rec.length && !T_
      ? "Récent :" +
        st.rec
          .map((r) => `<button data-r="${encodeURIComponent(r)}">${esc(r)}</button>`)
          .join("")
      : "";
  render();
}
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
// Gestion centralisée des clics, d'après l'attribut data-* du bouton :
// data-copy, data-fav, data-v (vue), data-t (type), data-r (recherche récente), data-d (difficulté), data-a (action d'entraînement).
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.copy) return copy(decodeURIComponent(b.dataset.copy), b);
  if (b.dataset.fav) {
    const c = decodeURIComponent(b.dataset.fav),
      i = st.favs.indexOf(c);
    i < 0 ? st.favs.push(c) : st.favs.splice(i, 1);
    ls.set("favs", st.favs);
    return render();
  }
  if (b.dataset.v) {
    st.view = b.dataset.v;
    return ui();
  }
  if (b.dataset.t) {
    st.types.has(b.dataset.t) ? st.types.delete(b.dataset.t) : st.types.add(b.dataset.t);
    return ui();
  }
  if (b.dataset.r) {
    $("#q").value = st.q = decodeURIComponent(b.dataset.r);
    return render();
  }
  if (b.dataset.d) {
    tr.mode = b.dataset.d;
    newEx();
    return ui();
  }
  if (b.dataset.a) return act(b.dataset.a);
  if (b.id == "th") {
    const d = document.documentElement,
      dark = d.dataset.theme
        ? d.dataset.theme == "dark"
        : matchMedia("(prefers-color-scheme:dark)").matches;
    d.dataset.theme = dark ? "light" : "dark";
  }
});
// Barre de recherche : filtre à chaque frappe, mémorise la recherche à la validation.
const q = $("#q");
q.addEventListener("input", () => {
  st.q = q.value;
  render();
});
q.addEventListener("change", () => {
  const v = q.value.trim();
  if (v) {
    st.rec = [v, ...st.rec.filter((x) => x != v)].slice(0, 8);
    ls.set("rec", st.rec);
    $("#rec").innerHTML =
      "Récent :" +
      st.rec
        .map((r) => `<button data-r="${encodeURIComponent(r)}">${esc(r)}</button>`)
        .join("");
  }
});
// Raccourci clavier : "/" place le curseur dans la barre de recherche.
document.addEventListener("keydown", (e) => {
  if (e.key == "/" && !document.activeElement.matches("input")) {
    e.preventDefault();
    q.focus();
  }
});
// ================= MODE ENTRAÎNEMENT =================
// Un protocole est tiré au hasard ; certaines lignes de sa configuration sont à retrouver.
const DIFF = [
  ["easy", "Facile"],
  ["mid", "Moyen"],
  ["hard", "Difficile"],
];
const sv = ls.get("score", {});
// État de l'entraînement : difficulté, exercice en cours, score (sauvegardé dans le navigateur).
const tr = {
  mode: "easy",
  ex: null,
  done: false,
  ok: sv.ok || 0,
  tot: sv.tot || 0,
  streak: sv.streak || 0,
  best: sv.best || 0,
  base: null,
  sol: false,
  first: false,
};
// Tire un nouveau protocole et choisit les lignes à masquer selon la difficulté.
function newEx() {
  const pool = D.filter(
    (t) => t.config.split("\n").filter((l) => l && !l.trim().startsWith("!")).length >= 3,
  );
  let t;
  do {
    t = pool[Math.floor(Math.random() * pool.length)];
  } while (pool.length > 1 && tr.ex && tr.ex.t === t);
  const L = t.config.split("\n").filter(Boolean);
  const cand = L.map((l, i) => i).filter((i) => !L[i].trim().startsWith("!"));
  const n = Math.max(
    2,
    Math.round(cand.length * { easy: 0.34, mid: 0.67, hard: 1 }[tr.mode]),
  );
  const pick = new Set(
    cand.sort(() => Math.random() - 0.5).slice(0, Math.min(n, cand.length)),
  );
  tr.ex = { t, L, pick };
  tr.done = false;
  tr.base = null;
  tr.sol = false;
  tr.first = false;
}
// Affiche l'exercice : lignes fixes + champs de saisie pour les lignes masquées.
function train() {
  if (!tr.ex) newEx();
  const { t, L, pick } = tr.ex;
  const rows = L.map((l, i) => {
    if (!pick.has(i)) return `<div class="l"><span class="t">${hl(l) || " "}</span></div>`;
    const ind = l.length - l.trimStart().length;
    return `<div class="l tr"><span class="ind">${" ".repeat(ind)}</span><input data-i="${i}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Ligne ${i + 1}"><span class="mk"></span></div>`;
  }).join("");
  $("#out").innerHTML = `
    <div class="card tcard">
<h2>${t.name} <span class="tag ${t.level}">${t.level}</span></h2>
<p>
  ${t.description} Complète les lignes vides. Les abréviations IOS (int gi0/1)
  sont acceptées, et n'importe quelle valeur remplace une
  <span class="vr">&lt;VARIABLE&gt;</span>.
</p>
<div class="blk">
  <div class="bh C">
    <span>CONFIG</span>
    <em>${t.prompt}(config)#</em>
    <b class="sc"></b>
  </div>
  <pre>${rows}</pre>
</div>
<div class="acts">
  <button class="pri" data-a="check">Vérifier</button>
  <button data-a="hint">Indice</button>
  <button data-a="sol">Solution</button>
  <button data-a="next">Autre protocole</button>
  <button data-a="reset">Remettre le score à zéro</button>
</div>
<div id="fb" class="fb"></div>
    </div>`;
  score();
  const f = document.querySelector(".tr input");
  if (f && matchMedia("(hover:hover)").matches) f.focus();
}
// Compare un mot attendu (e) à un mot saisi (u) : accepte les <VARIABLES>, les abréviations IOS (gi0/1) et ignore la casse.
function wordOK(e, u) {
  if (/<[A-Z_0-9]+>/.test(e))
    return new RegExp(
      "^" +
        e
          .split(/(<[A-Z_0-9]+>)/)
          .map((p, i) => (i % 2 ? ".+" : p.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")))
          .join("") +
        "$",
      "i",
    ).test(u);
  e = e.toLowerCase();
  u = u.toLowerCase();
  if (e == u) return true;
  const a = e.match(/^([a-z-]+)(.*)$/),
    b = u.match(/^([a-z-]+)(.*)$/);
  return !!(a && b && b[1].length >= 2 && a[1].startsWith(b[1]) && a[2] == b[2]);
}
// Une ligne est correcte si elle a le même nombre de mots et que chaque mot est accepté.
function lineOK(e, u) {
  const E = e.trim().split(/\s+/),
    U = u.trim().split(/\s+/);
  return E.length == U.length && E.every((w, i) => wordOK(w, U[i]));
}
// Colore un champ (ok / ko / sol) et affiche ✓ ou ✗.
function mark(i, c) {
  i.className = c;
  i.nextElementSibling.textContent = c == "ko" ? "✗" : c == "ok" ? "✓" : "";
}
function fb(m) {
  document.getElementById("fb").textContent = m;
}
function score() {
  const e = document.querySelector(".sc");
  if (e)
    e.textContent =
      "Score " +
      tr.ok +
      "/" +
      tr.tot +
      (tr.tot ? " (" + Math.round((100 * tr.ok) / tr.tot) + "%)" : "") +
      " · série " +
      tr.streak +
      " · record " +
      tr.best;
  ls.set("score", { ok: tr.ok, tot: tr.tot, streak: tr.streak, best: tr.best });
}
// Actions des boutons : next, reset, hint, sol (solution) et check (vérifier + mise à jour du score).
function act(a) {
  if (a == "next") {
    newEx();
    return train();
  }
  if (a == "reset") {
    tr.ok = tr.tot = tr.streak = tr.best = 0;
    tr.base = null;
    score();
    return fb("Score remis à zéro.");
  }
  const ins = [...document.querySelectorAll(".tr input")],
    L = tr.ex.L;
  if (a == "hint")
    return ins.forEach((i) => {
      if (!i.value) i.placeholder = L[i.dataset.i].trim().split(/\s+/)[0] + " …";
    });
  if (a == "sol") {
    ins.forEach((i) => {
      i.value = L[i.dataset.i].trim();
      mark(i, "sol");
    });
    tr.done = true;
    tr.sol = true;
    if (!tr.base) {
      tr.base = { ok: tr.ok, tot: tr.tot, streak: tr.streak };
      tr.tot += ins.length;
    }
    tr.streak = 0;
    score();
    return fb(
      "Solution affichée : cet exercice ne rapporte aucun point. Relis chaque ligne, puis passe à un autre protocole.",
    );
  }
  if (ins.every((i) => !i.value.trim()))
    return fb("Remplis au moins une ligne avant de vérifier.");
  let ok = 0;
  ins.forEach((i) => {
    const g = lineOK(L[i.dataset.i], i.value);
    if (g) ok++;
    mark(i, g ? "ok" : "ko");
  });
  if (!tr.sol) {
    if (!tr.base) {
      tr.base = { ok: tr.ok, tot: tr.tot, streak: tr.streak };
      tr.first = ok == ins.length;
    }
    tr.done = true;
    tr.ok = tr.base.ok + ok;
    tr.tot = tr.base.tot + ins.length;
    tr.streak = tr.first ? tr.base.streak + 1 : 0;
    tr.best = Math.max(tr.best, tr.streak);
    score();
  }
  fb(
    ok == ins.length
      ? "Parfait, toutes les lignes sont correctes."
      : ok +
          "/" +
          ins.length +
          " correctes. Corrige les lignes en rouge, puis vérifie à nouveau.",
  );
}
document.addEventListener("keydown", (e) => {
  if (e.key != "Enter" || !e.target.matches || !e.target.matches(".tr input")) return;
  const a = [...document.querySelectorAll(".tr input")],
    i = a.indexOf(e.target);
  e.preventDefault();
  i < a.length - 1 ? a[i + 1].focus() : act("check");
});
// Démarrage.
ui();
