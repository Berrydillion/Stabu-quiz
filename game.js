const AREAS = {g:"Geschichte", d:"Demokratie", w:"Wien"};
const TIME = 30, MAX_HEARTS = 5;
const LEVELS = [
  [0, "🧳", "Tourist"], [300, "🥨", "Zuagraster"], [800, "☕", "Kaffeehaus-Stammgast"],
  [1500, "🍷", "Heurigen-Profi"], [2500, "🏘️", "Grätzl-Kenner"], [4000, "🎡", "Prater-Legende"],
  [6000, "🏛️", "Gemeinderat"], [8500, "🎩", "Bürgermeister"], [12000, "🇦🇹", "Staatsbürger"]
];
const BADGES = [
  ["first", "🎯", "Erster Schritt", "Play your first game"],
  ["c5", "🔥", "Heiße Serie", "5 in a row"],
  ["c10", "⚡", "Unaufhaltbar", "10 in a row"],
  ["s1", "🥉", "1.000 Punkte", "In one game"],
  ["s3", "🥈", "3.000 Punkte", "In one game"],
  ["s6", "🥇", "6.000 Punkte", "In one game"],
  ["shield", "🛡️", "Eiserne Nerven", "15 questions without losing a heart"],
  ["all", "🧭", "Allrounder", "Play all three areas"],
  ["q100", "💯", "Hundert", "100 correct answers in total"],
  ["d3", "📅", "Dranbleiben", "Play 3 days in a row"],
  ["d7", "🗓️", "Eine Woche", "Play 7 days in a row"],
  ["mayor", "🎩", "Bürgermeister", "Reach the Bürgermeister level"]
];
const app = document.getElementById("app");
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = n => Math.round(n).toLocaleString("de-AT");
const dayStr = d => d.toISOString().slice(0, 10);

const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return mem[k] || d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } }
};
let P = store.get("stabu-game", {xp: 0, games: 0, best: 0, correct: 0, bestCombo: 0, streak: 0, lastDay: "", badges: [], areas: {}});
const save = () => store.set("stabu-game", P);

function level(xp) {
  let i = 0; while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1][0]) i++;
  const cur = LEVELS[i], nxt = LEVELS[i + 1];
  return {i, emoji: cur[1], name: cur[2], pct: nxt ? (xp - cur[0]) / (nxt[0] - cur[0]) * 100 : 100, toNext: nxt ? nxt[0] - xp : 0, next: nxt && nxt[2]};
}

// Official scoring: any wrong tick = 0, otherwise share of correct answers ticked
const official = (q, sel) => sel.some(i => !q.c.includes(i)) ? 0 : sel.length / q.c.length;
function prep(q) {
  const order = shuffle([0, 1, 2, 3]);
  return {...q, o: order.map(i => q.o[i]), c: order.map((i, k) => q.c.includes(i) ? k : -1).filter(k => k >= 0)};
}

// ---------- Home ----------
function home() {
  const L = level(P.xp);
  app.innerHTML = `
  <div class="kicker">Staatsbürgerschaft Wien · Spielmodus</div>
  <h1>Wien Quiz Challenge</h1>
  <p class="sub">Collect XP and climb from Tourist to Staatsbürger. ${Q.length} questions, scored with the real exam rules.</p>
  <section class="card">
    <div class="profile">
      <div class="rank">${L.emoji}</div>
      <div>
        <div class="rname">${L.name}</div>
        <div class="xpbar"><i style="width:${L.pct}%"></i></div>
        <div class="sub">${fmt(P.xp)} XP${L.next ? ` · ${fmt(L.toNext)} XP to <b>${L.next}</b>` : " · highest level reached!"}</div>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><b>${fmt(P.best)}</b>Highscore</div>
      <div class="stat"><b>${P.bestCombo}</b>Best combo</div>
      <div class="stat"><b>${P.streak}🔥</b>Day streak</div>
      <div class="stat"><b>${P.correct}</b>Correct total</div>
    </div>
  </section>
  <section class="card">
    <h2>Spiel starten</h2>
    <div class="modes">
      <button class="mode" data-m="all"><b>🏆 Marathon</b><span>All areas mixed. How far can you get?</span></button>
      ${Object.keys(AREAS).map(k => `<button class="mode" data-m="${k}"><b>${{g: "📜", d: "⚖️", w: "🎡"}[k]} ${AREAS[k]}</b><span>${Q.filter(q => q.a === k).length} questions from this area only</span></button>`).join("")}
    </div>
    <ul class="rules">
      <li><b>3 ❤️ lives.</b> A wrong tick costs a life, and so does running out the 30-second clock.</li>
      <li><b>Combos:</b> 2 correct in a row = ×2, 5 in a row = ×3, 8 in a row = ×4. Faster answers earn bonus points.</li>
      <li><b>Partly right</b> (correct ticks, but not all of them): 40 points, no life lost, but your combo resets. That's how the real exam works too.</li>
      <li>Every 10 fully correct answers earns <b>+1 ❤️</b>. You get one of each joker per game: 🔢 how many answers are correct · ⏱️ +15 seconds · ⏭️ skip.</li>
    </ul>
    <p class="sub" style="margin-top:10px">Keyboard: 1–4 to tick · Enter to lock in or continue</p>
  </section>
  <section class="card">
    <h2>Abzeichen (${P.badges.length}/${BADGES.length})</h2>
    <div class="badges">${BADGES.map(([id, e, n, d]) => `<div class="badge ${P.badges.includes(id) ? "got" : ""}"><span class="e">${e}</span><b>${n}</b>${d}</div>`).join("")}</div>
  </section>`;
  app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => start(b.dataset.m));
}

// ---------- Game ----------
let G, tick;
function start(m) {
  const pool = m === "all" ? Q : Q.filter(q => q.a === m);
  G = {mode: m, pool, deck: shuffle(pool), n: 0, hearts: 3, score: 0, combo: 0, maxCombo: 0, full: 0, lost: 0, noLoss: 0, bestNoLoss: 0,
       jokers: {hint: 1, time: 1, skip: 1}, missed: [], areas: new Set()};
  next();
}

function next() {
  if (!G.deck.length) G.deck = shuffle(G.pool);
  G.q = prep(G.deck.pop());
  G.sel = []; G.locked = false; G.hint = false; G.t = TIME; G.n++;
  G.areas.add(G.q.a);
  draw();
  clearInterval(tick);
  tick = setInterval(() => { G.t--; drawTimer(); if (G.t <= 0) lock(); }, 1000);
}

function mult(c) { return c >= 8 ? 4 : c >= 5 ? 3 : c >= 2 ? 2 : 1; }

function draw() {
  const q = G.q, m = mult(G.combo);
  app.innerHTML = `
  <section class="card" id="gc">
    <div class="hud">
      <span class="hearts">${"❤️".repeat(G.hearts)}${"🤍".repeat(Math.max(0, 3 - G.hearts))}</span>
      <span class="score" id="sc">${fmt(G.score)}</span>
      <span class="combo ${m > 1 ? "hot" : ""}">${G.combo}× combo${m > 1 ? ` · ×${m}` : ""}</span>
    </div>
    <div class="timer"><i id="tm" style="width:${G.t / TIME * 100}%"></i></div>
    <div class="meta"><span class="tag">${AREAS[q.a]}</span><span>Frage ${G.n}</span></div>
    <p class="qtext">${esc(q.q)}</p>
    <p class="en">${esc(q.en)}</p>
    ${G.hint ? `<p class="howmany">🔢 ${q.c.length} ${q.c.length === 1 ? "answer is" : "answers are"} correct</p>` : ""}
    <div class="opts">${q.o.map((o, k) => {
      let cls = G.sel.includes(k) ? "sel" : "";
      if (G.locked) { cls += " locked"; if (q.c.includes(k)) cls += G.sel.includes(k) ? " right" : " missed"; else if (G.sel.includes(k)) cls += " wrong"; }
      return `<div class="opt ${cls}" data-k="${k}"><span class="k">${k + 1}</span><span>${esc(o)}</span></div>`;
    }).join("")}</div>
    ${G.locked ? G.fb : ""}
    <div class="row">
      ${G.locked ? `<span></span>` : `<span class="jokers">
        <button class="btn ghost" id="jh" ${G.jokers.hint ? "" : "disabled"} title="How many answers are correct">🔢</button>
        <button class="btn ghost" id="jt" ${G.jokers.time ? "" : "disabled"} title="+15 seconds">⏱️</button>
        <button class="btn ghost" id="js" ${G.jokers.skip ? "" : "disabled"} title="Skip">⏭️</button></span>`}
      ${G.locked
        ? `<button class="btn" id="go">${G.hearts > 0 ? "Weiter →" : "Ergebnis"}</button>`
        : `<button class="btn" id="lk" ${G.sel.length ? "" : "disabled"}>Einloggen ✓</button>`}
    </div>
  </section>`;
  if (!G.locked) {
    app.querySelectorAll(".opt").forEach(el => el.onclick = () => toggle(+el.dataset.k));
    document.getElementById("lk").onclick = lock;
    document.getElementById("jh").onclick = () => { G.jokers.hint = 0; G.hint = true; draw(); };
    document.getElementById("jt").onclick = () => { G.jokers.time = 0; G.t += 15; draw(); };
    document.getElementById("js").onclick = () => { G.jokers.skip = 0; G.n--; next(); };
  } else document.getElementById("go").onclick = () => G.hearts > 0 ? next() : over();
  drawTimer();
}

function drawTimer() {
  const el = document.getElementById("tm"); if (!el) return;
  el.style.width = Math.max(0, Math.min(100, G.t / TIME * 100)) + "%";
  el.classList.toggle("low", G.t <= 8);
}

function toggle(k) {
  if (G.locked) return;
  G.sel = G.sel.includes(k) ? G.sel.filter(x => x !== k) : [...G.sel, k];
  draw();
}

function lock() {
  if (G.locked) return;
  clearInterval(tick);
  G.locked = true;
  const q = G.q, p = official(q, G.sel), right = q.c.map(k => esc(q.o[k])).join(" · ");
  if (p === 1) {
    G.combo++; G.full++; G.noLoss++;
    const pts = (100 + Math.max(0, G.t) * 3) * mult(G.combo);
    G.score += pts;
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    let extra = "";
    if (G.full % 10 === 0 && G.hearts < MAX_HEARTS) { G.hearts++; extra = " · +1 ❤️ bonus!"; }
    G.fb = `<div class="fb good"><b>Richtig! +${fmt(pts)}${extra}</b>${esc(q.x)}</div>`;
    popup("+" + fmt(pts));
  } else if (p > 0) {
    G.combo = 0; G.score += 40; G.noLoss++;
    G.fb = `<div class="fb part"><b>Teilweise richtig: +40, combo reset</b>Alle richtigen: ${right}<br><span style="color:var(--muted)">${esc(q.x)}</span></div>`;
    G.missed.push(q);
  } else {
    G.combo = 0; G.hearts--; G.lost++; G.noLoss = 0;
    const why = !G.sel.length ? "Zeit abgelaufen! ⏰" : "Falsch: −1 ❤️";
    G.fb = `<div class="fb bad"><b>${why}</b>Richtig: ${right}<br><span style="color:var(--muted)">${esc(q.x)}</span></div>`;
    G.missed.push(q);
    setTimeout(() => { const c = document.getElementById("gc"); if (c) c.classList.add("shake"); }, 0);
  }
  G.bestNoLoss = Math.max(G.bestNoLoss, G.noLoss);
  draw();
}

// ---------- Game over ----------
function over() {
  clearInterval(tick);
  const before = level(P.xp), gained = Math.round(G.score / 10) + 20;
  const newRecord = G.score > P.best;
  P.xp += gained; P.games++; P.best = Math.max(P.best, G.score);
  P.correct += G.full; P.bestCombo = Math.max(P.bestCombo, G.maxCombo);
  G.areas.forEach(a => P.areas[a] = true);
  const today = dayStr(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
  if (P.lastDay !== today) { P.streak = P.lastDay === dayStr(y) ? P.streak + 1 : 1; P.lastDay = today; }
  const after = level(P.xp);
  const earned = [];
  const check = (id, ok) => { if (ok && !P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
  check("first", true);
  check("c5", G.maxCombo >= 5); check("c10", G.maxCombo >= 10);
  check("s1", G.score >= 1000); check("s3", G.score >= 3000); check("s6", G.score >= 6000);
  check("shield", G.bestNoLoss >= 15);
  check("all", ["g", "d", "w"].every(a => P.areas[a]));
  check("q100", P.correct >= 100);
  check("d3", P.streak >= 3); check("d7", P.streak >= 7);
  check("mayor", after.i >= 7);
  save();

  const levelUp = after.i > before.i;
  app.innerHTML = `
  <section class="card over">
    <span class="stamp">Spiel vorbei</span>
    ${newRecord ? `<p class="newrec" style="margin-top:14px">★ Neuer Highscore ★</p>` : ""}
    <p class="big">${fmt(G.score)}</p>
    <div class="earn"><span><b>${G.n}</b> questions</span><span><b>${G.full}</b> fully correct</span><span><b>${G.maxCombo}</b> best combo</span><span><b>+${gained}</b> XP</span></div>
    ${levelUp ? `<h2 style="margin-top:6px">${after.emoji} Aufgestiegen: ${after.name}!</h2>` : `<p class="sub">${after.emoji} ${after.name}${after.next ? ` · ${fmt(after.toNext)} XP to ${after.next}` : ""}</p>`}
    ${earned.length ? `<div style="margin-top:12px">${earned.map(id => { const b = BADGES.find(x => x[0] === id); return `<span class="newbadge">${b[1]} ${b[2]}</span>`; }).join("")}</div>` : ""}
    <div class="row" style="justify-content:center">
      <button class="btn ghost" id="hm">← Übersicht</button>
      <button class="btn" id="ag">Nochmal spielen</button>
    </div>
  </section>
  ${G.missed.length ? `<section class="card"><h2>Diese solltest du wiederholen (${G.missed.length})</h2>
    ${G.missed.map(q => `<div class="miss"><span class="tag">${AREAS[q.a]}</span><p>${esc(q.q)}</p><div class="c">✓ ${q.c.map(k => esc(q.o[k])).join(" · ")}</div><div class="x">${esc(q.x)}</div></div>`).join("")}</section>` : ""}`;
  document.getElementById("hm").onclick = home;
  document.getElementById("ag").onclick = () => start(G.mode);
  if (levelUp || newRecord || earned.length) confetti();
  window.scrollTo(0, 0);
}

function popup(t) {
  const el = document.createElement("div"); el.className = "pop"; el.textContent = t;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function confetti() {
  const e = ["🎉", "⭐", "🇦🇹", "✨", "🎊"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div"); c.className = "confetti";
    c.textContent = e[i % e.length];
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 2 + Math.random() * 2 + "s";
    c.style.animationDelay = Math.random() * .6 + "s";
    document.body.appendChild(c); setTimeout(() => c.remove(), 5000);
  }
}

document.addEventListener("keydown", e => {
  if (!G || !document.getElementById("gc")) return;
  if (!G.locked && ["1", "2", "3", "4"].includes(e.key)) toggle(+e.key - 1);
  if (e.key === "Enter") {
    e.preventDefault();
    if (!G.locked && G.sel.length) lock();
    else if (G.locked) G.hearts > 0 ? next() : over();
  }
});

home();
