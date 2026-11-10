const AREAS = {g:"Geschichte Österreichs", d:"Demokratische Grundordnung", w:"Landesgeschichte Wien"};
const AREA_EN = {g:"Austrian history", d:"Democratic order", w:"Vienna history"};
const app = document.getElementById("app");
let S = {}; // session state
let showEn = true;

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// Official scoring: any wrong tick = 0; otherwise share of correct answers ticked
function score(q, sel) {
  if (sel.some(i => !q.c.includes(i))) return 0;
  return sel.length / q.c.length;
}
const fmt = n => (Math.round(n * 100) / 100).toLocaleString("de-AT");

// Shuffle answer order per question, remapping correct indices
function prep(q) {
  const order = shuffle([0, 1, 2, 3]);
  return {...q, o: order.map(i => q.o[i]), c: order.map((i, k) => q.c.includes(i) ? k : -1).filter(k => k >= 0)};
}

function home() {
  app.innerHTML = `
  <section class="card">
    <h2>So funktioniert die Prüfung</h2>
    <div class="rules">
      <div class="rule"><b>18 Fragen</b><span>6 per area: Austrian history, democratic order, Vienna</span></div>
      <div class="rule"><b>1 bis 3 richtig</b><span>4 answers each; at least 1 and at most 3 are correct</span></div>
      <div class="rule"><b>12 oder 3·3·3</b><span>Pass with 12 of 18 points in total, <i>or</i> 3+ points in every area</span></div>
    </div>
    <p class="note"><em>The trap:</em> one wrong tick makes the whole question worth 0. If you tick only some of the correct answers, you get partial points (1 of 2 = 0.5). So only tick what you're sure of.</p>
  </section>
  <section class="card">
    <h2>Modus wählen</h2>
    <div class="modes">
      <button class="mode" data-m="exam"><b>Prüfungssimulation</b><span>18 random questions, scored like the real exam. Results at the end.</span></button>
      <button class="mode" data-m="all"><b>Übungsmodus</b><span>All ${Q.length} questions with instant feedback and explanations.</span></button>
    </div>
    <div class="chips">
      <span style="font-size:13px;color:var(--muted);align-self:center">Nur ein Gebiet üben:</span>
      ${Object.keys(AREAS).map(k => `<button class="chip" data-m="${k}">${AREAS[k]} (${Q.filter(q => q.a === k).length})</button>`).join("")}
    </div>
    <label class="toggle"><input type="checkbox" id="en" ${showEn ? "checked" : ""}> Show English translations and explanations</label>
  </section>`;
  app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => start(b.dataset.m));
  document.getElementById("en").onchange = e => showEn = e.target.checked;
}

function start(m) {
  let list;
  if (m === "exam") list = ["g", "d", "w"].flatMap(k => shuffle(Q.filter(q => q.a === k)).slice(0, 6));
  else if (m === "all") list = shuffle(Q);
  else if (m === "retry") list = shuffle(S.missed);
  else list = shuffle(Q.filter(q => q.a === m));
  S = {mode: m === "exam" ? "exam" : "practice", qs: list.map(prep), i: 0, sel: list.map(() => []), checked: list.map(() => false)};
  render();
}

function render() {
  const q = S.qs[S.i], sel = S.sel[S.i], done = S.checked[S.i], n = S.qs.length;
  const fb = done ? feedback(q, sel) : "";
  app.innerHTML = `
  <section class="card">
    <div class="bar"><span class="tag">${AREAS[q.a]}</span><span>Frage ${S.i + 1} von ${n}</span></div>
    <div class="progress"><i style="width:${(S.i + 1) / n * 100}%"></i></div>
    <p class="qtext">${esc(q.q)}</p>
    ${showEn ? `<p class="en">${esc(q.en)}</p>` : ""}
    <p class="hint">Kreuzen Sie alle richtigen Antworten an (1 bis 3).</p>
    <div class="opts">${q.o.map((o, k) => {
      let cls = sel.includes(k) ? "sel" : "";
      if (done) { cls += " locked"; if (q.c.includes(k)) cls += sel.includes(k) ? " right" : " missed"; else if (sel.includes(k)) cls += " wrong"; }
      return `<div class="opt ${cls}" data-k="${k}"><span class="box"></span><span>${esc(o)}</span></div>`;
    }).join("")}</div>
    ${fb}
    <div class="actions">
      <button class="btn ghost" id="back" ${S.i === 0 ? "disabled" : ""}>← Zurück</button>
      <span style="display:flex;gap:10px">
        <button class="btn ghost" id="quit">Beenden</button>
        ${S.mode === "practice" && !done
          ? `<button class="btn" id="check" ${sel.length ? "" : "disabled"}>Prüfen</button>`
          : `<button class="btn" id="next">${S.i === n - 1 ? (S.mode === "exam" ? "Abgeben" : "Ergebnis") : "Weiter →"}</button>`}
      </span>
    </div>
  </section>`;
  if (!done) app.querySelectorAll(".opt").forEach(el => el.onclick = () => {
    const k = +el.dataset.k, s = S.sel[S.i];
    S.sel[S.i] = s.includes(k) ? s.filter(x => x !== k) : [...s, k];
    render();
  });
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on("back", () => { S.i--; render(); });
  on("quit", () => S.checked.some(Boolean) || S.mode === "exam" ? results() : home());
  on("check", () => { S.checked[S.i] = true; render(); });
  on("next", () => { if (S.i < n - 1) { S.i++; render(); } else results(); });
}

function feedback(q, sel) {
  const p = score(q, sel);
  const cls = p === 1 ? "good" : p === 0 ? "bad" : "part";
  const head = p === 1 ? "Richtig! 1 Punkt" : p === 0 ? (sel.some(i => !q.c.includes(i)) ? "0 Punkte: a wrong tick cancels the whole question" : "0 Punkte") : `Teilweise richtig: ${fmt(p)} Punkte (some correct answers missing)`;
  return `<div class="feedback ${cls}"><b>${head}</b>${showEn ? esc(q.x) : "Richtig: " + q.c.map(k => esc(q.o[k])).join(", ")}</div>`;
}

function results() {
  const idx = S.qs.map((_, i) => i).filter(i => S.mode === "exam" || S.checked[i]);
  const pts = i => score(S.qs[i], S.sel[i]);
  const by = {g: 0, d: 0, w: 0}, cnt = {g: 0, d: 0, w: 0};
  idx.forEach(i => { by[S.qs[i].a] += pts(i); cnt[S.qs[i].a]++; });
  const total = idx.reduce((s, i) => s + pts(i), 0);
  S.missed = idx.filter(i => pts(i) < 1).map(i => Q.find(o => o.q === S.qs[i].q));

  let verdict = "";
  if (S.mode === "exam") {
    const each = ["g", "d", "w"].every(k => by[k] >= 3), sum = total >= 12, pass = each || sum;
    const why = pass
      ? (sum && each ? "You passed both ways: 12+ points in total and 3+ in every area." : sum ? "You passed on the total: 12+ points, even though one area was under 3." : "You passed on the per-area rule: 3+ points in each area, even though the total was under 12.")
      : `You need ${fmt(Math.max(0, 12 - total))} more points in total, or at least 3 in ${["g", "d", "w"].filter(k => by[k] < 3).map(k => AREA_EN[k]).join(" and ")}.`;
    verdict = `<div class="verdict"><span class="stamp ${pass ? "pass" : "fail"}">${pass ? "Bestanden" : "Nicht bestanden"}</span>
      <p class="total">${fmt(total)} <small>/ 18 Punkte</small></p><p class="why">${why}</p></div>`;
  } else {
    verdict = `<div class="verdict"><p class="total">${fmt(total)} <small>/ ${idx.length} Punkte</small></p><p class="why">${idx.length} questions answered in practice mode.</p></div>`;
  }

  const areas = ["g", "d", "w"].filter(k => cnt[k]).map(k => {
    const max = cnt[k], low = S.mode === "exam" ? by[k] < 3 : by[k] / max < .5;
    return `<div class="area ${low ? "low" : ""}"><span>${AREAS[k]}</span><b>${fmt(by[k])}</b> / ${max}<div class="meter"><i style="width:${by[k] / max * 100}%"></i></div></div>`;
  }).join("");

  const review = idx.map(i => {
    const q = S.qs[i], s = S.sel[i], p = pts(i);
    return `<div class="ritem"><span class="pts" style="color:${p === 1 ? "var(--ok)" : p ? "var(--warn)" : "var(--rot)"}">${fmt(p)} P.</span>
      <span class="tag">${AREAS[q.a]}</span><p class="rq">${esc(q.q)}</p>
      <ul>${q.o.map((o, k) => q.c.includes(k) ? `<li class="c">${esc(o)}${s.includes(k) ? "" : " (not ticked)"}</li>` : s.includes(k) ? `<li class="w">${esc(o)}</li>` : "").join("")}</ul>
      <div class="x">${showEn ? esc(q.x) : ""}</div></div>`;
  }).join("");

  app.innerHTML = `
  <section class="card">${verdict}<div class="areas">${areas}</div>
    <div class="actions">
      <button class="btn ghost" id="home">← Start</button>
      <span style="display:flex;gap:10px">
        ${S.missed.length ? `<button class="btn ghost" id="retry">Fehler üben (${S.missed.length})</button>` : ""}
        <button class="btn" id="again">${S.mode === "exam" ? "Neue Simulation" : "Prüfungssimulation"}</button>
      </span>
    </div>
  </section>
  <section class="card"><h2>Auswertung</h2><div class="review">${review || "<p class='why'>No questions answered yet.</p>"}</div></section>`;
  document.getElementById("home").onclick = home;
  document.getElementById("again").onclick = () => start("exam");
  const r = document.getElementById("retry"); if (r) r.onclick = () => start("retry");
  window.scrollTo(0, 0);
}

home();
