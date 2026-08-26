// Alok's Tracker App — offline-first PWA. All data lives in localStorage + IndexedDB (photos). No backend required.

const STORAGE_KEY = "fittrack:v1";
let state = null;
let currentView = "home";
let progressSubTab = "weight";
let workoutSelectedDate = todayISO();
let photoUrlCache = {};

// ---------- icon system (inline SVG, stroke-based — no emoji as structural icons) ----------
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/>',
  dumbbell: '<path d="M2 10v4"/><path d="M22 10v4"/><rect x="5" y="8" width="3" height="8" rx="1"/><rect x="16" y="8" width="3" height="8" rx="1"/><path d="M8 12h8"/>',
  utensils: '<path d="M6 2v7a2 2 0 0 0 2 2v11"/><path d="M6 2v5M9 2v5"/><path d="M17 2c-1.4 0-2.3 2-2.3 4.3S15.6 10 17 10v12"/>',
  chart: '<path d="M3 21h18"/><path d="M4 17l5-6 4 3 6-8"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  camera: '<path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  pulse: '<path d="M2 12h4l2 7 4-15 3 8h7"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 21h14"/>',
  droplet: '<path d="M12 3s6 7.2 6 11.2a6 6 0 1 1-12 0C6 10.2 12 3 12 3z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  moon: '<path d="M20 14.3A8.2 8.2 0 1 1 9.7 4a6.6 6.6 0 0 0 10.3 10.3z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  check: '<path d="M4 12l5 5 11-11"/>',
  play: '<circle cx="12" cy="12" r="9.2"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.7"/><path d="M21 16l-5.5-5.5L4 21"/>'
};
function icon(name, size = 20, cls = "") {
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

const PROGRESS_TABS = [
  { key: "weight", label: "Weight", icon: "chart" },
  { key: "body", label: "Body", icon: "ruler" },
  { key: "steps", label: "Steps", icon: "pulse" },
  { key: "photos", label: "Photos", icon: "camera" },
  { key: "summary", label: "Summary", icon: "list" }
];

const ANGLE_LABELS = { front: "Front", side: "Side", back: "Back", full: "Full (Dressed)" };
const ANGLE_ORDER = ["front", "side", "back", "full"];

function youtubeSearchUrl(exerciseName) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(exerciseName + " exercise proper form tutorial");
}
function goTo(view, sub) { if (sub) progressSubTab = sub; setView(view); }
function cardLinkOpen(view, sub, extraClass) {
  const nav = `goTo('${view}'${sub ? `,'${sub}'` : ""})`;
  return `<div class="card stat card-link${extraClass ? " " + extraClass : ""}" onclick="${nav}" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${nav};}">${icon("chevronRight", 16, "card-chevron")}`;
}

// ---------- date helpers ----------
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  const weekday = new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday}, ${d}-${m}-${y}`;
}
function fmtDateShort(iso) {
  const [, m, d] = iso.split("-");
  return `${d}-${m}`;
}
function dayIndexOf(iso) { return new Date(iso + "T00:00:00").getDay(); }
function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
// Pure UTC date-string arithmetic — avoids local-timezone drift when walking/adding days to an ISO date.
function addDaysISO(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function monthKey(iso) { return iso.slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function weekNumberOf(iso) {
  const start = new Date(state.profile.programStartDate + "T00:00:00");
  const d = new Date(iso + "T00:00:00");
  const diffDays = Math.floor((d - start) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ---------- storage ----------
function seedSets(n, reps, weight) { return Array.from({ length: n }, () => ({ reps, weight })); }
function seedState() {
  return {
    profile: { ...DEFAULT_PROFILE },
    weightLogs: [
      { id: uid(), date: "2026-08-24", weight: 121.00, bmi: null, note: "Good" },
      { id: uid(), date: "2026-08-25", weight: 121.40, bmi: null, note: "Feeling Sleepy and Full body Pain" },
      { id: uid(), date: "2026-08-26", weight: 121.00, bmi: null, note: "Feeling good" }
    ],
    bodyLogs: [
      { id: uid(), date: "2026-08-25", abdomen: 54.0, chest: 51.0, waist: 49.0, hips: 48.0, armL: 15.5, armR: 16.0, thighL: 25.5, thighR: 25.5, calf: 17.0, note: "" }
    ],
    stepLogs: [
      { id: uid(), date: "2026-08-24", steps: 5863 },
      { id: uid(), date: "2026-08-25", steps: 7298 }
    ],
    workoutLogs: [
      { id: uid(), date: "2026-08-24", dayIndex: 1, label: "Push", cardioDone: true, notes: "",
        exercises: [
          { name: "Flat Dumbbell Press", setsReps: "3x12", sets: seedSets(3, "12", "5"), done: true },
          { name: "Machine Pec Dec Fly", setsReps: "3x10", sets: seedSets(3, "10", "12"), done: true },
          { name: "Seated DB Shoulder Press", setsReps: "3x12", sets: seedSets(3, "12", "5"), done: true },
          { name: "DB Lateral Raises", setsReps: "3x12", sets: seedSets(3, "12", "2.5"), done: true },
          { name: "High Pulley Tricep Pushdown", setsReps: "3x10", sets: seedSets(3, "10", "12"), done: true },
          { name: "Ab Crunches", setsReps: "3x10", sets: seedSets(3, "10", ""), done: true }
        ] },
      { id: uid(), date: "2026-08-25", dayIndex: 2, label: "Pull", cardioDone: true, notes: "",
        exercises: [
          { name: "Close Grip Lat Pulldown", setsReps: "3x10", sets: seedSets(3, "10", "12"), done: true },
          { name: "Seated Cable Row", setsReps: "3x12", sets: seedSets(3, "12", "18"), done: true },
          { name: "Machine Rear Delt Fly", setsReps: "3x10", sets: seedSets(3, "10", "12"), done: true },
          { name: "DB Bicep Curls", setsReps: "3x12", sets: seedSets(3, "12", "5"), done: true },
          { name: "Machine Preacher Curl", setsReps: "3x12", sets: seedSets(3, "12", "12"), done: true },
          { name: "Flutter Kicks", setsReps: "3x15", sets: seedSets(3, "15", ""), done: true }
        ] },
      { id: uid(), date: "2026-08-26", dayIndex: 3, label: "Legs", cardioDone: true, notes: "",
        exercises: [
          { name: "DB Goblet Squat", setsReps: "3x10", sets: seedSets(3, "10", "5"), done: true },
          { name: "DB Romanian Deadlift", setsReps: "2x10", sets: seedSets(2, "10", "5"), done: true },
          { name: "Machine Leg Extension", setsReps: "3x10", sets: seedSets(3, "10", "12"), done: true },
          { name: "DB Standing Calf Raise", setsReps: "3x15", sets: seedSets(3, "15", "5"), done: true }
        ] }
    ],
    dietLogs: [],
    photoLogs: []
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.profile = { ...DEFAULT_PROFILE, ...parsed.profile };
      parsed.photoLogs = parsed.photoLogs || [];
      parsed.dietLogs = parsed.dietLogs || [];
      return parsed;
    }
  } catch (e) { console.warn("Failed to load state, reseeding", e); }
  return seedState();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function sortByDateAsc(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }
function sortByDateDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }

// ---------- computed metrics ----------
function last7(logs) { const cutoff = daysAgoISO(6); return logs.filter(l => l.date >= cutoff).sort(sortByDateAsc); }
function avg(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }
function latestWeight() { const logs = [...state.weightLogs].sort(sortByDateDesc); return logs[0] || null; }
function currentStreak() {
  let streak = 0, d = todayISO();
  const hasLog = iso => state.weightLogs.some(l => l.date === iso) || state.workoutLogs.some(l => l.date === iso) || state.stepLogs.some(l => l.date === iso);
  while (hasLog(d)) { streak++; d = daysAgoISO(streak); }
  return streak;
}
function calcBmi(weightKg, heightCm) { if (!heightCm) return null; const m = heightCm / 100; return +(weightKg / (m * m)).toFixed(1); }

// ---------- toast ----------
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------- modal ----------
function openModal(html) {
  const root = document.getElementById("modalRoot");
  root.innerHTML = `<div class="modal-backdrop" onmousedown="if(event.target===this) closeModal()"><div class="modal-box" role="dialog" aria-modal="true">${html}</div></div>`;
  document.body.classList.add("modal-open");
}
function closeModal() {
  document.getElementById("modalRoot").innerHTML = "";
  document.body.classList.remove("modal-open");
}

// ---------- nav ----------
function setView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
  document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  render();
  window.scrollTo(0, 0);
}
function render() {
  document.getElementById("todayDate").textContent = fmtDate(todayISO());
  if (currentView === "home") renderHome();
  else if (currentView === "workout") renderWorkout();
  else if (currentView === "diet") renderDiet();
  else if (currentView === "progress") renderProgress();
  else if (currentView === "settings") renderSettings();
}

// ============ HOME ============
function latestHeroPhoto() {
  for (const a of ["full", "front", "side", "back"]) {
    const matches = state.photoLogs.filter(p => p.angle === a).sort(sortByDateDesc);
    if (matches.length) return matches[0];
  }
  return null;
}
function heroPhotoPair() {
  const current = latestHeroPhoto();
  if (!current) return { old: null, current: null };
  const sameAngle = state.photoLogs.filter(p => p.angle === current.angle).sort(sortByDateAsc);
  const old = sameAngle[0].id !== current.id ? sameAngle[0] : null;
  return { old, current };
}
// BMI-midpoint ideal weight (uses the middle of the WHO "normal" BMI band, 18.5–24.9) — a
// standard, gender-neutral reference point; not a substitute for a doctor's individual guidance.
function idealWeight() {
  const h = state.profile.heightCm;
  if (!h) return null;
  const m = h / 100;
  return +(21.7 * m * m).toFixed(1);
}
// General fitness reference ratios (relative to height), used only to show an indicative
// target and gap — not a medical or gender-specific standard.
function idealBodyMeasurements() {
  const h = state.profile.heightCm;
  if (!h) return null;
  const inch = h / 2.54;
  return {
    abdomen: +(0.47 * inch).toFixed(1),
    chest: +(0.55 * inch).toFixed(1),
    waist: +(0.45 * inch).toFixed(1),
    hips: +(0.52 * inch).toFixed(1),
    arm: +(0.185 * inch).toFixed(1),
    thigh: +(0.29 * inch).toFixed(1),
    calf: +(0.20 * inch).toFixed(1)
  };
}
function bodySketchSVG(latest) {
  const v = k => latest && latest[k] != null ? latest[k] : null;
  const pin = (key, x, y, lx, ly, anchor) => {
    const val = v(key);
    return `
      <line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" class="pin-line" />
      <circle cx="${x}" cy="${y}" r="3.5" class="pin-dot" />
      <text x="${lx + (anchor === "end" ? -6 : 6)}" y="${ly + 4}" text-anchor="${anchor}" class="pin-text">${val != null ? val + '"' : "—"}</text>`;
  };
  return `
  <svg viewBox="0 0 260 420" class="body-sketch" role="img" aria-label="Body diagram with current measurements">
    <g class="sketch-fill">
      <ellipse cx="130" cy="26" rx="15" ry="17" />
      <rect x="122" y="40" width="16" height="12" rx="4" />
      <path d="M98,54 C98,50 162,50 162,54 L156,96 C153,112 150,122 148,132 L152,150 C153,162 153,172 150,182 L110,182 C107,172 107,162 108,150 L112,132 C110,122 107,112 104,96 Z" />
      <rect x="78" y="56" width="18" height="110" rx="9" />
      <rect x="164" y="56" width="18" height="110" rx="9" />
      <circle cx="87" cy="172" r="10" />
      <circle cx="173" cy="172" r="10" />
      <rect x="102" y="182" width="24" height="170" rx="10" />
      <rect x="134" y="182" width="24" height="170" rx="10" />
      <ellipse cx="114" cy="360" rx="14" ry="7" />
      <ellipse cx="146" cy="360" rx="14" ry="7" />
    </g>
    <g class="sketch-pins">
      ${pin("chest", 130, 96, 200, 90, "start")}
      ${pin("waist", 130, 128, 60, 128, "end")}
      ${pin("abdomen", 130, 158, 200, 158, "start")}
      ${pin("hips", 130, 180, 60, 196, "end")}
      ${pin("armL", 87, 100, 44, 100, "end")}
      ${pin("armR", 173, 100, 216, 100, "start")}
      ${pin("thighL", 114, 240, 60, 250, "end")}
      ${pin("thighR", 146, 240, 200, 250, "start")}
      ${pin("calf", 146, 320, 200, 320, "start")}
    </g>
  </svg>`;
}
function hasAnyLogOn(iso) {
  return state.weightLogs.some(l => l.date === iso) || state.workoutLogs.some(l => l.date === iso) ||
    state.stepLogs.some(l => l.date === iso) || state.dietLogs.some(l => l.date === iso);
}
function loggingStats() {
  const start = state.profile.programStartDate;
  const end = todayISO();
  let d = start, total = 0, logged = 0;
  while (d <= end && total < 3660) {
    total++;
    if (hasAnyLogOn(d)) logged++;
    d = addDaysISO(d, 1);
  }
  return { total, logged, skipped: total - logged };
}
function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
function quoteOfTheDay() {
  return MOTIVATION_QUOTES[dayOfYear(new Date()) % MOTIVATION_QUOTES.length];
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal range";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
function totalInchesLost() {
  const sorted = [...state.bodyLogs].sort(sortByDateAsc);
  if (sorted.length < 2) return null;
  const first = sorted[0], last = sorted[sorted.length - 1];
  let total = 0, any = false;
  ["abdomen", "chest", "waist", "hips", "calf"].forEach(k => {
    if (first[k] != null && last[k] != null) { total += (first[k] - last[k]); any = true; }
  });
  const pairAvg = (o, l, r) => (o[l] != null && o[r] != null) ? (o[l] + o[r]) / 2 : null;
  const fArm = pairAvg(first, "armL", "armR"), lArm = pairAvg(last, "armL", "armR");
  if (fArm != null && lArm != null) { total += (fArm - lArm); any = true; }
  const fThigh = pairAvg(first, "thighL", "thighR"), lThigh = pairAvg(last, "thighL", "thighR");
  if (fThigh != null && lThigh != null) { total += (fThigh - lThigh); any = true; }
  return any ? +total.toFixed(1) : null;
}
function trendBadge(delta, unit = "") {
  if (delta == null || isNaN(delta)) return "";
  const arrow = delta < 0 ? "&darr;" : delta > 0 ? "&uarr;" : "&rarr;";
  const cls = delta < 0 ? "trend-good" : delta > 0 ? "trend-bad" : "trend-flat";
  return `<span class="trend ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}${unit}</span>`;
}
function getTodayReminders() {
  const today = todayISO();
  const list = [];
  if (!state.weightLogs.some(l => l.date === today)) list.push({ label: "Log today's weight", view: "progress", sub: "weight" });
  if (!state.stepLogs.some(l => l.date === today)) list.push({ label: "Log today's steps", view: "progress", sub: "steps" });
  const idx = dayIndexOf(today);
  if (!PROGRAM[idx].rest && !state.workoutLogs.some(w => w.date === today)) list.push({ label: "Log today's workout", view: "workout" });
  if (!state.dietLogs.some(d => d.date === today)) list.push({ label: "Log today's diet", view: "diet" });
  const wk = weekNumberOf(today);
  if (!state.photoLogs.some(p => weekNumberOf(p.date) === wk)) list.push({ label: "Add this week's progress photo", view: "progress", sub: "photos" });
  return list;
}

function renderHome() {
  const el = document.getElementById("view-home");
  const w = latestWeight();
  const todayIdx = dayIndexOf(todayISO());
  const prog = PROGRAM[todayIdx];
  const stepYesterday = state.stepLogs.find(s => s.date === daysAgoISO(1));
  const stepGoal = state.profile.stepGoal;
  const wk7 = last7(state.weightLogs).map(l => l.weight);
  const stepWeek = last7(state.stepLogs).map(l => l.steps);
  const startW = state.profile.startWeight;
  const goalW = state.profile.goalWeight;
  const curW = w ? w.weight : startW;
  const totalToLose = startW - goalW;
  const lostSoFar = startW - curW;
  const pct = totalToLose > 0 ? Math.max(0, Math.min(100, Math.round((lostSoFar / totalToLose) * 100))) : 0;

  const weightSorted = [...state.weightLogs].sort(sortByDateAsc);
  const weightSeries = weightSorted.map(l => l.weight);
  const firstW = weightSorted[0];
  const weightDelta = (w && firstW && weightSorted.length > 1) ? +(w.weight - firstW.weight).toFixed(1) : null;

  const heightCm = state.profile.heightCm;
  const bmiNow = heightCm && w ? calcBmi(w.weight, heightCm) : (w && w.bmi) || null;
  const bmiFirst = heightCm && firstW ? calcBmi(firstW.weight, heightCm) : (firstW && firstW.bmi) || null;
  const bmiSeries = heightCm ? weightSorted.map(l => calcBmi(l.weight, heightCm)) : weightSorted.map(l => l.bmi).filter(v => v != null);
  const bmiDelta = (bmiNow != null && bmiFirst != null) ? +(bmiNow - bmiFirst).toFixed(1) : null;

  const bodySorted = [...state.bodyLogs].sort(sortByDateAsc);
  const firstB = bodySorted[0], lastB = bodySorted[bodySorted.length - 1];
  const abdSeries = bodySorted.map(b => b.abdomen).filter(v => v != null);
  const abdDelta = (firstB && lastB && firstB.abdomen != null && lastB.abdomen != null) ? +(lastB.abdomen - firstB.abdomen).toFixed(1) : null;

  const inchesLost = totalInchesLost();
  const dietToday = state.dietLogs.find(d => d.date === todayISO());
  const totalDietItems = DIET.meals.reduce((n, m) => n + m.items.length, 0);
  const doneDietItems = dietToday ? DIET.meals.reduce((n, m) => n + m.items.filter((it, i) => dietToday.items[m.key + "_" + i]).length, 0) : 0;
  const dietPct = dietToday ? Math.round(doneDietItems / totalDietItems * 100) : null;

  const { old: heroOld, current: hero } = heroPhotoPair();
  const reminders = getTodayReminders();
  const ideal = idealWeight();
  const logStats = loggingStats();
  const quote = quoteOfTheDay();

  el.innerHTML = `
    ${hero ? `
    <div class="card hero-compare">
      <button class="hero-compare-col" onclick="goTo('progress','photos')" aria-label="View progress photos">
        ${heroOld ? `
          <img id="heroOldImg" data-id="${heroOld.id}" alt="Earliest progress photo" class="hero-photo-img" />
          <div class="hero-photo-caption">Then &middot; ${fmtDateShort(heroOld.date)}</div>
        ` : `
          <div class="hero-photo-empty small">${icon("camera", 22)}<div>Add another photo to compare</div></div>
        `}
      </button>
      <button class="hero-compare-col" onclick="goTo('progress','photos')" aria-label="View progress photos">
        <img id="heroPhotoImg" data-id="${hero.id}" alt="Latest progress photo" class="hero-photo-img" />
        <div class="hero-photo-caption">Now &middot; ${fmtDateShort(hero.date)}</div>
      </button>
    </div>` : `
    <button class="card hero-photo-empty" onclick="goTo('progress','photos')" aria-label="Add your first progress photo">
      ${icon("camera", 30)}
      <div>Add your first progress photo</div>
      <div class="muted small">Front, side, back &amp; full — build your visual timeline</div>
    </button>`}

    <div class="card quote-card">
      <div class="eyebrow">${icon("bolt", 14)} Daily Motivation</div>
      <div class="quote-text">&ldquo;${quote}&rdquo;</div>
    </div>

    <div class="card hero card-link" onclick="goToWorkout()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goToWorkout();}">
      <div class="hero-row">
        <div>
          <div class="eyebrow">Today's Program &middot; Week ${weekNumberOf(todayISO())}</div>
          <h2>${icon(prog.rest ? "moon" : "dumbbell", 22)} ${prog.label}</h2>
          <div class="muted">${prog.sub}</div>
        </div>
        <button class="btn primary" onclick="event.stopPropagation();goToWorkout()">Open Workout</button>
      </div>
    </div>

    ${reminders.length ? `
    <div class="card reminders">
      <div class="eyebrow">${icon("bolt", 14)} Don't forget</div>
      ${reminders.map(r => `<button class="reminder-row" onclick="goTo('${r.view}'${r.sub ? `,'${r.sub}'` : ""})"><span>${r.label}</span>${icon("chevronRight", 18)}</button>`).join("")}
    </div>` : `
    <div class="card">
      <div class="eyebrow">Today</div>
      <div class="muted">${icon("check", 16)} You've logged everything for today. Nice work!</div>
    </div>`}

    <div class="grid2">
      ${cardLinkOpen("progress", "weight")}
        <div class="eyebrow">Weight</div>
        <div class="stat-num">${curW.toFixed(1)} <span class="unit">kg</span> ${trendBadge(weightDelta, "kg")}</div>
        <div class="muted">Goal ${goalW} kg &middot; ${(curW - goalW).toFixed(1)} kg to go</div>
        <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
        ${weightSeries.length >= 2 ? `<canvas id="weightSpark" height="32" class="sparkline"></canvas>` : ""}
      </div>
      ${cardLinkOpen(heightCm ? "progress" : "settings", heightCm ? "weight" : null)}
        <div class="eyebrow">BMI</div>
        ${bmiNow != null ? `
          <div class="stat-num">${bmiNow} ${trendBadge(bmiDelta)}</div>
          <div class="muted">${bmiCategory(bmiNow)}</div>
          ${bmiSeries.length >= 2 ? `<canvas id="bmiSpark" height="32" class="sparkline"></canvas>` : ""}
        ` : `<div class="muted">Add your height in Settings to track BMI</div>`}
      </div>
      ${cardLinkOpen("progress", "body")}
        <div class="eyebrow">Abdomen</div>
        ${lastB && lastB.abdomen != null ? `
          <div class="stat-num">${lastB.abdomen} <span class="unit">in</span> ${trendBadge(abdDelta, "in")}</div>
          <div class="muted">Since ${fmtDateShort(firstB.date)}</div>
          ${abdSeries.length >= 2 ? `<canvas id="abdomenSpark" height="32" class="sparkline"></canvas>` : ""}
        ` : `<div class="muted">Log a body measurement to see this</div>`}
      </div>
      ${cardLinkOpen(heightCm ? "progress" : "settings", heightCm ? "weight" : null)}
        <div class="eyebrow">Ideal Weight</div>
        ${ideal != null ? `
          <div class="stat-num">${ideal} <span class="unit">kg</span></div>
          <div class="muted">${curW > ideal ? `${(curW - ideal).toFixed(1)} kg to reach ideal` : curW < ideal ? `${(ideal - curW).toFixed(1)} kg below ideal` : "You're at your ideal weight"}</div>
          <div class="muted small">Your goal (${goalW} kg) is ${Math.abs(goalW - ideal).toFixed(1)} kg ${goalW > ideal ? "above" : goalW < ideal ? "below" : "equal to"} the calculated ideal</div>
        ` : `<div class="muted">Add your height in Settings to see this</div>`}
      </div>
      ${cardLinkOpen("progress", "body")}
        <div class="eyebrow">Total Inches Lost</div>
        <div class="stat-num">${inchesLost != null ? inchesLost.toFixed(1) : "0.0"} <span class="unit">in</span></div>
        <div class="muted">Across abdomen, waist, hips, chest, arms, thighs &amp; calf</div>
      </div>
      ${cardLinkOpen("progress", "steps")}
        <div class="eyebrow">Steps Yesterday</div>
        <div class="stat-num">${stepYesterday ? stepYesterday.steps.toLocaleString() : "—"} <span class="unit">/ ${stepGoal.toLocaleString()}</span></div>
        <div class="muted">${stepYesterday ? "" : "Not logged yet &middot; "}7-day avg: ${stepWeek.length ? Math.round(avg(stepWeek)).toLocaleString() : "—"}</div>
        <div class="progress"><div class="progress-fill" style="width:${stepYesterday ? Math.min(100, Math.round(stepYesterday.steps / stepGoal * 100)) : 0}%"></div></div>
      </div>
      ${cardLinkOpen("diet")}
        <div class="eyebrow">Diet Today</div>
        <div class="stat-num">${dietPct != null ? dietPct + "%" : "—"}</div>
        <div class="muted">${dietPct != null ? `${doneDietItems}/${totalDietItems} items logged` : "Not logged yet"}</div>
      </div>
      ${cardLinkOpen("progress", "weight")}
        <div class="eyebrow">7-Day Avg Weight</div>
        <div class="stat-num">${wk7.length ? avg(wk7).toFixed(2) : "—"} <span class="unit">kg</span></div>
        <div class="muted">${wk7.length} entr${wk7.length === 1 ? "y" : "ies"} this week</div>
      </div>
      ${cardLinkOpen("progress", "summary")}
        <div class="eyebrow">Logging Streak</div>
        <div class="stat-num">${currentStreak()} <span class="unit">days</span></div>
        <div class="muted">${logStats.skipped} day${logStats.skipped === 1 ? "" : "s"} skipped since ${fmtDateShort(state.profile.programStartDate)} &middot; ${logStats.logged}/${logStats.total} logged</div>
      </div>
    </div>

    <div class="card">
      <div class="eyebrow">Quick Log</div>
      <div class="quickrow">
        <button class="btn" onclick="openQuickLog('weight')">${icon("chart")} Weight</button>
        <button class="btn" onclick="openQuickLog('steps')">${icon("pulse")} Steps</button>
        <button class="btn" onclick="openQuickLog('body')">${icon("ruler")} Body</button>
        <button class="btn" onclick="openQuickLog('photo')">${icon("camera")} Photo</button>
      </div>
    </div>

    <div class="card card-link" onclick="goTo('diet')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();goTo('diet');}">
      ${icon("chevronRight", 16, "card-chevron")}
      <div class="eyebrow">Weekly Goal</div>
      <div class="muted">${icon("droplet", 16)} Drink 3–4 litres of water every day. Everything is measured uncooked.</div>
    </div>
  `;

  if (hero) hydrateHeroPhoto();
  if (weightSeries.length >= 2) drawSparkline("weightSpark", weightSeries, "--accent");
  if (bmiSeries.length >= 2) drawSparkline("bmiSpark", bmiSeries, "--accent-2");
  if (abdSeries.length >= 2) drawSparkline("abdomenSpark", abdSeries, "--accent");
}
async function hydrateHeroPhoto() {
  for (const id of ["heroPhotoImg", "heroOldImg"]) {
    const img = document.getElementById(id);
    if (!img) continue;
    const url = await getPhotoUrl(img.dataset.id);
    if (url) img.src = url;
  }
}
function goToWorkout() { setView("workout"); }
function openQuickLog(type) {
  if (type === "photo") { setView("progress"); progressSubTab = "photos"; render(); }
  else { setView("progress"); progressSubTab = type; render(); }
}

// ============ WORKOUT ============
function renderWorkout() {
  const el = document.getElementById("view-workout");
  const idx = dayIndexOf(workoutSelectedDate);
  const prog = PROGRAM[idx];
  const existing = state.workoutLogs.find(w => w.date === workoutSelectedDate);
  const warm = prog.warmup ? WARMUPS[prog.warmup] : null;

  const exerciseRows = prog.exercises.map((ex, i) => {
    const savedEx = existing && existing.exercises[i];
    const checked = savedEx ? savedEx.done : false;
    const savedSets = (savedEx && savedEx.sets) || [];
    const numSets = typeof ex.sets === "number" ? ex.sets : 0;
    const setRows = Array.from({ length: numSets }).map((_, s) => {
      const saved = savedSets[s] || {};
      const legacyWeight = s === 0 && !saved.weight && savedEx && savedEx.weightUsed ? savedEx.weightUsed : "";
      return `
        <div class="set-row">
          <span class="set-label">Set ${s + 1}</span>
          <input type="number" class="set-reps" data-ex="${i}" data-set="${s}" placeholder="Reps" value="${saved.reps ?? ""}" aria-label="Set ${s + 1} reps for ${ex.name}" />
          <input type="text" class="set-weight" data-ex="${i}" data-set="${s}" placeholder="Weight" value="${saved.weight ?? legacyWeight}" aria-label="Set ${s + 1} weight for ${ex.name}" />
        </div>`;
    }).join("");
    return `
      <div class="exercise-row ${checked ? "done" : ""}">
        <label class="check">
          <input type="checkbox" data-idx="${i}" class="ex-done" ${checked ? "checked" : ""} />
          <span></span>
        </label>
        <div class="ex-body">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-meta">${ex.sets} sets &times; ${ex.reps} reps &middot; rest ${ex.rest}</div>
          <div class="ex-cue">${ex.cue}</div>
          <a class="watch-link" href="${youtubeSearchUrl(ex.name)}" target="_blank" rel="noopener noreferrer">${icon("play", 15)} Watch demo</a>
          ${numSets ? `
          <div class="set-grid">
            <div class="set-row set-header"><span class="set-label"></span><span>Reps</span><span>Weight (kg)</span></div>
            ${setRows}
          </div>` : ""}
        </div>
      </div>`;
  }).join("");

  const cardioChecked = existing ? existing.cardioDone : false;
  const cardioSection = prog.rest ? "" : `
    <details class="accordion" open>
      <summary>30-Min Low-Impact Cardio Circuit</summary>
      <div class="muted small">${CARDIO_CIRCUIT.note}</div>
      <label class="check inline">
        <input type="checkbox" id="cardioDone" ${cardioChecked ? "checked" : ""} />
        <span></span> Cardio circuit completed
      </label>
      ${CARDIO_CIRCUIT.exercises.map(c => `<div class="mini-ex"><b>${c.name}</b> — ${c.sets} &times; ${c.reps}, rest ${c.rest}<div class="muted small">${c.cue}</div><a class="watch-link" href="${youtubeSearchUrl(c.name)}" target="_blank" rel="noopener noreferrer">${icon("play", 14)} Watch demo</a></div>`).join("")}
    </details>`;

  const warmSection = warm ? `
    <details class="accordion">
      <summary>${warm.title}</summary>
      <div class="muted small">${warm.note}</div>
      ${warm.exercises.map(w => `<div class="mini-ex"><b>${w.name}</b> — ${w.sets} &times; ${w.reps}<div class="muted small">${w.cue}</div><a class="watch-link" href="${youtubeSearchUrl(w.name)}" target="_blank" rel="noopener noreferrer">${icon("play", 14)} Watch demo</a></div>`).join("")}
    </details>` : "";

  const history = [...state.workoutLogs].sort(sortByDateDesc).slice(0, 20);
  const historyRows = history.map(h => {
    const doneCount = h.exercises.filter(e => e.done).length;
    return `<div class="history-row">
      <div><b>${fmtDate(h.date)}</b> &middot; ${h.label}</div>
      <div class="muted small">${doneCount}/${h.exercises.length} exercises ${h.cardioDone ? `&middot; cardio ${icon("check", 13)}` : ""}</div>
    </div>`;
  }).join("") || `<div class="muted">No workouts logged yet.</div>`;

  el.innerHTML = `
    <div class="card">
      <div class="row-between">
        <input type="date" id="workoutDate" value="${workoutSelectedDate}" aria-label="Workout date" />
        <div class="badge ${prog.rest ? "badge-rest" : "badge-train"}">${prog.label}</div>
      </div>
      <div class="muted">${prog.sub}</div>
    </div>

    ${warmSection}

    ${prog.rest ? `<div class="card"><div class="eyebrow">Rest Day Plan</div>` + prog.exercises.map(ex => `<div class="mini-ex"><b>${ex.name}</b><div class="muted small">${ex.cue}</div><a class="watch-link" href="${youtubeSearchUrl(ex.name)}" target="_blank" rel="noopener noreferrer">${icon("play", 14)} Watch demo</a></div>`).join("") + `</div>` : `
    <div class="card">
      <div class="eyebrow">Main Session</div>
      ${exerciseRows}
    </div>`}

    ${cardioSection}

    <div class="card">
      <label class="field-label" for="workoutNotes">Notes</label>
      <textarea id="workoutNotes" rows="2" placeholder="How did it feel?">${existing ? (existing.notes || "") : ""}</textarea>
      <button class="btn primary full" onclick="saveWorkout()">${icon("check", 16)} Save Workout</button>
    </div>

    <div class="card">
      <div class="eyebrow">History</div>
      ${historyRows}
    </div>
  `;

  document.getElementById("workoutDate").addEventListener("change", e => { workoutSelectedDate = e.target.value; renderWorkout(); });
}
function saveWorkout() {
  const idx = dayIndexOf(workoutSelectedDate);
  const prog = PROGRAM[idx];
  const exercises = prog.exercises.map((ex, i) => {
    const done = document.querySelector(`.ex-done[data-idx="${i}"]`).checked;
    const numSets = typeof ex.sets === "number" ? ex.sets : 0;
    const sets = [];
    for (let s = 0; s < numSets; s++) {
      const repsEl = document.querySelector(`.set-reps[data-ex="${i}"][data-set="${s}"]`);
      const weightEl = document.querySelector(`.set-weight[data-ex="${i}"][data-set="${s}"]`);
      sets.push({ reps: repsEl.value.trim(), weight: weightEl.value.trim() });
    }
    return { name: ex.name, setsReps: `${ex.sets}x${ex.reps}`, sets, done };
  });
  const cardioDoneEl = document.getElementById("cardioDone");
  const cardioDone = cardioDoneEl ? cardioDoneEl.checked : false;
  const notes = document.getElementById("workoutNotes").value.trim();
  const entry = { id: uid(), date: workoutSelectedDate, dayIndex: idx, label: prog.label, exercises, cardioDone, notes };
  const existingI = state.workoutLogs.findIndex(w => w.date === workoutSelectedDate);
  if (existingI >= 0) { entry.id = state.workoutLogs[existingI].id; state.workoutLogs[existingI] = entry; }
  else state.workoutLogs.push(entry);
  saveState();
  toast("Workout saved");
  renderWorkout();
}

// ============ DIET ============
function renderDiet() {
  const el = document.getElementById("view-diet");
  const activeDate = (document.getElementById("dietDate") && document.getElementById("dietDate").value) || todayISO();
  const existing = state.dietLogs.find(d => d.date === activeDate);
  const water = existing ? existing.water : 0;
  const items = existing ? existing.items : {};
  const mealNotes = existing ? (existing.mealNotes || {}) : {};
  window._dietExtras = existing ? [...(existing.extras || [])] : [];

  const totalItems = DIET.meals.reduce((n, m) => n + m.items.length, 0);
  const doneItems = DIET.meals.reduce((n, m) => n + m.items.filter((it, i) => items[m.key + "_" + i]).length, 0);
  const pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;

  const mealsHtml = DIET.meals.map(m => `
    <details class="accordion" open>
      <summary>${m.title}</summary>
      ${m.items.map((it, i) => {
        const k = m.key + "_" + i;
        const checked = !!items[k];
        return `<label class="check inline diet-item">
          <input type="checkbox" data-key="${k}" class="diet-check" ${checked ? "checked" : ""} />
          <span></span> ${it.name}${it.qty ? ` <span class="muted small">— ${it.qty}</span>` : ""}
        </label>`;
      }).join("")}
      ${m.note ? `<div class="muted small note">${m.note}</div>` : ""}
      <label class="field-label" for="note_${m.key}">Actual intake / substitutions (manual, optional)</label>
      <textarea class="meal-note" id="note_${m.key}" data-key="${m.key}" rows="1" placeholder="e.g. had 80g rice instead of 70g">${mealNotes[m.key] || ""}</textarea>
    </details>
  `).join("");

  const history = [...state.dietLogs].sort(sortByDateDesc).slice(0, 20);
  const historyRows = history.map(h => {
    const done = DIET.meals.reduce((n, m) => n + m.items.filter((it, i) => h.items[m.key + "_" + i]).length, 0);
    const extraCount = (h.extras || []).length;
    return `<div class="history-row"><div><b>${fmtDate(h.date)}</b></div><div class="muted small">${done}/${totalItems} items &middot; ${h.water}L water${extraCount ? ` &middot; ${extraCount} extra item${extraCount === 1 ? "" : "s"}` : ""}</div></div>`;
  }).join("") || `<div class="muted">No diet days logged yet.</div>`;

  el.innerHTML = `
    <div class="card">
      <div class="row-between">
        <input type="date" id="dietDate" value="${activeDate}" aria-label="Diet log date" />
        <div class="badge badge-train">${pct}% complete</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="card">
      <div class="eyebrow">Water Intake &middot; Goal ${DIET.water_goal_l}L</div>
      <div class="water-row">
        <button class="btn round" aria-label="Decrease water" onclick="adjustWater(-0.5)">${icon("minus")}</button>
        <div class="water-amt">${icon("droplet", 18)} <span id="waterAmt">${water.toFixed(1)} L</span></div>
        <button class="btn round" aria-label="Increase water" onclick="adjustWater(0.5)">${icon("plus")}</button>
      </div>
      <div class="progress"><div class="progress-fill water" style="width:${Math.min(100, Math.round(water / DIET.water_goal_l * 100))}%"></div></div>
    </div>

    <div class="card">
      <div class="eyebrow">Daily Macro Target</div>
      <div class="macro-row">
        <div><b>${DIET.daily_totals.calories}</b><div class="muted small">kcal</div></div>
        <div><b>${DIET.daily_totals.protein}g</b><div class="muted small">protein</div></div>
        <div><b>${DIET.daily_totals.carbs}g</b><div class="muted small">carbs</div></div>
        <div><b>${DIET.daily_totals.fats}g</b><div class="muted small">fats</div></div>
      </div>
    </div>

    ${mealsHtml}

    <div class="card">
      <div class="eyebrow">Anything else you ate today?</div>
      <div class="muted small">Log any off-plan food, drinks or snacks not in your prescribed diet.</div>
      <div class="extra-row">
        <input type="text" id="extraInput" placeholder="e.g. 2 biscuits, 1 cup tea" />
        <button type="button" class="btn" onclick="addDietExtra()">${icon("plus", 16)} Add</button>
      </div>
      <div id="extrasList"></div>
    </div>

    <div class="card">
      <div class="eyebrow">Tips</div>
      <ul class="tiplist">${DIET.tips.map(t => `<li>${t}</li>`).join("")}</ul>
      <div class="eyebrow">Travel Guidelines</div>
      <ul class="tiplist">${DIET.travel_tips.map(t => `<li>${t}</li>`).join("")}</ul>
    </div>

    <button class="btn primary full sticky-save" onclick="saveDiet()">${icon("check", 16)} Save Day</button>

    <div class="card">
      <div class="eyebrow">History</div>
      ${historyRows}
    </div>
  `;

  document.getElementById("dietDate").addEventListener("change", () => renderDiet());
  window._waterVal = water;
  renderDietExtrasList();
}
function adjustWater(delta) {
  window._waterVal = Math.max(0, Math.round(((window._waterVal || 0) + delta) * 10) / 10);
  document.getElementById("waterAmt").textContent = window._waterVal.toFixed(1) + " L";
  document.querySelector(".progress-fill.water").style.width = Math.min(100, Math.round(window._waterVal / DIET.water_goal_l * 100)) + "%";
}
function renderDietExtrasList() {
  const el = document.getElementById("extrasList");
  if (!el) return;
  const list = window._dietExtras || [];
  el.innerHTML = list.length ? list.map(e => `
    <div class="history-row">
      <div>${e.text}</div>
      <button class="linkbtn" aria-label="Remove item" onclick="removeDietExtra('${e.id}')">${icon("trash", 16)}</button>
    </div>`).join("") : `<div class="muted small">Nothing extra logged for this day.</div>`;
}
function addDietExtra() {
  const input = document.getElementById("extraInput");
  const text = input.value.trim();
  if (!text) return;
  window._dietExtras = window._dietExtras || [];
  window._dietExtras.push({ id: uid(), text });
  input.value = "";
  renderDietExtrasList();
}
function removeDietExtra(id) {
  window._dietExtras = (window._dietExtras || []).filter(e => e.id !== id);
  renderDietExtrasList();
}
function saveDiet() {
  const date = document.getElementById("dietDate").value;
  const items = {};
  document.querySelectorAll(".diet-check").forEach(cb => { items[cb.dataset.key] = cb.checked; });
  const mealNotes = {};
  document.querySelectorAll(".meal-note").forEach(t => { mealNotes[t.dataset.key] = t.value.trim(); });
  const water = window._waterVal || 0;
  const extras = window._dietExtras || [];
  const entry = { id: uid(), date, water, items, mealNotes, extras };
  const i = state.dietLogs.findIndex(d => d.date === date);
  if (i >= 0) { entry.id = state.dietLogs[i].id; state.dietLogs[i] = entry; } else state.dietLogs.push(entry);
  saveState();
  toast("Diet day saved");
  renderDiet();
}

// ============ PROGRESS ============
function renderProgress() {
  const el = document.getElementById("view-progress");
  el.innerHTML = `
    <div class="subtabs">
      ${PROGRESS_TABS.map(t => `<button class="subtab ${progressSubTab === t.key ? "active" : ""}" onclick="setProgressSubTab('${t.key}')">${icon(t.icon, 16)} ${t.label}</button>`).join("")}
    </div>
    <div id="progressContent"></div>
  `;
  if (progressSubTab === "weight") renderWeightTab();
  else if (progressSubTab === "body") renderBodyTab();
  else if (progressSubTab === "steps") renderStepsTab();
  else if (progressSubTab === "photos") renderPhotosTab();
  else renderSummaryTab();
}
function setProgressSubTab(t) { progressSubTab = t; renderProgress(); }

function renderWeightTab() {
  const c = document.getElementById("progressContent");
  const logs = [...state.weightLogs].sort(sortByDateAsc);
  const latest = logs[logs.length - 1];
  const wk7 = last7(state.weightLogs).map(l => l.weight);
  const totalChange = latest ? (latest.weight - state.profile.startWeight) : 0;
  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Add Weight Entry</div>
      <form id="weightForm" class="form-grid">
        <div class="field"><label for="wDate">Date</label><input id="wDate" type="date" name="date" value="${todayISO()}" required /></div>
        <div class="field"><label for="wWeight">Weight (kg)</label><input id="wWeight" type="number" step="0.1" name="weight" required /></div>
        ${state.profile.heightCm ? "" : `<div class="muted small">Add your height in Settings to auto-calculate BMI.</div>`}
        <div class="field"><label for="wNote">Note / mood</label><input id="wNote" type="text" name="note" /></div>
        <button class="btn primary" type="submit">${icon("plus", 16)} Add</button>
      </form>
    </div>
    <div class="grid3">
      <div class="card stat"><div class="eyebrow">Goal</div><div class="stat-num">${state.profile.goalWeight} <span class="unit">kg</span></div></div>
      <div class="card stat"><div class="eyebrow">Total Change</div><div class="stat-num">${totalChange >= 0 ? "+" : ""}${totalChange.toFixed(1)} <span class="unit">kg</span></div></div>
      <div class="card stat"><div class="eyebrow">7-Day Avg</div><div class="stat-num">${wk7.length ? avg(wk7).toFixed(2) : "—"} <span class="unit">kg</span></div></div>
    </div>
    <div class="card"><canvas id="weightChart" height="180" role="img" aria-label="Weight over time chart"></canvas></div>
    <div class="card">
      <div class="eyebrow">Log</div>
      <div class="table-scroll"><table class="datatable"><thead><tr><th>Date</th><th>Kg</th><th>BMI</th><th>Note</th><th></th></tr></thead>
      <tbody>${[...logs].reverse().map(l => `<tr><td>${fmtDate(l.date)}</td><td>${l.weight.toFixed(1)}</td><td>${state.profile.heightCm ? calcBmi(l.weight, state.profile.heightCm) : (l.bmi ?? "—")}</td><td class="muted small">${l.note || ""}</td><td><button class="linkbtn" aria-label="Delete entry" onclick="deleteEntry('weightLogs','${l.id}')">${icon("trash", 16)}</button></td></tr>`).join("")}</tbody></table></div>
    </div>
  `;
  document.getElementById("weightForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const weight = parseFloat(f.get("weight"));
    const bmi = calcBmi(weight, state.profile.heightCm);
    addOrReplace("weightLogs", { id: uid(), date: f.get("date"), weight, bmi, note: f.get("note") || "" });
    toast("Weight logged");
    renderWeightTab();
  });
  drawLineChart("weightChart", logs.map(l => ({ x: l.date, y: l.weight })), state.profile.goalWeight);
}

function renderBodyTab() {
  const c = document.getElementById("progressContent");
  const logs = [...state.bodyLogs].sort(sortByDateAsc);
  const latest = logs[logs.length - 1] || null;
  const ideal = idealBodyMeasurements();
  const diffRow = (label, current, idealVal) => {
    if (current == null) return `<tr><td>${label}</td><td>—</td><td>${idealVal ?? "—"}</td><td>—</td></tr>`;
    if (idealVal == null) return `<tr><td>${label}</td><td>${current}"</td><td>—</td><td>—</td></tr>`;
    const diff = +(current - idealVal).toFixed(1);
    return `<tr><td>${label}</td><td>${current}"</td><td>${idealVal}"</td><td>${diff > 0 ? "+" : ""}${diff}"</td></tr>`;
  };
  const armAvg = latest && latest.armL != null && latest.armR != null ? +((latest.armL + latest.armR) / 2).toFixed(1) : null;
  const thighAvg = latest && latest.thighL != null && latest.thighR != null ? +((latest.thighL + latest.thighR) / 2).toFixed(1) : null;
  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Body Diagram</div>
      ${bodySketchSVG(latest)}
      ${latest ? `<div class="muted small center">Latest measurements &middot; ${fmtDate(latest.date)}</div>` : `<div class="muted small center">Log a measurement below to see it plotted here.</div>`}
    </div>
    ${ideal ? `
    <div class="card">
      <div class="eyebrow">Current vs. Ideal (reference)</div>
      <div class="table-scroll"><table class="datatable">
        <thead><tr><th>Area</th><th>Current</th><th>Ideal</th><th>Diff</th></tr></thead>
        <tbody>
          ${diffRow("Abdomen", latest && latest.abdomen, ideal.abdomen)}
          ${diffRow("Chest", latest && latest.chest, ideal.chest)}
          ${diffRow("Waist", latest && latest.waist, ideal.waist)}
          ${diffRow("Hips", latest && latest.hips, ideal.hips)}
          ${diffRow("Arm (avg)", armAvg, ideal.arm)}
          ${diffRow("Thigh (avg)", thighAvg, ideal.thigh)}
          ${diffRow("Calf", latest && latest.calf, ideal.calf)}
        </tbody>
      </table></div>
      <div class="muted small">Ideal figures are a general height-based fitness reference, not a medical target — use as rough guidance only.</div>
    </div>` : `<div class="card"><div class="muted">Add your height in Settings to see ideal-measurement references.</div><button class="btn small" onclick="goTo('settings')">Add height</button></div>`}
    <div class="card">
      <div class="eyebrow">Add Body Measurement (inches)</div>
      <form id="bodyForm" class="form-grid">
        <div class="field"><label for="bDate">Date</label><input id="bDate" type="date" name="date" value="${todayISO()}" required /></div>
        <div class="field"><label for="bAbd">Abdomen</label><input id="bAbd" type="number" step="0.1" name="abdomen" /></div>
        <div class="field"><label for="bChest">Chest</label><input id="bChest" type="number" step="0.1" name="chest" /></div>
        <div class="field"><label for="bWaist">Waist</label><input id="bWaist" type="number" step="0.1" name="waist" /></div>
        <div class="field"><label for="bHips">Hips</label><input id="bHips" type="number" step="0.1" name="hips" /></div>
        <div class="field"><label for="bArmL">Arm - L</label><input id="bArmL" type="number" step="0.1" name="armL" /></div>
        <div class="field"><label for="bArmR">Arm - R</label><input id="bArmR" type="number" step="0.1" name="armR" /></div>
        <div class="field"><label for="bThighL">Thigh - L</label><input id="bThighL" type="number" step="0.1" name="thighL" /></div>
        <div class="field"><label for="bThighR">Thigh - R</label><input id="bThighR" type="number" step="0.1" name="thighR" /></div>
        <div class="field"><label for="bCalf">Calf</label><input id="bCalf" type="number" step="0.1" name="calf" /></div>
        <div class="field"><label for="bNote">Note</label><input id="bNote" type="text" name="note" /></div>
        <button class="btn primary" type="submit">${icon("plus", 16)} Add</button>
      </form>
    </div>
    <div class="card">
      <div class="eyebrow">Log</div>
      <div class="table-scroll"><table class="datatable"><thead><tr><th>Date</th><th>Abd</th><th>Chest</th><th>Waist</th><th>Hips</th><th>Arm L</th><th>Arm R</th><th>Thigh L</th><th>Thigh R</th><th>Calf</th><th></th></tr></thead>
      <tbody>${[...logs].reverse().map(l => `<tr><td>${fmtDate(l.date)}</td><td>${l.abdomen ?? "—"}</td><td>${l.chest ?? "—"}</td><td>${l.waist ?? "—"}</td><td>${l.hips ?? "—"}</td><td>${l.armL ?? "—"}</td><td>${l.armR ?? "—"}</td><td>${l.thighL ?? "—"}</td><td>${l.thighR ?? "—"}</td><td>${l.calf ?? "—"}</td><td><button class="linkbtn" aria-label="Delete entry" onclick="deleteEntry('bodyLogs','${l.id}')">${icon("trash", 16)}</button></td></tr>`).join("")}</tbody></table></div>
    </div>
  `;
  document.getElementById("bodyForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const num = k => f.get(k) ? parseFloat(f.get(k)) : null;
    addOrReplace("bodyLogs", { id: uid(), date: f.get("date"), abdomen: num("abdomen"), chest: num("chest"), waist: num("waist"), hips: num("hips"), armL: num("armL"), armR: num("armR"), thighL: num("thighL"), thighR: num("thighR"), calf: num("calf"), note: f.get("note") || "" });
    toast("Measurements logged");
    renderBodyTab();
  });
}

function renderStepsTab() {
  const c = document.getElementById("progressContent");
  const logs = [...state.stepLogs].sort(sortByDateAsc);
  const wk7 = last7(state.stepLogs).map(l => l.steps);
  const today = state.stepLogs.find(l => l.date === todayISO());
  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Add Steps</div>
      <form id="stepsForm" class="form-grid">
        <div class="field"><label for="sDate">Date</label><input id="sDate" type="date" name="date" value="${todayISO()}" required /></div>
        <div class="field"><label for="sSteps">Steps</label><input id="sSteps" type="number" name="steps" required /></div>
        <button class="btn primary" type="submit">${icon("plus", 16)} Add</button>
      </form>
    </div>
    <div class="grid3">
      <div class="card stat"><div class="eyebrow">Today</div><div class="stat-num">${today ? today.steps.toLocaleString() : 0}</div></div>
      <div class="card stat"><div class="eyebrow">vs Goal</div><div class="stat-num">${today ? (today.steps - state.profile.stepGoal).toLocaleString() : "—"}</div></div>
      <div class="card stat"><div class="eyebrow">7-Day Avg</div><div class="stat-num">${wk7.length ? Math.round(avg(wk7)).toLocaleString() : "—"}</div></div>
    </div>
    <div class="card"><canvas id="stepsChart" height="180" role="img" aria-label="Steps over time chart"></canvas></div>
    <div class="card">
      <div class="eyebrow">Log</div>
      <table class="datatable"><thead><tr><th>Date</th><th>Steps</th><th>vs Goal</th><th></th></tr></thead>
      <tbody>${[...logs].reverse().map(l => `<tr><td>${fmtDate(l.date)}</td><td>${l.steps.toLocaleString()}</td><td>${(l.steps - state.profile.stepGoal).toLocaleString()}</td><td><button class="linkbtn" aria-label="Delete entry" onclick="deleteEntry('stepLogs','${l.id}')">${icon("trash", 16)}</button></td></tr>`).join("")}</tbody></table>
    </div>
  `;
  document.getElementById("stepsForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    addOrReplace("stepLogs", { id: uid(), date: f.get("date"), steps: parseInt(f.get("steps"), 10) });
    toast("Steps logged");
    renderStepsTab();
  });
  drawLineChart("stepsChart", logs.map(l => ({ x: l.date, y: l.steps })), state.profile.stepGoal);
}

// ---------- PHOTOS (weekly progress photo tracker) ----------
async function getPhotoUrl(id) {
  if (photoUrlCache[id]) return photoUrlCache[id];
  const blob = await PhotoDB.get(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  photoUrlCache[id] = url;
  return url;
}
function revokePhotoUrl(id) { if (photoUrlCache[id]) { URL.revokeObjectURL(photoUrlCache[id]); delete photoUrlCache[id]; } }

function renderPhotosTab() {
  const c = document.getElementById("progressContent");
  const logs = [...state.photoLogs].sort(sortByDateDesc);
  const groups = {};
  logs.forEach(p => { const wk = weekNumberOf(p.date); (groups[wk] = groups[wk] || []).push(p); });
  const weekKeys = Object.keys(groups).map(Number).sort((a, b) => b - a);

  const galleryHtml = weekKeys.length ? weekKeys.map(wk => `
    <div class="card">
      <div class="eyebrow">Week ${wk}</div>
      <div class="photo-grid">
        ${groups[wk].map(p => `
          <button class="photo-thumb-wrap" onclick="openLightbox('${p.id}')" aria-label="View photo, ${ANGLE_LABELS[p.angle]}, ${fmtDate(p.date)}">
            <img class="photo-thumb" data-id="${p.id}" alt="Progress photo — ${ANGLE_LABELS[p.angle]} — ${fmtDate(p.date)}" />
            <span class="photo-tag">${ANGLE_LABELS[p.angle]}</span>
            <span class="photo-date">${fmtDateShort(p.date)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `).join("") : `<div class="card"><div class="muted">No progress photos yet. Add your first weekly photo below — front, side, back and a full dressed shot give the clearest comparison.</div></div>`;

  const photoDates = [...new Set(state.photoLogs.map(p => p.date))].sort().reverse();

  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Add Weekly Progress Photo</div>
      <form id="photoForm" class="form-grid">
        <div class="field"><label for="pDate">Date</label><input id="pDate" type="date" name="date" value="${todayISO()}" required /></div>
        <div class="field">
          <label>Angle</label>
          <div class="chip-row">
            ${ANGLE_ORDER.map((a, i) => `<label class="chip"><input type="radio" name="angle" value="${a}" ${i === 0 ? "checked" : ""} /><span>${ANGLE_LABELS[a]}</span></label>`).join("")}
          </div>
        </div>
        <div class="field">
          <label for="pFile">Photo</label>
          <input id="pFile" type="file" name="file" accept="image/*" capture="environment" />
          <div class="muted small">You'll crop it to a fixed frame next — nothing gets stretched or squeezed.</div>
          <div id="pPreviewWrap" class="crop-preview-wrap" style="display:none">
            <img id="pPreviewImg" class="crop-preview-img" alt="Cropped photo preview" />
            <span class="muted small">${icon("check", 14)} Cropped &amp; ready — tap Choose File to redo</span>
          </div>
        </div>
        <div class="field"><label for="pNote">Note (optional)</label><input id="pNote" type="text" name="note" placeholder="e.g. morning, after workout" /></div>
        <button class="btn primary" type="submit">${icon("camera", 16)} Save Photo</button>
      </form>
    </div>

    <div class="card">
      <div class="eyebrow">${icon("image", 16)} Weekly Collage</div>
      <div class="muted small">Combine front, side, back &amp; full photos from one day into a single beautiful, date-stamped collage — nothing cropped or cut off.</div>
      <div class="field"><label for="collageDate">Date</label>
        <select id="collageDate">${photoDates.length ? photoDates.map(d => `<option value="${d}">${fmtDate(d)}</option>`).join("") : `<option value="">No photos yet</option>`}</select>
      </div>
      <button class="btn primary full" ${photoDates.length ? "" : "disabled"} onclick="makeCollage()">${icon("image", 16)} Generate Collage</button>
    </div>

    <div class="card">
      <div class="eyebrow">Compare &amp; Before/After</div>
      <div class="form-grid">
        <div class="field"><label for="cmpAngle">Angle</label>
          <select id="cmpAngle">${ANGLE_ORDER.map(a => `<option value="${a}">${ANGLE_LABELS[a]}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="cmpA">Earlier (before) photo</label><select id="cmpA"></select></div>
        <div class="field"><label for="cmpB">Later (after) photo</label><select id="cmpB"></select></div>
      </div>
      <div class="compare-row" id="compareImages"></div>
      <button class="btn full" onclick="makeBeforeAfter()">${icon("download", 16)} Download Before &amp; After</button>
    </div>

    ${galleryHtml}
  `;

  document.getElementById("photoForm").addEventListener("submit", onSavePhoto);
  document.getElementById("pFile").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) openCropModal(file);
  });
  window._pendingPhotoBlob = null;
  hydratePhotoImages();
  setupCompare();
}

// ---------- crop tool (fixed-aspect pan & zoom, never stretches the source photo) ----------
const CROP_ASPECT = 3 / 4;
function openCropModal(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const frameW = 300, frameH = Math.round(frameW / CROP_ASPECT);
    openModal(`
      <button class="modal-close" aria-label="Close" onclick="cancelCrop()">${icon("x")}</button>
      <div class="eyebrow">Crop Photo</div>
      <div class="muted small">Drag to reposition, use the slider to zoom. The frame's aspect ratio stays fixed so your photo is never stretched or squeezed.</div>
      <div class="crop-frame-wrap"><canvas id="cropCanvas" width="${frameW}" height="${frameH}"></canvas></div>
      <input type="range" id="cropZoom" class="crop-zoom" min="1" max="3" step="0.01" value="1" aria-label="Zoom" />
      <div class="export-actions">
        <button class="btn" onclick="cancelCrop()">Cancel</button>
        <button class="btn primary" onclick="confirmCrop()">${icon("check", 16)} Use Photo</button>
      </div>
    `);
    const canvas = document.getElementById("cropCanvas");
    const minScale = Math.max(frameW / img.width, frameH / img.height);
    window._cropper = {
      img, canvas, ctx: canvas.getContext("2d"), frameW, frameH, minScale, zoom: 1,
      panX: (frameW - img.width * minScale) / 2, panY: (frameH - img.height * minScale) / 2,
      url, dragging: false, lastX: 0, lastY: 0
    };
    drawCrop();
    canvas.addEventListener("pointerdown", cropPointerDown);
    canvas.addEventListener("pointermove", cropPointerMove);
    canvas.addEventListener("pointerup", cropPointerUp);
    canvas.addEventListener("pointerleave", cropPointerUp);
    document.getElementById("cropZoom").addEventListener("input", cropZoomChange);
  };
  img.src = url;
}
function drawCrop() {
  const c = window._cropper;
  if (!c) return;
  const scale = c.minScale * c.zoom;
  c.ctx.clearRect(0, 0, c.frameW, c.frameH);
  c.ctx.drawImage(c.img, c.panX, c.panY, c.img.width * scale, c.img.height * scale);
}
function clampCropPan() {
  const c = window._cropper;
  const scale = c.minScale * c.zoom;
  const drawW = c.img.width * scale, drawH = c.img.height * scale;
  c.panX = Math.min(0, Math.max(c.frameW - drawW, c.panX));
  c.panY = Math.min(0, Math.max(c.frameH - drawH, c.panY));
}
function cropZoomChange(e) {
  window._cropper.zoom = parseFloat(e.target.value);
  clampCropPan();
  drawCrop();
}
function cropPointerDown(e) {
  const c = window._cropper;
  c.dragging = true; c.lastX = e.clientX; c.lastY = e.clientY;
  c.canvas.setPointerCapture(e.pointerId);
  c.canvas.classList.add("dragging");
}
function cropPointerMove(e) {
  const c = window._cropper;
  if (!c || !c.dragging) return;
  c.panX += e.clientX - c.lastX; c.panY += e.clientY - c.lastY;
  c.lastX = e.clientX; c.lastY = e.clientY;
  clampCropPan();
  drawCrop();
}
function cropPointerUp() {
  const c = window._cropper;
  if (!c) return;
  c.dragging = false;
  c.canvas.classList.remove("dragging");
}
function confirmCrop() {
  const c = window._cropper;
  const outW = 900, outH = Math.round(outW / CROP_ASPECT);
  const ratio = outW / c.frameW;
  const out = document.createElement("canvas");
  out.width = outW; out.height = outH;
  const octx = out.getContext("2d");
  const scale = c.minScale * c.zoom;
  octx.drawImage(c.img, c.panX * ratio, c.panY * ratio, c.img.width * scale * ratio, c.img.height * scale * ratio);
  out.toBlob(blob => {
    window._pendingPhotoBlob = blob;
    if (window._pendingPreviewUrl) URL.revokeObjectURL(window._pendingPreviewUrl);
    window._pendingPreviewUrl = URL.createObjectURL(blob);
    URL.revokeObjectURL(c.url);
    window._cropper = null;
    closeModal();
    const wrap = document.getElementById("pPreviewWrap"), img = document.getElementById("pPreviewImg");
    if (wrap && img) { img.src = window._pendingPreviewUrl; wrap.style.display = "flex"; }
    toast("Photo cropped");
  }, "image/jpeg", 0.9);
}
function cancelCrop() {
  if (window._cropper) URL.revokeObjectURL(window._cropper.url);
  window._cropper = null;
  closeModal();
  const fileInput = document.getElementById("pFile");
  if (fileInput) fileInput.value = "";
}

async function onSavePhoto(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  if (!window._pendingPhotoBlob) { toast("Choose and crop a photo first"); return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const blob = await compressImage(window._pendingPhotoBlob);
    const id = uid();
    await PhotoDB.put(id, blob);
    state.photoLogs.push({ id, date: f.get("date"), angle: f.get("angle") || "front", note: f.get("note") || "" });
    saveState();
    if (window._pendingPreviewUrl) { URL.revokeObjectURL(window._pendingPreviewUrl); window._pendingPreviewUrl = null; }
    window._pendingPhotoBlob = null;
    toast("Photo saved");
    renderPhotosTab();
  } catch (err) {
    console.error(err);
    toast("Could not save photo");
    btn.disabled = false; btn.innerHTML = `${icon("camera", 16)} Save Photo`;
  }
}

async function hydratePhotoImages() {
  const imgs = document.querySelectorAll(".photo-thumb[data-id]");
  for (const img of imgs) {
    const url = await getPhotoUrl(img.dataset.id);
    if (url) img.src = url;
  }
}

function setupCompare() {
  const angleSel = document.getElementById("cmpAngle");
  const aSel = document.getElementById("cmpA");
  const bSel = document.getElementById("cmpB");
  function populate() {
    const angle = angleSel.value;
    const matches = [...state.photoLogs].filter(p => p.angle === angle).sort(sortByDateAsc);
    const opts = matches.map(p => `<option value="${p.id}">${fmtDate(p.date)}</option>`).join("");
    aSel.innerHTML = opts; bSel.innerHTML = opts;
    if (matches.length) { aSel.value = matches[0].id; bSel.value = matches[matches.length - 1].id; }
    refreshCompareImages();
  }
  angleSel.addEventListener("change", populate);
  aSel.addEventListener("change", refreshCompareImages);
  bSel.addEventListener("change", refreshCompareImages);
  populate();
}
async function refreshCompareImages() {
  const aSel = document.getElementById("cmpA"), bSel = document.getElementById("cmpB");
  const container = document.getElementById("compareImages");
  if (!aSel.value || !bSel.value) { container.innerHTML = `<div class="muted">Add at least two photos of the same angle to compare.</div>`; return; }
  const aLog = state.photoLogs.find(p => p.id === aSel.value);
  const bLog = state.photoLogs.find(p => p.id === bSel.value);
  const [aUrl, bUrl] = await Promise.all([getPhotoUrl(aSel.value), getPhotoUrl(bSel.value)]);
  container.innerHTML = `
    <div class="compare-col"><img src="${aUrl}" alt="Earlier progress photo" /><div class="muted small">${fmtDate(aLog.date)}</div></div>
    <div class="compare-col"><img src="${bUrl}" alt="Later progress photo" /><div class="muted small">${fmtDate(bLog.date)}</div></div>
  `;
}

async function openLightbox(id) {
  const log = state.photoLogs.find(p => p.id === id);
  openModal(`
    <button class="modal-close" aria-label="Close" onclick="closeModal()">${icon("x")}</button>
    <img id="lightboxImg" class="lightbox-img" alt="Progress photo — ${ANGLE_LABELS[log.angle]} — ${fmtDate(log.date)}" />
    <div class="lightbox-meta">${ANGLE_LABELS[log.angle]} &middot; ${fmtDate(log.date)}${log.note ? " &middot; " + log.note : ""}</div>
    <button class="btn danger full" onclick="deletePhoto('${id}')">${icon("trash", 16)} Delete Photo</button>
  `);
  const url = await getPhotoUrl(id);
  const img = document.getElementById("lightboxImg");
  if (img && url) img.src = url;
}
async function deletePhoto(id) {
  if (!confirm("Delete this progress photo? This cannot be undone.")) return;
  await PhotoDB.delete(id);
  revokePhotoUrl(id);
  state.photoLogs = state.photoLogs.filter(p => p.id !== id);
  saveState();
  closeModal();
  toast("Photo deleted");
  renderPhotosTab();
}

// ---------- canvas image export engine (collage + before/after) ----------
function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Draws an image fully "contained" within the given box — preserves aspect ratio, never crops.
function drawContain(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

async function generateCollage(dateISO) {
  const entries = ANGLE_ORDER.map(a => state.photoLogs.find(p => p.date === dateISO && p.angle === a));
  const imgs = await Promise.all(entries.map(async e => (e ? loadImageEl(await getPhotoUrl(e.id)) : null)));

  const W = 1080, headerH = 160, pad = 30, gap = 20, footerH = 60;
  const cellW = (W - pad * 2 - gap) / 2;
  const cellH = cellW * 1.2;
  const H = headerH + cellH * 2 + gap + pad * 2 + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f5f8f7"; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#0d9488"); grad.addColorStop(1, "#0f766e");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, headerH);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Progress Photos", pad, 66);
  ctx.font = "600 24px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(fmtDate(dateISO), pad, 102);
  ctx.globalAlpha = 0.85;
  ctx.font = "500 18px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText((state.profile.name || "Alok's Tracker App") + " · Alok's Tracker App", pad, 134);
  ctx.globalAlpha = 1;

  const positions = [
    [pad, headerH + pad], [pad + cellW + gap, headerH + pad],
    [pad, headerH + pad + cellH + gap], [pad + cellW + gap, headerH + pad + cellH + gap]
  ];
  ANGLE_ORDER.forEach((a, i) => {
    const [x, y] = positions[i];
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, x, y, cellW, cellH, 22); ctx.fill();
    ctx.save();
    roundRectPath(ctx, x, y, cellW, cellH, 22); ctx.clip();
    if (imgs[i]) {
      drawContain(ctx, imgs[i], x + 12, y + 12, cellW - 24, cellH - 60);
    } else {
      ctx.fillStyle = "#eef3f1"; ctx.fillRect(x + 12, y + 12, cellW - 24, cellH - 60);
      ctx.fillStyle = "#8a9a95"; ctx.font = "500 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("No photo", x + cellW / 2, y + cellH / 2 - 24);
      ctx.textAlign = "left";
    }
    ctx.restore();
    ctx.fillStyle = "#0d9488";
    roundRectPath(ctx, x + 16, y + cellH - 42, cellW - 32, 30, 15); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "700 15px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(ANGLE_LABELS[a].toUpperCase(), x + cellW / 2, y + cellH - 22);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "#5c6f6a"; ctx.font = "500 16px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Generated with Alok's Tracker App — private progress tracker", W / 2, H - 24);
  ctx.textAlign = "left";
  return canvas;
}

async function generateBeforeAfter(aId, bId) {
  const aLog = state.photoLogs.find(p => p.id === aId), bLog = state.photoLogs.find(p => p.id === bId);
  const [aImg, bImg] = await Promise.all([loadImageEl(await getPhotoUrl(aId)), loadImageEl(await getPhotoUrl(bId))]);

  const W = 1080, headerH = 130, pad = 26, gap = 18, footerH = 50;
  const colW = (W - pad * 2 - gap) / 2;
  const colH = colW * 1.35;
  const H = headerH + colH + pad * 2 + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f5f8f7"; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#0d9488"); grad.addColorStop(1, "#0f766e");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
  ctx.font = "700 40px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Before & After", W / 2, 62);
  ctx.globalAlpha = 0.9;
  ctx.font = "500 20px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText((state.profile.name || "Alok's Tracker App") + " · Alok's Tracker App", W / 2, 94);
  ctx.globalAlpha = 1; ctx.textAlign = "left";

  const cols = [
    { img: aImg, label: "BEFORE", date: aLog.date, x: pad },
    { img: bImg, label: "AFTER", date: bLog.date, x: pad + colW + gap }
  ];
  cols.forEach(col => {
    const y = headerH + pad;
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, col.x, y, colW, colH, 22); ctx.fill();
    ctx.save();
    roundRectPath(ctx, col.x, y, colW, colH, 22); ctx.clip();
    drawContain(ctx, col.img, col.x + 10, y + 10, colW - 20, colH - 74);
    ctx.restore();
    ctx.fillStyle = "#0d9488";
    roundRectPath(ctx, col.x + 16, y + colH - 54, colW - 32, 36, 18); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "700 17px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${col.label} · ${fmtDateShort(col.date)}`, col.x + colW / 2, y + colH - 30);
    ctx.textAlign = "left";
  });

  // divider
  ctx.strokeStyle = "#dde6e3"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2, headerH + pad); ctx.lineTo(W / 2, headerH + pad + colH); ctx.stroke();

  ctx.fillStyle = "#5c6f6a"; ctx.font = "500 16px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Generated with Alok's Tracker App — private progress tracker", W / 2, H - 18);
  ctx.textAlign = "left";
  return canvas;
}

function showExportModal(canvas, filename, title) {
  const dataUrl = canvas.toDataURL("image/png");
  window._exportDataUrl = dataUrl;
  window._exportFilename = filename;
  openModal(`
    <button class="modal-close" aria-label="Close" onclick="closeModal()">${icon("x")}</button>
    <div class="eyebrow">${title}</div>
    <img src="${dataUrl}" class="lightbox-img" alt="${title}" />
    <div class="export-actions">
      <button class="btn primary" onclick="downloadExportImage()">${icon("download", 16)} Download</button>
      <button class="btn" id="shareImgBtn">${icon("phone", 16)} Share</button>
    </div>
  `);
  const shareBtn = document.getElementById("shareImgBtn");
  if (navigator.share) {
    shareBtn.addEventListener("click", async () => {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title });
        } else {
          downloadExportImage();
        }
      } catch (err) { /* user cancelled share sheet */ }
    });
  } else {
    shareBtn.style.display = "none";
  }
}
function downloadExportImage() {
  const a = document.createElement("a");
  a.href = window._exportDataUrl; a.download = window._exportFilename;
  a.click();
}
async function makeCollage() {
  const dateSel = document.getElementById("collageDate");
  if (!dateSel || !dateSel.value) { toast("Add at least one photo first"); return; }
  toast("Building collage…");
  const canvas = await generateCollage(dateSel.value);
  showExportModal(canvas, `alokstracker-collage-${dateSel.value}.png`, "Progress Collage");
}
async function makeBeforeAfter() {
  const aSel = document.getElementById("cmpA"), bSel = document.getElementById("cmpB");
  if (!aSel.value || !bSel.value) { toast("Need two photos of the same angle"); return; }
  if (aSel.value === bSel.value) { toast("Pick two different photos"); return; }
  toast("Building before & after…");
  const canvas = await generateBeforeAfter(aSel.value, bSel.value);
  showExportModal(canvas, `alokstracker-before-after-${todayISO()}.png`, "Before & After");
}

function renderSummaryTab() {
  const c = document.getElementById("progressContent");
  const months = new Set();
  state.weightLogs.forEach(l => months.add(monthKey(l.date)));
  state.stepLogs.forEach(l => months.add(monthKey(l.date)));
  state.workoutLogs.forEach(l => months.add(monthKey(l.date)));
  state.bodyLogs.forEach(l => months.add(monthKey(l.date)));
  const sorted = [...months].sort();

  const rows = sorted.map(mk => {
    const w = state.weightLogs.filter(l => monthKey(l.date) === mk).sort(sortByDateAsc);
    const s = state.stepLogs.filter(l => monthKey(l.date) === mk);
    const wo = state.workoutLogs.filter(l => monthKey(l.date) === mk && !PROGRAM[l.dayIndex].rest);
    const b = state.bodyLogs.filter(l => monthKey(l.date) === mk).sort(sortByDateDesc);
    const startW = w[0] ? w[0].weight : "—";
    const endW = w.length ? w[w.length - 1].weight : "—";
    const change = (w.length && typeof startW === "number") ? (endW - startW).toFixed(1) : "—";
    const avgSteps = s.length ? Math.round(avg(s.map(x => x.steps))) : "—";
    const waist = b.length ? b[0].waist : "—";
    return `<tr><td>${monthLabel(mk)}</td><td>${startW}</td><td>${endW}</td><td>${change}</td><td>${avgSteps === "—" ? "—" : avgSteps.toLocaleString()}</td><td>${wo.length}</td><td>${waist ?? "—"}</td></tr>`;
  }).join("");

  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Monthly Summary (auto-rolled)</div>
      <div class="table-scroll"><table class="datatable">
        <thead><tr><th>Month</th><th>Start Wt</th><th>End Wt</th><th>Change</th><th>Avg Steps</th><th>Workouts</th><th>Waist</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">No data yet.</td></tr>`}</tbody>
      </table></div>
    </div>
  `;
}

function addOrReplace(collection, entry) {
  const i = state[collection].findIndex(x => x.date === entry.date);
  if (i >= 0) { entry.id = state[collection][i].id; state[collection][i] = entry; }
  else state[collection].push(entry);
  saveState();
}
function deleteEntry(collection, id) {
  state[collection] = state[collection].filter(x => x.id !== id);
  saveState();
  render();
}

// ---------- tiny canvas line chart (no external libs) ----------
function drawSparkline(canvasId, values, colorVar) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !values || values.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 120;
  const h = parseInt(canvas.getAttribute("height"), 10) || 32;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const min = Math.min(...values), max = Math.max(...values);
  const xAt = i => 2 + (i / (values.length - 1)) * (w - 4);
  const yAt = v => h - 4 - ((v - min) / ((max - min) || 1)) * (h - 8);
  const color = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || "#0d9488";
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  values.forEach((v, i) => { const x = xAt(i), y = yAt(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  ctx.fillStyle = color;
  const lastX = xAt(values.length - 1), lastY = yAt(values[values.length - 1]);
  ctx.beginPath(); ctx.arc(lastX, lastY, 3, 0, Math.PI * 2); ctx.fill();
}

function drawLineChart(canvasId, points, goalY) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || points.length === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
  const cssH = parseInt(canvas.getAttribute("height"), 10) || 180;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = 24;
  const ys = points.map(p => p.y).concat(goalY != null ? [goalY] : []);
  const minY = Math.min(...ys) * 0.98;
  const maxY = Math.max(...ys) * 1.02;
  const xStep = points.length > 1 ? (cssW - pad * 2) / (points.length - 1) : 0;
  const yScale = v => cssH - pad - ((v - minY) / (maxY - minY || 1)) * (cssH - pad * 2);

  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent").trim() || "#0d9488";
  const grid = styles.getPropertyValue("--border").trim() || "#333";
  const text = styles.getPropertyValue("--muted").trim() || "#888";

  ctx.strokeStyle = grid; ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + (i / 3) * (cssH - pad * 2);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(cssW - pad, y); ctx.stroke();
  }
  if (goalY != null) {
    ctx.strokeStyle = "#e0a020"; ctx.setLineDash([4, 4]);
    const gy = yScale(goalY);
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(cssW - pad, gy); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => { const x = pad + i * xStep; const y = yScale(p.y); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.stroke();
  ctx.fillStyle = accent;
  points.forEach((p, i) => { const x = pad + i * xStep; const y = yScale(p.y); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = text; ctx.font = "11px sans-serif";
  if (points.length) {
    ctx.fillText(points[0].x.slice(5), pad, cssH - 4);
    ctx.fillText(points[points.length - 1].x.slice(5), cssW - pad - 30, cssH - 4);
  }
}

// ============ SETTINGS ============
function renderSettings() {
  const el = document.getElementById("view-settings");
  const p = state.profile;
  el.innerHTML = `
    <div class="card">
      <div class="eyebrow">Profile & Goals</div>
      <form id="profileForm" class="form-grid">
        <div class="field"><label for="pName">Name</label><input id="pName" type="text" name="name" value="${p.name}" /></div>
        <div class="field"><label for="pStart">Program Start Date</label><input id="pStart" type="date" name="programStartDate" value="${p.programStartDate}" /></div>
        <div class="field"><label for="pStartW">Starting Weight (kg)</label><input id="pStartW" type="number" step="0.1" name="startWeight" value="${p.startWeight}" /></div>
        <div class="field"><label for="pGoalW">Goal Weight (kg)</label><input id="pGoalW" type="number" step="0.1" name="goalWeight" value="${p.goalWeight}" /></div>
        <div class="field"><label for="pStepGoal">Daily Step Goal</label><input id="pStepGoal" type="number" name="stepGoal" value="${p.stepGoal}" /></div>
        <div class="field"><label for="pHeight">Height (cm, optional — for BMI)</label><input id="pHeight" type="number" name="heightCm" value="${p.heightCm ?? ""}" /></div>
        <button class="btn primary" type="submit">${icon("check", 16)} Save Profile</button>
      </form>
    </div>

    <div class="card">
      <div class="eyebrow">App</div>
      <button class="btn full" id="installBtn" style="display:none">${icon("phone", 16)} Install App</button>
      <div class="muted small">Installing adds Alok's Tracker App to your home screen and lets it run offline.</div>
    </div>

    <div class="card">
      <div class="eyebrow">Data</div>
      <button class="btn full" onclick="exportData()">${icon("download", 16)} Export Backup (JSON, incl. photos)</button>
      <label class="btn full" for="importFile" style="text-align:center;display:flex;justify-content:center;gap:8px;cursor:pointer;">${icon("upload", 16)} Import Backup</label>
      <input type="file" id="importFile" accept="application/json" style="display:none" />
      <button class="btn full danger" onclick="resetData()">${icon("trash", 16)} Reset All Data</button>
    </div>

    <div class="card">
      <div class="eyebrow">About This Program</div>
      <div class="muted small">
        Private & confidential coaching program prepared for ${p.name} by Coachedbyhimanshu.
        Not a generic template — tailored to individual assessment, equipment, and history.
        Do not copy, forward, or redistribute. Always consult a physician before beginning any new
        exercise or diet program, particularly if you have a pre-existing medical condition.
      </div>
    </div>
  `;
  document.getElementById("profileForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.profile = {
      name: f.get("name") || DEFAULT_PROFILE.name,
      programStartDate: f.get("programStartDate"),
      startWeight: parseFloat(f.get("startWeight")),
      goalWeight: parseFloat(f.get("goalWeight")),
      stepGoal: parseInt(f.get("stepGoal"), 10),
      heightCm: f.get("heightCm") ? parseFloat(f.get("heightCm")) : null
    };
    saveState();
    toast("Profile saved");
    render();
  });
  document.getElementById("importFile").addEventListener("change", handleImport);
  const installBtn = document.getElementById("installBtn");
  if (window._deferredInstallPrompt) installBtn.style.display = "block";
  installBtn.addEventListener("click", async () => {
    if (!window._deferredInstallPrompt) return;
    window._deferredInstallPrompt.prompt();
    await window._deferredInstallPrompt.userChoice;
    window._deferredInstallPrompt = null;
    installBtn.style.display = "none";
  });
}

function blobToBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }

async function exportData() {
  toast("Preparing backup…");
  const _photoBlobs = [];
  for (const p of state.photoLogs) {
    const blob = await PhotoDB.get(p.id);
    if (blob) _photoBlobs.push({ id: p.id, data: await blobToBase64(blob) });
  }
  const payload = { ...state, _photoBlobs };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `alokstracker-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Backup downloaded");
}
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const photoBlobs = parsed._photoBlobs || [];
      delete parsed._photoBlobs;
      parsed.photoLogs = parsed.photoLogs || [];
      state = parsed;
      saveState();
      for (const pb of photoBlobs) {
        const b = await (await fetch(pb.data)).blob();
        await PhotoDB.put(pb.id, b);
      }
      photoUrlCache = {};
      toast("Backup imported");
      render();
    } catch (err) { console.error(err); toast("Invalid backup file"); }
  };
  reader.readAsText(file);
}
function resetData() {
  if (!confirm("This will permanently delete all logged data and photos on this device. Continue?")) return;
  state.photoLogs.forEach(p => PhotoDB.delete(p.id));
  photoUrlCache = {};
  state = seedState();
  saveState();
  toast("Data reset");
  render();
}

// ---------- init ----------
function init() {
  state = loadState();
  document.querySelectorAll(".navbtn").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  setView("home");

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    window._deferredInstallPrompt = e;
    const installBtn = document.getElementById("installBtn");
    if (installBtn) installBtn.style.display = "block";
  });
}
document.addEventListener("DOMContentLoaded", init);
