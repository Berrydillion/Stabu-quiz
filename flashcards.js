const AREAS = {g:"Geschichte", d:"Demokratie", w:"Wien"};
const EXAM = new Date(2027, 0, 13);
const ROUND = 20;
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Storage falls back to memory if localStorage is unavailable
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return mem[k] || d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } }
};

// ---------- Cards: every quiz question plus fact cards ----------
const CARDS = [
  ...Q.map((q, i) => ({id: "q" + i, a: q.a, front: q.q, en: q.en, ans: q.c.map(k => q.o[k]), note: q.x})),
  ...FACTS.map((f, i) => ({id: "f" + i, a: f.a, front: f.f, big: true, en: "", back: f.b, note: f.en}))
];
let boxes = store.get("stabu-boxes", {});
const box = c => boxes[c.id] || 0;
let filter = "all", queue = [], turned = false;

function countdown() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const n = Math.round((EXAM - t) / 864e5);
  document.getElementById("days").textContent = n > 0 ? n : n === 0 ? "Heute" : "✓";
  document.getElementById("dlabel").textContent = n === 1 ? "Tag noch" : n > 1 ? "Tage noch" : n === 0 ? "Viel Glück!" : "geschafft";
}

function filters() {
  const opts = [["all", `Alle (${CARDS.length})`], ...Object.keys(AREAS).map(k => [k, `${AREAS[k]} (${CARDS.filter(c => c.a === k).length})`]), ["weak", "Schwache Karten (Box 1–2)"]];
  const el = document.getElementById("filters");
  el.innerHTML = opts.map(([k, l]) => `<button class="chip ${filter === k ? "on" : ""}" data-f="${k}">${l}</button>`).join("");
  el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filter = b.dataset.f; filters(); newRound(); });
}

function pool() {
  if (filter === "all") return CARDS;
  if (filter === "weak") return CARDS.filter(c => box(c) <= 1);
  return CARDS.filter(c => c.a === filter);
}

// Lowest boxes first, shuffled within each box
function newRound() {
  const p = shuffle(pool()).sort((x, y) => box(x) - box(y));
  queue = p.slice(0, ROUND);
  turned = false;
  draw();
}

function drawBoxes() {
  const p = filter === "weak" ? CARDS : pool();
  const counts = [0, 0, 0, 0, 0];
  p.forEach(c => counts[box(c)]++);
  const labels = ["Box 1 · neu/falsch", "Box 2", "Box 3", "Box 4", "Box 5 · sicher"];
  document.getElementById("boxes").innerHTML = counts.map((n, i) => `<div class="bx"><b>${n}</b>${labels[i]}</div>`).join("");
}

function draw() {
  drawBoxes();
  const stage = document.getElementById("stage"), no = document.getElementById("no"), yes = document.getElementById("yes");
  if (!queue.length) {
    const left = pool().filter(c => box(c) < 4).length;
    stage.innerHTML = `<div class="donebox"><b>Runde geschafft!</b><p class="sub">${left ? `${left} cards are still below box 5.` : "Every card in this set is in box 5."}</p><button class="btn" id="again">Neue Runde</button></div>`;
    document.getElementById("again").onclick = newRound;
    no.disabled = yes.disabled = true;
    return;
  }
  const c = queue[0];
  const back = c.ans ? `<ul class="ans">${c.ans.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : `<p class="backtext">${esc(c.back)}</p>`;
  stage.innerHTML = `
  <div class="flip ${turned ? "turned" : ""}" id="flip">
    <div class="face">
      <div class="top"><span class="tag">${AREAS[c.a]}</span><span>${queue.length} left in round · Box ${box(c) + 1}</span></div>
      <p class="front-text ${c.big ? "big" : ""}">${esc(c.front)}</p>
      ${c.en ? `<p class="en">${esc(c.en)}</p>` : ""}
      <p class="tapl">${c.ans ? `Wie viele richtige Antworten? (${c.ans.length}) · ` : ""}Tap to flip</p>
    </div>
    <div class="face back">
      <div class="top"><span class="tag">${AREAS[c.a]}</span><span>${c.ans ? "Richtige Antwort" + (c.ans.length > 1 ? "en" : "") : "Antwort"}</span></div>
      ${back}
      <p class="note">${esc(c.note)}</p>
    </div>
  </div>`;
  document.getElementById("flip").onclick = flip;
  no.disabled = yes.disabled = !turned;
}

function flip() { turned = !turned; document.getElementById("flip").classList.toggle("turned", turned); document.getElementById("no").disabled = document.getElementById("yes").disabled = !turned; }

function rate(knew) {
  if (!turned || !queue.length) return;
  const c = queue.shift();
  if (knew) boxes[c.id] = Math.min(4, box(c) + 1);
  else { boxes[c.id] = 0; queue.splice(Math.min(3, queue.length), 0, c); }
  store.set("stabu-boxes", boxes);
  turned = false;
  draw();
}

document.getElementById("no").onclick = () => rate(false);
document.getElementById("yes").onclick = () => rate(true);
document.addEventListener("keydown", e => {
  if (e.code === "Space") { e.preventDefault(); if (queue.length) flip(); }
  if (e.key === "1") rate(false);
  if (e.key === "2") rate(true);
});

// ---------- 9-week plan, 11 November 2026 to 12 January 2027 ----------
const PLAN = [
  ["Grundlagen", [
    ["2026-11-11", "2026-11-15", "<b>Geschichte I (Römer bis 1918):</b> history flashcards every day, then practise the Geschichte area in the quiz. Key dates: 996, 1273, 1740–1780, 1848, 1867, 1918."],
    ["2026-11-16", "2026-11-22", "<b>Geschichte II (1918 bis heute):</b> First Republic, 1933/34, 1938, 1945, 1955, the 1970s, 1989, 1995. At the weekend, read the history chapter of the BMI booklet."],
    ["2026-11-23", "2026-11-29", "<b>Demokratie I:</b> human dignity, fundamental rights, freedoms, the rule of law, the courts. Democracy cards daily plus the Demokratie area in the quiz."],
    ["2026-11-30", "2026-12-06", "<b>Demokratie II:</b> voting, Nationalrat, Bundespräsident, government, federation and states, control bodies, NGOs, EU. At the weekend, read the democracy chapter of the booklet."],
    ["2026-12-07", "2026-12-13", "<b>Wien I:</b> Roman Vienna, the town charter, Red Vienna, the Nazi era, 1945–1955, the city's politics (Gemeinderat, Bürgermeister, coat of arms)."],
    ["2026-12-14", "2026-12-20", "<b>Wien II:</b> Schönbrunn, Stephansdom, Prater, Belvedere, Donauinsel, water, U-Bahn, the UN. At the weekend, read the whole Stadt Wien guide."]
  ]],
  ["Festigen", [
    ["2026-12-21", "2026-12-27", "<b>Holiday week, kept light:</b> 15 minutes of mixed flashcards a day, plus one game (Marathon). Do your <b>first exam simulation</b> and note your weakest area."],
    ["2026-12-28", "2027-01-03", "<b>Weakest area:</b> extra cards and quiz rounds for it, plus 3 exam simulations. <b>From 1 January, turn the English notes off.</b>"]
  ]],
  ["Prüfungsmodus", [
    ["2027-01-04", "2027-01-10", "<b>One exam simulation every day</b>, German only. Aim for 15+ points and 3+ in every area. Use “Fehler üben” and the “Schwache Karten” set."],
    ["2027-01-11", "2027-01-12", "<b>Light review:</b> weak cards only. Check current officeholders (Bundespräsident, Bürgermeister, Vienna coalition). Check your exam letter, time and place, and pack your ID."]
  ]]
];

function plan() {
  const done = store.get("stabu-plan-jan", {});
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = s => { const [y, m, dd] = s.split("-").map(Number); return new Date(y, m - 1, dd); };
  const lbl = s => d(s).toLocaleDateString("de-AT", {day: "numeric", month: "short"});
  const el = document.getElementById("plan");
  el.innerHTML = PLAN.map(([ph, weeks]) => `<div class="phase">${ph}</div>` + weeks.map(([from, to, txt]) => {
    const now = t >= d(from) && t <= d(to), past = t > d(to);
    return `<label class="day ${done[from] ? "done" : ""} ${now ? "today" : ""} ${past ? "past" : ""}">
      <input type="checkbox" data-d="${from}" ${done[from] ? "checked" : ""}>
      <span class="d">${lbl(from)}<small>bis ${lbl(to)}${now ? " · jetzt" : ""}</small></span>
      <span class="t">${txt}</span></label>`;
  }).join("")).join("") +
    `<div class="phase">13. Jänner 2027</div><div class="day today" style="grid-template-columns:minmax(0,1fr)"><span class="t"><b>Prüfung. Viel Erfolg!</b> Remember: only tick answers you're sure of.</span></div>`;
  el.querySelectorAll("input").forEach(i => i.onchange = () => { done[i.dataset.d] = i.checked; store.set("stabu-plan-jan", done); plan(); });
}

countdown(); filters(); newRound(); plan();
