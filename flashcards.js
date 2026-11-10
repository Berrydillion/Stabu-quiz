const AREAS = {g:"Geschichte", d:"Demokratie", w:"Wien"};
const EXAM = new Date(2026, 10, 25);
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

// ---------- 15-day plan, 10 to 24 November ----------
const PLAN = [
  ["Grundlagen", [
    [10, "<b>Geschichte:</b> all history flashcards, then practise the Geschichte area in the quiz."],
    [11, "<b>Geschichte:</b> history cards again, then use “Fehler üben” in the quiz. Learn the key dates: 1273, 1848, 1918, 1938, 1945, 1955, 1995."],
    [12, "<b>Demokratie:</b> all democracy flashcards, then practise the Demokratie area in the quiz."],
    [13, "<b>Demokratie:</b> democracy cards again, then “Fehler üben”. Focus on the institutions: Nationalrat, Bundespräsident, the courts, Rechnungshof."],
    [14, "<b>Wien:</b> all Vienna flashcards, then practise the Wien area in the quiz."],
    [15, "<b>Wien:</b> Vienna cards again, then “Fehler üben”. Focus on the sights, Rotes Wien, water and the Gemeinderat."]
  ]],
  ["Festigen", [
    [16, "First <b>exam simulation</b>, then mixed cards (Alle). Note your weakest area."],
    [17, "Cards for your weakest area, then go through all quiz questions in practice mode."],
    [18, "Read the official BMI booklet (the history and democracy chapters). Then one simulation."],
    [19, "Read the Stadt Wien guide in full. Then one simulation and the “Schwache Karten” set."],
    [20, "<b>Turn English off in the quiz from now on.</b> Do one simulation and the full card set."]
  ]],
  ["Prüfungsmodus", [
    [21, "Two simulations in German only. Aim for 14+ points so you have a safety margin."],
    [22, "Rest-ish day: the “Schwache Karten” set plus “Fehler üben”."],
    [23, "Two simulations. Aim for 15+ points and 3+ points in every area."],
    [24, "Light review: weak cards only. Check your exam letter, the time and place, and pack your ID. Sleep early."]
  ]]
];

function plan() {
  const done = store.get("stabu-plan", {});
  const today = new Date(), td = today.getMonth() === 10 && today.getFullYear() === 2026 ? today.getDate() : 0;
  const wd = d => new Date(2026, 10, d).toLocaleDateString("de-AT", {weekday: "short"});
  const el = document.getElementById("plan");
  el.innerHTML = PLAN.map(([ph, days]) => `<div class="phase">${ph}</div>` + days.map(([d, t]) =>
    `<label class="day ${done[d] ? "done" : ""} ${d === td ? "today" : ""} ${d < td ? "past" : ""}">
      <input type="checkbox" data-d="${d}" ${done[d] ? "checked" : ""}>
      <span class="d">${d}. Nov<small>${wd(d)}${d === td ? " · heute" : ""}</small></span>
      <span class="t">${t}</span></label>`).join("")).join("") +
    `<div class="phase">25. November</div><div class="day today" style="grid-template-columns:minmax(0,1fr)"><span class="t"><b>Prüfung. Viel Erfolg!</b> Remember: only tick answers you're sure of.</span></div>`;
  el.querySelectorAll("input").forEach(i => i.onchange = () => { done[i.dataset.d] = i.checked; store.set("stabu-plan", done); plan(); });
}

countdown(); filters(); newRound(); plan();
