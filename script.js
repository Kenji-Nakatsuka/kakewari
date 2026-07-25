const appEl = document.querySelector(".app");
const titleScreen = document.getElementById("titleScreen");
const gameEls = document.querySelectorAll(".game-ui");
const countdownEl = document.getElementById("countdown");
const timerEl = document.getElementById("timer");
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const feedbackEl = document.getElementById("feedback");
const progressDots = document.getElementById("progressDots");
const countEl = document.getElementById("count");
const correctEl = document.getElementById("correct");
const streakEl = document.getElementById("streak");
const resultEl = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultTime = document.getElementById("resultTime");
const resultText = document.getElementById("resultText");
const resultBadges = document.getElementById("resultBadges");
const rankingEl = document.getElementById("ranking");
const rankingScreen = document.getElementById("rankingScreen");
const titleRankingList = document.getElementById("titleRankingList");
const rankingTabs = document.getElementById("rankingTabs");
const xpCard = document.getElementById("xpCard");
const soundToggle = document.getElementById("soundToggle");
const karutaSelect = document.getElementById("karutaSelect");
const karutaMode = document.getElementById("karutaMode");
const karutaTimerEl = document.getElementById("karutaTimer");
const karutaCountEl = document.getElementById("karutaCount");
const karutaCorrectEl = document.getElementById("karutaCorrect");
const karutaMistakesEl = document.getElementById("karutaMistakes");
const karutaReaderEl = document.getElementById("karutaReader");
const karutaFullPoemEl = document.getElementById("karutaFullPoem");
const karutaChoicesEl = document.getElementById("karutaChoices");
const karutaPenaltyEl = document.getElementById("karutaPenalty");
const karutaShimoAreaEl = document.querySelector(".karuta-shimo-area");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const courses = {
  elementary: {
    label: "小学生 ふつう",
    shortLabel: "小ふつう",
    detail: "かけ算・わり算",
    leftDigits: 1,
    rightDigits: 1,
    bonus: 5,
  },
  hard: {
    label: "小学生 難しい",
    shortLabel: "小難しい",
    detail: "2桁と2桁のかけ算・わり算",
    leftDigits: 2,
    rightDigits: 2,
    bonus: 10,
  },
  oni: {
    label: "小学生 鬼",
    shortLabel: "小鬼",
    detail: "3桁と2桁のかけ算・わり算",
    leftDigits: 3,
    rightDigits: 2,
    bonus: 20,
  },
  middle: {
    label: "中学生 ふつう",
    shortLabel: "中ふつう",
    detail: "正の数・負の数の加減乗除",
    type: "middle",
    bonus: 5,
  },
  middleHard: {
    label: "中学生 難しい",
    shortLabel: "中難しい",
    detail: "3つの正負の数の計算",
    type: "middleHard",
    bonus: 10,
  },
  middleOni: {
    label: "中学生 鬼",
    shortLabel: "中鬼",
    detail: "累乗入りの正負の計算",
    type: "middleOni",
    bonus: 20,
  },
};

// コース別メダル基準タイム（ミリ秒）。クリアすれば最低でも銅メダル
const medalTimes = {
  elementary: { gold: 45000, silver: 80000 },
  hard: { gold: 240000, silver: 420000 },
  oni: { gold: 420000, silver: 720000 },
  middle: { gold: 60000, silver: 110000 },
  middleHard: { gold: 150000, silver: 260000 },
  middleOni: { gold: 180000, silver: 320000 },
};
const medalEmoji = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const medalName = { gold: "きんメダル", silver: "ぎんメダル", bronze: "どうメダル" };
const medalOrder = ["bronze", "silver", "gold"];

// けいさんレベル（称号）
const ranks = [
  { xp: 0, title: "けいさんたまご", emoji: "🥚" },
  { xp: 30, title: "けいさんみならい", emoji: "🐣" },
  { xp: 80, title: "けいさんれんしゅうせい", emoji: "🐥" },
  { xp: 160, title: "けいさんファイター", emoji: "🔥" },
  { xp: 280, title: "けいさんマスター", emoji: "⚔️" },
  { xp: 450, title: "けいさんはかせ", emoji: "🎓" },
  { xp: 700, title: "けいさんおうじゃ", emoji: "👑" },
  { xp: 1000, title: "けいさんのかみさま", emoji: "🌟" },
];

let level = "elementary";
let rankingLevel = "elementary";
let current = null;
let input = "";
let index = 0;
let correct = 0;
let streak = 0;
let misses = 0;       // このセットでまちがえた回数
let missThis = 0;     // いまの問題でまちがえた回数
let locked = false;
let countdownToken = 0;
let timerStart = 0;
let elapsedMs = 0;
let timerFrame = null;
let activeMode = "calc";

let hyakuninCards = [];
let karutaQuestionCount = 10;
let answeredIds = new Set();
let currentCard = null;
let currentChoices = [];
let currentQuestionIndex = 0;
let mistakeCount = 0;
let penaltySeconds = 0;
let revealedText = "";
let isReading = false;
let readingTimerIds = [];
let soundEnabled = true;
let karutaQuestionPool = [];
let karutaAnsweredLocked = false;
let karutaRemovedIds = new Set();
let karutaHintShown = false;
let karutaLoadPromise = null;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const nonZeroRand = (min, max) => {
  let value = 0;
  while (value === 0) value = rand(min, max);
  return value;
};
const signedPair = (min, max, allowZero = true) => {
  const pick = () => allowZero ? rand(min, max) : nonZeroRand(min, max);
  let a = 0, b = 0;
  while (a >= 0 && b >= 0) {
    a = pick();
    b = pick();
  }
  return [a, b];
};
const pad = (value, size = 2) => String(value).padStart(size, "0");
const rankingKey = (course = level) => `keisanWallTimes_${course}`;
const karutaRankingKey = (count = karutaQuestionCount) => `karuta_${count}_ranking`;
const digitRange = (digits) => digits === 1 ? [2, 9] : [10 ** (digits - 1), (10 ** digits) - 1];
const formatTerm = (value) => value < 0 ? `(${value})` : `${value}`;
const formatSigned = (value) => value < 0 ? `${value}` : `+${value}`;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));
const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/* ---------- Cookieユーティリティ ---------- */
function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=31536000; path=/; SameSite=Lax`;
}

/* ---------- 効果音（Web Audioで合成・ファイル不要） ---------- */
let audioCtx = null;
let soundOn = readCookie("keisanWallSound") !== "off";
soundEnabled = soundOn;

function ensureAudio() {
  if (!soundOn) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, delay = 0, duration = 0.14, type = "sine", volume = 0.18) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const playKeyTap = () => tone(720, 0, 0.05, "triangle", 0.05);
const playWrong = () => { tone(170, 0, 0.16, "square", 0.1); tone(140, 0.13, 0.2, "square", 0.1); };
const playTick = () => tone(880, 0, 0.08, "square", 0.08);
const playGo = () => { tone(1175, 0, 0.18, "square", 0.12); tone(1568, 0.06, 0.22, "square", 0.1); };
const playReadTick = () => {
  if (!soundEnabled) return;
  tone(880, 0, 0.04, "sine", 0.03);
};

function playCorrect(currentStreak) {
  // 連続正解で音程がどんどん上がる（最大8段）
  const step = Math.min(Math.max(currentStreak - 1, 0), 8);
  const base = 660 * (2 ** (step / 12));
  tone(base, 0, 0.1, "triangle", 0.16);
  tone(base * 1.5, 0.08, 0.14, "triangle", 0.16);
}

function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, "triangle", 0.16));
}

function playRecord() {
  playFanfare();
  [1175, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.09, 0.18, "sine", 0.14));
}

function renderSoundToggle() {
  soundToggle.textContent = soundOn ? "🔊" : "🔇";
  soundToggle.classList.toggle("off", !soundOn);
}

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundEnabled = soundOn;
  writeCookie("keisanWallSound", soundOn ? "on" : "off");
  renderSoundToggle();
  if (soundOn) playCorrect(1);
});

/* ---------- 紙吹雪 ---------- */
function launchConfetti(count = 90) {
  if (prefersReducedMotion) return;
  const colors = ["#ffd166", "#8067ff", "#28a66a", "#e05c4f", "#79c7ff", "#ff9ecb"];
  const wrap = document.createElement("div");
  wrap.className = "confetti";
  wrap.setAttribute("aria-hidden", "true");
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--d", `${2 + Math.random() * 1.6}s`);
    piece.style.setProperty("--w", `${1.2 + Math.random() * 1.4}s`);
    piece.style.setProperty("--r", `${Math.random() * 360}deg`);
    piece.style.setProperty("--c", colors[i % colors.length]);
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    wrap.appendChild(piece);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4500);
}

/* ---------- メダル ---------- */
function readMedals() {
  try {
    const data = JSON.parse(readCookie("keisanWallMedals") || "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function medalForTime(course, ms) {
  const times = medalTimes[course];
  if (ms <= times.gold) return "gold";
  if (ms <= times.silver) return "silver";
  return "bronze";
}

function saveMedal(course, medal, perfect) {
  const medals = readMedals();
  const prev = medals[course] || { m: "", p: 0 };
  const better = medalOrder.indexOf(medal) > medalOrder.indexOf(prev.m);
  medals[course] = {
    m: better ? medal : prev.m,
    p: prev.p || (perfect ? 1 : 0),
  };
  writeCookie("keisanWallMedals", JSON.stringify(medals));
  return { upgraded: better, ...medals[course] };
}

function renderTitleMedals() {
  const medals = readMedals();
  document.querySelectorAll("[data-medals]").forEach(el => {
    const record = medals[el.dataset.medals];
    el.textContent = record ? `${medalEmoji[record.m] || ""}${record.p ? "⭐" : ""}` : "";
  });
}

/* ---------- けいさんレベル（XP） ---------- */
function readXp() {
  const value = Number(readCookie("keisanWallXp"));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function addXp(amount) {
  const before = readXp();
  const after = before + amount;
  writeCookie("keisanWallXp", String(after));
  if (learningState) {
    learningState.profile.xp = after;
    saveLearningState();
  }
  return { before, after };
}

function rankInfo(xp) {
  let levelIndex = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (xp >= ranks[i].xp) levelIndex = i;
  }
  const rank = ranks[levelIndex];
  const next = ranks[levelIndex + 1] || null;
  const progress = next ? (xp - rank.xp) / (next.xp - rank.xp) : 1;
  return { levelIndex, rank, next, progress };
}

function renderXpCard() {
  const xp = readXp();
  const { levelIndex, rank, next, progress } = rankInfo(xp);
  const nextText = next ? `つぎまで あと${next.xp - xp}pt` : "さいこうレベル！";
  const progressValue = Math.round(progress * 100);
  xpCard.innerHTML = `
    <div class="xp-head">
      <span class="xp-emoji">${rank.emoji}</span>
      <span class="xp-title">Lv.${levelIndex + 1} ${rank.title}</span>
      <span class="xp-points">${xp}pt</span>
    </div>
    <div class="xp-bar" role="progressbar" aria-label="次のレベルまでの進み具合" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressValue}"><span style="width:${progressValue}%"></span></div>
    <div class="xp-next">${nextText}</div>`;
}

/* ---------- タイムランキング ---------- */
function readTimes(course = level) {
  const raw = readCookie(rankingKey(course));
  if (!raw) return [];
  try {
    const times = JSON.parse(raw);
    return Array.isArray(times) ? times.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function saveTime(ms) {
  const times = [...readTimes(level), Math.floor(ms)].sort((a, b) => a - b).slice(0, 10);
  writeCookie(rankingKey(level), JSON.stringify(times));
  return times;
}

function readKarutaRankings(count = karutaQuestionCount) {
  const raw = readCookie(karutaRankingKey(count));
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries
      .map(entry => {
        if (Number.isFinite(entry)) return { totalMs: entry, mistakes: 0 };
        return {
          totalMs: Number(entry.totalMs),
          mistakes: Number(entry.mistakes) || 0,
        };
      })
      .filter(entry => Number.isFinite(entry.totalMs));
  } catch {
    return [];
  }
}

function saveKarutaRanking(totalMs, mistakes, count = karutaQuestionCount) {
  const entries = [
    ...readKarutaRankings(count),
    { totalMs: Math.floor(totalMs), mistakes },
  ].sort((a, b) => a.totalMs - b.totalMs || a.mistakes - b.mistakes).slice(0, 10);
  writeCookie(karutaRankingKey(count), JSON.stringify(entries));
  return entries;
}

function karutaRankingMarkup(count, entries = readKarutaRankings(count)) {
  const title = `百人一首 ${count}枚 ベスト10`;
  if (!entries.length) return `<h3>${title}</h3><p>まだ記録がありません</p>`;
  return `<h3>${title}</h3><ol>${entries.map((entry, i) => (
    `<li><span>${i + 1}</span><b>${formatTime(entry.totalMs)}</b><small>ミス ${entry.mistakes}</small></li>`
  )).join("")}</ol>`;
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

function rankingMarkup(course, times = readTimes(course)) {
  const title = `${courses[course].label} ベスト10`;
  if (!times.length) return `<h3>${title}</h3><p>まだ記録がありません</p>`;
  return `<h3>${title}</h3><ol>${times.map((time, i) => `<li><span>${i + 1}</span><b>${formatTime(time)}</b></li>`).join("")}</ol>`;
}

function renderResultRanking(times = readTimes(level)) {
  rankingEl.innerHTML = rankingMarkup(level, times);
}

function renderTitleRanking() {
  const calcTabs = Object.entries(courses).map(([key, course]) => (
    `<button class="${key === rankingLevel ? "active" : ""}" data-ranking-level="${key}" type="button">${course.shortLabel}</button>`
  )).join("");
  const karutaTabs = [10, 100].map(count => {
    const key = `karuta_${count}`;
    return `<button class="${key === rankingLevel ? "active" : ""}" data-ranking-level="${key}" type="button">百${count}</button>`;
  }).join("");
  rankingTabs.innerHTML = calcTabs + karutaTabs;
  if (rankingLevel.startsWith("karuta_")) {
    titleRankingList.innerHTML = karutaRankingMarkup(Number(rankingLevel.replace("karuta_", "")));
    return;
  }
  titleRankingList.innerHTML = rankingMarkup(rankingLevel);
}

/* ---------- タイマー ---------- */
function stopTimer() {
  if (timerFrame) elapsedMs = performance.now() - timerStart;
  if (timerFrame) cancelAnimationFrame(timerFrame);
  timerFrame = null;
}

function updateTimer() {
  elapsedMs = performance.now() - timerStart;
  if (activeMode === "karuta") {
    karutaTimerEl.textContent = formatTime(elapsedMs + (penaltySeconds * 1000));
  } else {
    timerEl.textContent = formatTime(elapsedMs);
  }
  timerFrame = requestAnimationFrame(updateTimer);
}

function startTimer() {
  stopTimer();
  timerStart = performance.now();
  elapsedMs = 0;
  if (activeMode === "karuta") karutaTimerEl.textContent = formatTime(penaltySeconds * 1000);
  else timerEl.textContent = formatTime(0);
  timerFrame = requestAnimationFrame(updateTimer);
}

function resetTimer() {
  stopTimer();
  elapsedMs = 0;
  timerEl.textContent = formatTime(0);
  karutaTimerEl.textContent = formatTime(0);
  resultTime.textContent = "";
}

/* ---------- 問題生成 ---------- */
function makeQuestion() {
  const course = courses[level];
  if (course.type === "middle") return makeMiddleQuestion();
  if (course.type === "middleHard") return makeMiddleHardQuestion();
  if (course.type === "middleOni") return makeMiddleOniQuestion();

  const [leftMin, leftMax] = digitRange(course.leftDigits);
  const [rightMin, rightMax] = digitRange(course.rightDigits);
  const isMul = Math.random() < .5;

  if (isMul) {
    const a = rand(leftMin, leftMax);
    const b = rand(rightMin, rightMax);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  const divisor = rand(rightMin, rightMax);
  const answer = rand(leftMin, leftMax);
  return { text: `${divisor * answer} ÷ ${divisor}`, answer };
}

function makeMiddleQuestion() {
  const group = Math.random() < .5 ? "addsub" : "muldiv";

  if (group === "addsub") {
    const type = Math.random() < .5 ? "add" : "sub";
    const [a, b] = signedPair(-12, 12);
    if (type === "add") return { text: `${a}${formatSigned(b)}`, answer: a + b };
    return { text: `${a}-${formatTerm(b)}`, answer: a - b };
  }

  const type = Math.random() < .5 ? "mul" : "div";
  if (type === "mul") {
    const [a, b] = signedPair(-9, 9, false);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  const [divisor, answer] = signedPair(-9, 9, false);
  return { text: `${divisor * answer} ÷ ${divisor}`, answer };
}

function makeMiddleHardQuestion() {
  const a = nonZeroRand(-20, 20);
  const b = nonZeroRand(-20, 20);
  const c = nonZeroRand(-20, 20);
  const patterns = [
    { text: `${a}${formatSigned(b)} × ${formatTerm(c)}`, answer: a + (b * c) },
    { text: `${a}-${formatTerm(b)} × ${formatTerm(c)}`, answer: a - (b * c) },
    { text: `${formatTerm(a)} × ${formatTerm(b)}${formatSigned(c)}`, answer: (a * b) + c },
    { text: `${formatTerm(a)} × ${formatTerm(b)}-${formatTerm(c)}`, answer: (a * b) - c },
  ];
  return patterns[rand(0, patterns.length - 1)];
}

function makeMiddleOniQuestion() {
  const base = nonZeroRand(-5, 5);
  const exponent = rand(2, 3);
  const power = base ** exponent;
  const b = nonZeroRand(-12, 12);
  const c = nonZeroRand(-12, 12);
  const powerText = `${formatTerm(base)}^${exponent}`;
  const patterns = [
    { text: `${powerText}${formatSigned(b)} × ${formatTerm(c)}`, answer: power + (b * c) },
    { text: `${formatTerm(b)} × ${powerText}${formatSigned(c)}`, answer: (b * power) + c },
    { text: `${powerText}-${formatTerm(b)} × ${formatTerm(c)}`, answer: power - (b * c) },
  ];
  return patterns[rand(0, patterns.length - 1)];
}

/* ---------- 画面描画 ---------- */
function renderProgress() {
  progressDots.innerHTML = Array.from({ length: 10 }, (_, i) => (
    `<span class="${i < index ? "done" : i === index ? "current" : ""}"></span>`
  )).join("");
}

function renderQuestion() {
  locked = false;
  input = "";
  missThis = 0;
  current = makeQuestion();
  questionEl.textContent = current.text;
  answerEl.textContent = "?";
  answerEl.classList.remove("correct-mark");
  feedbackEl.textContent = "テンキーで答えてね";
  feedbackEl.className = "feedback";
  countEl.textContent = `${Math.min(index + 1, 10)}/10`;
  correctEl.textContent = correct;
  streakEl.textContent = streak;
  renderProgress();
  questionEl.classList.remove("pop");
  void questionEl.offsetWidth;
  questionEl.classList.add("pop");
}

function beginCountdown() {
  const token = ++countdownToken;
  locked = true;
  resetTimer();
  countdownEl.hidden = false;
  countdownEl.textContent = "3";
  feedbackEl.textContent = "スタートまで 3";
  feedbackEl.className = "feedback";
  playTick();

  [2, 1, "GO"].forEach((value, i) => {
    setTimeout(() => {
      if (token !== countdownToken) return;
      countdownEl.textContent = value;
      feedbackEl.textContent = value === "GO" ? "スタート！" : `スタートまで ${value}`;
      if (value === "GO") playGo();
      else playTick();
    }, (i + 1) * 650);
  });

  setTimeout(() => {
    if (token !== countdownToken) return;
    countdownEl.hidden = true;
    locked = false;
    feedbackEl.textContent = "テンキーで答えてね";
    startTimer();
  }, 2200);
}

function showTitle() {
  countdownToken++;
  clearReadingTimers();
  activeMode = "calc";
  countdownEl.hidden = true;
  resetTimer();
  current = null;
  currentCard = null;
  locked = true;
  input = "";
  resultEl.classList.remove("show");
  hideLearningPanels();
  const legacyCourses = document.getElementById("legacyCourses");
  if (legacyCourses) legacyCourses.hidden = true;
  appEl.classList.remove("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  appEl.classList.add("title-mode");
  titleScreen.hidden = false;
  karutaSelect.hidden = true;
  karutaMode.hidden = true;
  rankingScreen.hidden = true;
  gameEls.forEach(el => el.hidden = true);
  renderTitleMedals();
  renderXpCard();
  syncLearningHome();
}

function showRankingScreen() {
  countdownToken++;
  clearReadingTimers();
  activeMode = "calc";
  countdownEl.hidden = true;
  resetTimer();
  current = null;
  currentCard = null;
  locked = true;
  resultEl.classList.remove("show");
  hideLearningPanels();
  appEl.classList.remove("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  appEl.classList.add("title-mode");
  titleScreen.hidden = true;
  karutaSelect.hidden = true;
  karutaMode.hidden = true;
  rankingScreen.hidden = false;
  gameEls.forEach(el => el.hidden = true);
  renderTitleRanking();
}

function startLevel(nextLevel) {
  clearReadingTimers();
  activeMode = "calc";
  level = nextLevel;
  hideLearningPanels();
  ensureAudio();
  appEl.classList.remove("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  appEl.classList.remove("title-mode");
  titleScreen.hidden = true;
  karutaSelect.hidden = true;
  karutaMode.hidden = true;
  rankingScreen.hidden = true;
  gameEls.forEach(el => el.hidden = false);
  document.querySelector('[data-action="sign"]').disabled = !courses[level].type;
  resetSet();
}

function playCorrectEffect(currentStreak) {
  answerEl.classList.remove("correct-mark");
  void answerEl.offsetWidth;
  answerEl.classList.add("correct-mark");

  if (prefersReducedMotion) return;

  const burst = document.createElement("span");
  burst.className = "spark-burst";
  burst.setAttribute("aria-hidden", "true");

  // 連続正解で火花が増える（8〜16個）
  const sparkCount = 8 + Math.min(Math.max(currentStreak - 1, 0) * 2, 8);
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement("span");
    spark.style.setProperty("--angle", `${(360 / sparkCount) * i}deg`);
    if (currentStreak >= 5) spark.classList.add("hot");
    burst.appendChild(spark);
  }

  answerEl.appendChild(burst);
  setTimeout(() => burst.remove(), 420);
}

function comboMessage(currentStreak) {
  if (currentStreak >= 10) return "パーフェクト！🏆";
  if (currentStreak >= 7) return "てんさい！✨";
  if (currentStreak >= 5) return "すごい！🔥🔥";
  if (currentStreak >= 3) return `${currentStreak}れんぞく！🔥`;
  return "正解！⭕";
}

function submit() {
  if (locked || !current) return;
  const value = Number(input);
  if (input === "" || input === "-") return;

  if (value !== current.answer) {
    streak = 0;
    misses++;
    missThis++;
    input = "";
    answerEl.textContent = "?";
    // 3回まちがえたら答えを教えてあげる（つまずき救済）
    feedbackEl.textContent = missThis >= 3
      ? `こたえは ${current.answer} だよ`
      : "ちがう！もう一回";
    feedbackEl.className = "feedback bad";
    streakEl.textContent = streak;
    answerEl.classList.remove("shake");
    void answerEl.offsetWidth;
    answerEl.classList.add("shake");
    playWrong();
    return;
  }

  locked = true;
  correct++;
  streak++;
  answerEl.textContent = current.answer;
  feedbackEl.textContent = comboMessage(streak);
  feedbackEl.className = streak >= 3 ? "feedback good combo" : "feedback good";
  correctEl.textContent = correct;
  streakEl.textContent = streak;
  index++;
  renderProgress();
  playCorrectEffect(streak);
  playCorrect(streak);
  if (index >= 10) stopTimer();

  setTimeout(() => {
    if (index >= 10) finishSet();
    else renderQuestion();
  }, 430);
}

function finishSet() {
  stopTimer();
  const finalMs = elapsedMs;
  const bestTimes = saveTime(finalMs);
  const isNewRecord = bestTimes[0] === Math.floor(finalMs);
  const perfect = misses === 0;
  const medal = medalForTime(level, finalMs);
  const medalResult = saveMedal(level, medal, perfect);

  // けいさんポイント加算
  let gained = correct + courses[level].bonus;
  if (perfect) gained += 5;
  const { before, after } = addXp(gained);
  const learningReward = completeLearningSession({ mode: "calculation", total: 10, correct, perfect, xpAlreadyGranted: true, maxCombo: streak });
  const leveledUp = rankInfo(after).levelIndex > rankInfo(before).levelIndex;

  current = null;
  questionEl.textContent = "おしまい！";
  answerEl.textContent = `${correct}/10`;
  feedbackEl.textContent = "クリア！";
  feedbackEl.className = "feedback good";

  resultEl.classList.add("show");
  resultTitle.textContent = courses[level].label;
  resultTime.textContent = formatTime(finalMs);
  resultText.textContent = "10問クリア";

  const badges = [];
  if (isNewRecord) badges.push(`<span class="badge-chip record">🎉 しんきろく！</span>`);
  badges.push(`<span class="badge-chip">${medalEmoji[medal]} ${medalName[medal]}${medalResult.upgraded ? " GET!" : ""}</span>`);
  if (perfect) badges.push(`<span class="badge-chip">⭐ ノーミス！</span>`);
  badges.push(`<span class="badge-chip xp">+${gained}pt</span>`);
  if (learningReward?.mission.claimed) badges.push(`<span class="badge-chip record">🎯 ミッション達成 +${learningReward.mission.coins}🪙</span>`);
  if (leveledUp) {
    const newRank = rankInfo(after).rank;
    badges.push(`<span class="badge-chip levelup">${newRank.emoji} レベルアップ！ ${newRank.title}</span>`);
  }
  resultBadges.innerHTML = badges.join("");

  renderResultRanking(bestTimes);
  renderProgress();

  if (isNewRecord || leveledUp) {
    playRecord();
    launchConfetti(110);
  } else {
    playFanfare();
    if (medalResult.upgraded || perfect) launchConfetti(60);
  }
}

function resetSet() {
  countdownToken++;
  countdownEl.hidden = true;
  index = 0;
  correct = 0;
  streak = 0;
  misses = 0;
  missThis = 0;
  input = "";
  locked = true;
  resultEl.classList.remove("show");
  renderProgress();
  renderQuestion();
  beginCountdown();
}

/* ---------- 百人一首 ---------- */
function clearReadingTimers() {
  readingTimerIds.forEach(id => clearTimeout(id));
  readingTimerIds = [];
  isReading = false;
}

function fullKami(card) {
  return card.kamiLines.join("\n");
}

function fullShimo(card) {
  return card.shimoLines.join("\n");
}

function validateHyakuninCards(cards) {
  return cards.filter(card => (
    Number.isFinite(card.id) &&
    card.poet &&
    Array.isArray(card.kamiLines) &&
    Array.isArray(card.shimoLines) &&
    card.kamiLines.length &&
    card.shimoLines.length
  ));
}

function loadHyakuninCards() {
  if (hyakuninCards.length) return Promise.resolve(hyakuninCards);
  if (karutaLoadPromise) return karutaLoadPromise;
  karutaLoadPromise = fetch("assets/hyakunin_full_lines_with_poets.json", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("百人一首データを読み込めませんでした");
      return response.json();
    })
    .then(data => {
      hyakuninCards = validateHyakuninCards(Array.isArray(data) ? data : []);
      if (!hyakuninCards.length) throw new Error("百人一首データが空です");
      return hyakuninCards;
    });
  return karutaLoadPromise;
}

function showKarutaSelect() {
  clearReadingTimers();
  activeMode = "karuta";
  countdownToken++;
  countdownEl.hidden = true;
  resetTimer();
  resultEl.classList.remove("show");
  hideLearningPanels();
  appEl.classList.remove("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  appEl.classList.add("title-mode");
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  karutaMode.hidden = true;
  karutaSelect.hidden = false;
  gameEls.forEach(el => el.hidden = true);
}

function showKarutaError(message) {
  karutaReaderEl.textContent = message;
  karutaReaderEl.className = "karuta-reader bad";
  karutaChoicesEl.innerHTML = "";
}

function startKaruta(count) {
  activeMode = "karuta";
  soundEnabled = soundOn;
  ensureAudio();
  hideLearningPanels();
  appEl.classList.add("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  karutaQuestionCount = count;
  loadHyakuninCards()
    .then(() => {
      appEl.classList.remove("title-mode");
      titleScreen.hidden = true;
      rankingScreen.hidden = true;
      karutaSelect.hidden = true;
      gameEls.forEach(el => el.hidden = true);
      karutaMode.hidden = false;
      resetKarutaSet();
    })
    .catch(error => {
      appEl.classList.remove("title-mode");
      titleScreen.hidden = true;
      rankingScreen.hidden = true;
      karutaSelect.hidden = true;
      gameEls.forEach(el => el.hidden = true);
      karutaMode.hidden = false;
      showKarutaError(error.message || "百人一首データを読み込めませんでした");
    });
}

function resetKarutaSet() {
  clearReadingTimers();
  stopTimer();
  answeredIds = new Set();
  currentCard = null;
  currentChoices = [];
  currentQuestionIndex = 0;
  mistakeCount = 0;
  penaltySeconds = 0;
  revealedText = "";
  karutaQuestionPool = shuffle(hyakuninCards).slice(0, karutaQuestionCount);
  karutaAnsweredLocked = false;
  karutaRemovedIds = new Set();
  karutaHintShown = false;
  resultEl.classList.remove("show");
  appEl.classList.add("karuta-play-mode");
  appEl.classList.remove("karuta-result-mode");
  karutaMode.hidden = false;
  karutaFullPoemEl.hidden = true;
  karutaFullPoemEl.innerHTML = "";
  karutaShimoAreaEl.classList.remove("is-answering");
  karutaPenaltyEl.hidden = true;
  karutaTimerEl.textContent = formatTime(0);
  renderKarutaStats();
  startTimer();
  nextKarutaQuestion();
}

function renderKarutaStats() {
  karutaCountEl.textContent = `${Math.min(currentQuestionIndex + 1, karutaQuestionCount)}/${karutaQuestionCount}`;
  karutaCorrectEl.textContent = answeredIds.size;
  karutaMistakesEl.textContent = mistakeCount;
}

function makeKarutaChoices() {
  const available = hyakuninCards.filter(card => !answeredIds.has(card.id));
  const wrongChoices = shuffle(available.filter(card => card.id !== currentCard.id)).slice(0, 3);
  currentChoices = shuffle([currentCard, ...wrongChoices]);
  karutaRemovedIds = new Set();
}

function renderKarutaChoices(correctId = null, wrongId = null) {
  karutaChoicesEl.innerHTML = currentChoices
    .map(card => {
      const classes = ["karuta-choice", "karuta-card"];
      if (correctId === card.id) classes.push("karuta-correct");
      if (wrongId === card.id) classes.push("karuta-wrong");
      if (karutaRemovedIds.has(card.id)) classes.push("karuta-removed");
      if (
        currentCard &&
        card.id === currentCard.id &&
        currentCard.kimariji &&
        revealedText.replace(/\n/g, "").length >= currentCard.kimariji.length &&
        !karutaHintShown
      ) {
        classes.push("karuta-correct-hint");
        karutaHintShown = true;
      }
      return `
        <button class="${classes.join(" ")}" data-card-id="${card.id}" type="button">
          <span class="karuta-card-lines">${karutaLineMarkup(card.shimoLines, 2)}</span>
        </button>`;
    }).join("");
}

function karutaLineMarkup(lines, count) {
  const fixedLines = Array.from({ length: count }, (_, index) => lines[index] || "");
  return fixedLines.map(line => `<span>${escapeHtml(line) || "&nbsp;"}</span>`).join("");
}

function renderKarutaReader(showPoet = false) {
  karutaReaderEl.className = "karuta-reader";
  const lines = (revealedText || "").split("\n");
  karutaReaderEl.innerHTML = `
    <div class="karuta-poem-card karuta-kami-card">
      <div class="karuta-card-lines karuta-kami-lines">
        ${karutaLineMarkup(lines, 3)}
      </div>
      ${showPoet && currentCard ? `<div class="karuta-poet">${escapeHtml(currentCard.poet)}</div>` : ""}
    </div>`;
}

function revealKarutaFullPoem() {
  if (!currentCard) return;
  revealedText = fullKami(currentCard);
  renderKarutaReader(true);
  karutaFullPoemEl.hidden = false;
  karutaFullPoemEl.innerHTML = `
    <div class="karuta-poem-card karuta-shimo-card karuta-correct">
      <div class="karuta-card-lines">
        ${karutaLineMarkup(currentCard.shimoLines, 2)}
      </div>
    </div>`;
}

function scheduleReadingStep(lineIndex, charIndex) {
  const line = currentCard.kamiLines[lineIndex];
  if (!line) {
    isReading = false;
    return;
  }

  if (charIndex < line.length) {
    const delay = revealedText ? 120 : 0;
    const timerId = setTimeout(() => {
      if (!isReading || !currentCard) return;
      revealedText += line[charIndex];
      renderKarutaReader();
      playReadTick();
      renderKarutaChoices();
      scheduleReadingStep(lineIndex, charIndex + 1);
    }, delay);
    readingTimerIds.push(timerId);
    return;
  }

  const nextLineIndex = lineIndex + 1;
  if (nextLineIndex >= currentCard.kamiLines.length) {
    isReading = false;
    return;
  }

  const timerId = setTimeout(() => {
    if (!isReading || !currentCard) return;
    revealedText += "\n";
    renderKarutaReader();
    scheduleReadingStep(nextLineIndex, 0);
  }, 500);
  readingTimerIds.push(timerId);
}

function startKarutaReading() {
  clearReadingTimers();
  revealedText = "";
  isReading = true;
  karutaHintShown = false;
  renderKarutaReader();
  scheduleReadingStep(0, 0);
}

function nextKarutaQuestion() {
  clearReadingTimers();
  if (currentQuestionIndex >= karutaQuestionCount) {
    finishKarutaSet();
    return;
  }

  currentCard = karutaQuestionPool.find(card => !answeredIds.has(card.id));
  if (!currentCard) {
    finishKarutaSet();
    return;
  }

  karutaAnsweredLocked = false;
  karutaShimoAreaEl.classList.remove("is-answering");
  karutaFullPoemEl.hidden = true;
  karutaFullPoemEl.innerHTML = "";
  karutaReaderEl.className = "karuta-reader";
  makeKarutaChoices();
  renderKarutaStats();
  renderKarutaChoices();
  startKarutaReading();
}

function showKarutaPenalty() {
  karutaPenaltyEl.hidden = false;
  karutaPenaltyEl.classList.remove("show");
  void karutaPenaltyEl.offsetWidth;
  karutaPenaltyEl.classList.add("show");
  setTimeout(() => {
    karutaPenaltyEl.hidden = true;
    karutaPenaltyEl.classList.remove("show");
  }, 720);
}

function chooseKaruta(cardId) {
  if (karutaAnsweredLocked || !currentCard) return;
  const pickedId = Number(cardId);
  if (pickedId !== currentCard.id) {
    mistakeCount++;
    penaltySeconds += 10;
    karutaRemovedIds.add(pickedId);
    renderKarutaStats();
    karutaTimerEl.textContent = formatTime(elapsedMs + (penaltySeconds * 1000));
    renderKarutaChoices(null, pickedId);
    showKarutaPenalty();
    playWrong();
    return;
  }

  karutaAnsweredLocked = true;
  answeredIds.add(currentCard.id);
  clearReadingTimers();
  revealKarutaFullPoem();
  renderKarutaStats();
  karutaShimoAreaEl.classList.add("is-answering");
  currentChoices.forEach(card => {
    karutaRemovedIds.add(card.id);
  });
  renderKarutaChoices();
  playCorrect(1);
  currentQuestionIndex++;

  const wait = 900;
  const timerId = setTimeout(() => nextKarutaQuestion(), wait);
  readingTimerIds.push(timerId);
}

function finishKarutaSet() {
  clearReadingTimers();
  stopTimer();
  const realMs = elapsedMs;
  const penaltyMs = penaltySeconds * 1000;
  const totalMs = realMs + penaltyMs;
  const bestEntries = saveKarutaRanking(totalMs, mistakeCount, karutaQuestionCount);
  const isNewRecord = bestEntries[0] && bestEntries[0].totalMs === Math.floor(totalMs);
  const perfect = mistakeCount === 0;
  const reward = completeLearningSession({
    mode: "karuta",
    total: karutaQuestionCount,
    correct: answeredIds.size,
    perfect,
  });

  currentCard = null;
  karutaReaderEl.textContent = "おしまい！";
  karutaFullPoemEl.hidden = true;
  karutaShimoAreaEl.classList.remove("is-answering");
  karutaChoicesEl.innerHTML = "";

  karutaMode.hidden = true;
  appEl.classList.remove("karuta-play-mode");
  appEl.classList.add("karuta-result-mode");
  resultEl.classList.add("show");
  resultTitle.textContent = `百人一首 ${karutaQuestionCount}枚モード`;
  resultTime.textContent = formatTime(totalMs);
  resultText.innerHTML = [
    `実時間 ${formatTime(realMs)}`,
    `ペナルティ ${penaltySeconds}秒`,
    `合計タイム ${formatTime(totalMs)}`,
    `ミス ${mistakeCount}回`,
    `正解 ${answeredIds.size}/${karutaQuestionCount}`,
  ].join("<br>");
  resultBadges.innerHTML = [
    isNewRecord ? `<span class="badge-chip record">しんきろく！</span>` : "",
    reward ? `<span class="badge-chip xp">+${reward.xp}pt</span>` : "",
  ].join("");
  rankingEl.innerHTML = karutaRankingMarkup(karutaQuestionCount, bestEntries);

  if (isNewRecord) {
    playRecord();
    launchConfetti(90);
  } else {
    playFanfare();
  }
}

/* ---------- 入力イベント ---------- */
document.querySelector(".keypad").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const key = btn.dataset.key;
  const action = btn.dataset.action;

  if (action === "enter") return submit();
  if (locked) return;
  if (action === "clear") {
    input = input.slice(0, -1);
  } else if (action === "sign") {
    if (courses[level].type) input = input.startsWith("-") ? input.slice(1) : `-${input}`;
  } else if (key && input.length < 6) {
    input += key;
    playKeyTap();
  }
  answerEl.textContent = input || "?";
});

document.getElementById("clearInput").addEventListener("click", () => {
  if (locked) return;
  input = input.slice(0, -1);
  answerEl.textContent = input || "?";
});

document.getElementById("newSet").addEventListener("click", resetSet);
document.getElementById("levelSelect").addEventListener("click", showTitle);
document.getElementById("retryBtn").addEventListener("click", () => {
  if (activeMode === "karuta") resetKarutaSet();
  else if (activeMode === "study") restartStudySession();
  else resetSet();
});
document.getElementById("homeBtn").addEventListener("click", showTitle);

document.getElementById("showRankings")?.addEventListener("click", showRankingScreen);
document.getElementById("rankingHome").addEventListener("click", showTitle);
document.querySelector("[data-karuta-menu]").addEventListener("click", showKarutaSelect);
document.getElementById("karutaSelectHome").addEventListener("click", showTitle);
document.getElementById("karutaRestart").addEventListener("click", resetKarutaSet);
document.getElementById("karutaBackToSelect").addEventListener("click", showKarutaSelect);
document.getElementById("karutaHome").addEventListener("click", showTitle);

document.querySelectorAll("[data-karuta-count]").forEach(btn => {
  btn.addEventListener("click", () => startKaruta(Number(btn.dataset.karutaCount)));
});

karutaChoicesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-card-id]");
  if (!btn) return;
  ensureAudio();
  chooseKaruta(btn.dataset.cardId);
});

rankingTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ranking-level]");
  if (!btn) return;
  rankingLevel = btn.dataset.rankingLevel;
  renderTitleRanking();
});

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.addEventListener("click", () => startLevel(btn.dataset.level));
});

document.querySelectorAll(".character-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.remove("is-reacting");
    void btn.offsetWidth;
    btn.classList.add("is-reacting");
    playKeyTap();
  });
  btn.addEventListener("animationend", (e) => {
    if (e.animationName === "character-react") btn.classList.remove("is-reacting");
  });
});

window.addEventListener("keydown", (e) => {
  if (/^[0-9]$/.test(e.key) && !locked && input.length < 6) {
    input += e.key;
    playKeyTap();
    answerEl.textContent = input;
  }
  if (e.key === "-" && !locked && courses[level].type) {
    input = input.startsWith("-") ? input.slice(1) : `-${input}`;
    answerEl.textContent = input || "?";
  }
  if (e.key === "Backspace" && !locked) {
    input = input.slice(0, -1);
    answerEl.textContent = input || "?";
  }
  if (e.key === "Enter") submit();
});

renderSoundToggle();
renderTitleRanking();
showTitle();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(() => {});
  });
}

/* ---------- まなびの冒険: 共通プロフィールと学習モード ---------- */
var learningState = null;
var learningHubReady = false;
var studySession = null;
var studyTimerFrame = null;

const LEARNING_STORE_KEY = "manabiAdventureV2";
const gradeMeta = {
  g4: { label: "小学4年生", short: "小4" },
  g5: { label: "小学5年生", short: "小5" },
  g6: { label: "小学6年生", short: "小6" },
  j1: { label: "中学1年生", short: "中1" },
};
const missionCatalog = [
  { id: "play", label: "どれか1セットをクリアしよう", goal: 1 },
  { id: "english", label: "英語を10問練習しよう", goal: 10 },
  { id: "hundred", label: "100マスを10マス進めよう", goal: 10 },
  { id: "perfect", label: "10問連続正解に挑戦しよう", goal: 10 },
];

const gradeScreenEl = document.getElementById("gradeScreen");
const mathSelectEl = document.getElementById("mathSelect");
const hundredSelectEl = document.getElementById("hundredSelect");
const englishSelectEl = document.getElementById("englishSelect");
const studyModeEl = document.getElementById("studyMode");
const recordsScreenEl = document.getElementById("recordsScreen");
const homeStatusEl = document.getElementById("homeStatus");
const missionCardEl = document.getElementById("missionCard");
const legacyCoursesEl = document.getElementById("legacyCourses");
const studyTimerEl = document.getElementById("studyTimer");
const studyCountEl = document.getElementById("studyCount");
const studyCorrectEl = document.getElementById("studyCorrect");
const studyComboEl = document.getElementById("studyCombo");
const studyProgressEl = document.getElementById("studyProgress");
const studyGridWrapEl = document.getElementById("studyGridWrap");
const studyGridEl = document.getElementById("studyGrid");
const studyKickerEl = document.getElementById("studyKicker");
const studyQuestionEl = document.getElementById("studyQuestion");
const studyExampleEl = document.getElementById("studyExample");
const studyFeedbackEl = document.getElementById("studyFeedback");
const studyChoicesEl = document.getElementById("studyChoices");
const studyKeypadEl = document.getElementById("studyKeypad");

function emptyLearningState() {
  return {
    version: 2,
    profile: { grade: "", xp: 0, coins: 0, unlockedReactions: [] },
    activity: { lastPlayedDate: "", streakDays: 0, playedDates: [] },
    mission: { date: "", id: "", progress: 0, claimed: false },
    mastery: {},
    bestScores: {},
    inProgress: null,
  };
}

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function loadLearningState() {
  const fallback = emptyLearningState();
  try {
    const saved = JSON.parse(localStorage.getItem(LEARNING_STORE_KEY) || "null");
    if (saved && saved.version === 2 && saved.profile && saved.activity) return { ...fallback, ...saved };
  } catch {}
  const oldXp = Number(readCookie("keisanWallXp"));
  fallback.profile.xp = Number.isFinite(oldXp) ? Math.max(0, oldXp) : 0;
  return fallback;
}

function saveLearningState() {
  if (!learningState) return;
  try {
    localStorage.setItem(LEARNING_STORE_KEY, JSON.stringify(learningState));
  } catch {}
}

function missionForDate(date = todayKey()) {
  const seed = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return missionCatalog[seed % missionCatalog.length];
}

function ensureMission() {
  if (!learningState) return null;
  const today = todayKey();
  if (learningState.mission.date !== today) {
    const mission = missionForDate(today);
    learningState.mission = { date: today, id: mission.id, progress: 0, claimed: false };
    saveLearningState();
  }
  return missionCatalog.find(mission => mission.id === learningState.mission.id) || missionCatalog[0];
}

function dayDistance(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86400000);
}

function registerLearningDay() {
  if (!learningState) return;
  const today = todayKey();
  const activity = learningState.activity;
  if (activity.lastPlayedDate === today) return;
  if (!activity.lastPlayedDate || dayDistance(activity.lastPlayedDate, today) !== 1) activity.streakDays = 1;
  else activity.streakDays += 1;
  activity.lastPlayedDate = today;
  activity.playedDates = [...new Set([...activity.playedDates, today])].slice(-60);
}

function progressMission(summary) {
  const mission = ensureMission();
  if (!mission || learningState.mission.claimed) return { claimed: false, coins: 0 };
  let amount = 0;
  if (mission.id === "play") amount = 1;
  if (mission.id === "english" && summary.mode === "english") amount = summary.total;
  if (mission.id === "hundred" && summary.mode === "hundred") amount = summary.total;
  if (mission.id === "perfect") amount = summary.maxCombo || 0;
  learningState.mission.progress = Math.min(mission.goal, learningState.mission.progress + amount);
  if (learningState.mission.progress >= mission.goal) {
    learningState.mission.claimed = true;
    learningState.profile.coins += 20;
    return { claimed: true, coins: 20 };
  }
  return { claimed: false, coins: 0 };
}

function completeLearningSession(summary) {
  if (!learningState) return null;
  registerLearningDay();
  const bonus = summary.perfect ? 5 : 0;
  const xp = summary.xpAlreadyGranted ? 0 : summary.correct + 5 + bonus;
  if (xp) {
    learningState.profile.xp += xp;
    writeCookie("keisanWallXp", String(learningState.profile.xp));
  }
  const mission = progressMission(summary);
  saveLearningState();
  return { xp, mission };
}

function hideLearningPanels() {
  ["gradeScreen", "mathSelect", "hundredSelect", "englishSelect", "studyMode", "recordsScreen"]
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .forEach(el => { el.hidden = true; });
  stopStudyTimer();
}

function syncLearningHome() {
  if (!learningHubReady || !learningState || !homeStatusEl) return;
  const grade = gradeMeta[learningState.profile.grade] || gradeMeta.g4;
  const mission = ensureMission();
  homeStatusEl.innerHTML = `
    <span><b>${grade.short}</b><small>いまの学年</small></span>
    <span><b>${learningState.activity.streakDays}日</b><small>れんぞく学習</small></span>
    <span><b>🪙 ${learningState.profile.coins}</b><small>コイン</small></span>`;
  const progress = Math.min(mission.goal, learningState.mission.progress);
  missionCardEl.innerHTML = `
    <span class="mission-icon">🎯</span>
    <span class="mission-copy"><b>今日のミッション</b><small>${mission.label}</small></span>
    <span class="mission-progress">${learningState.mission.claimed ? "達成！ +20🪙" : `${progress}/${mission.goal}`}</span>`;
  missionCardEl.classList.toggle("complete", learningState.mission.claimed);
  document.getElementById("mathSelectGrade").textContent = grade.label;
  document.getElementById("englishSelectGrade").textContent = grade.label;
  renderMathCourses();
  renderHundredCourses();
  renderEnglishCourses();
  renderXpCard();
}

function showGradeScreen() {
  hideLearningPanels();
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  resultEl.classList.remove("show");
  appEl.classList.add("title-mode");
  gradeScreenEl.hidden = false;
}

function showSubjectPanel(panel) {
  hideLearningPanels();
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  resultEl.classList.remove("show");
  appEl.classList.add("title-mode");
  panel.hidden = false;
  legacyCoursesEl.hidden = true;
}

function randomItem(items) {
  return items[rand(0, items.length - 1)];
}

function uniqueShuffle(items) {
  return shuffle([...new Set(items.map(String))]);
}

const mathCourseCatalog = {
  g4: [
    { id: "g4-big", title: "大きな数", detail: "たし算・ひき算", icon: "🔢" },
    { id: "g4-decimal", title: "小数", detail: "0.1の計算", icon: "🔸" },
    { id: "g4-fraction", title: "分数", detail: "同じ分母の計算", icon: "🍰" },
  ],
  g5: [
    { id: "g5-decimal", title: "小数の計算", detail: "かけ算・わり算", icon: "🔸" },
    { id: "g5-fraction", title: "分数の計算", detail: "たし算・ひき算", icon: "🍰" },
    { id: "g5-rate", title: "割合", detail: "何％かな？", icon: "📊" },
  ],
  g6: [
    { id: "g6-fraction", title: "分数の計算", detail: "かけ算・わり算", icon: "🍰" },
    { id: "g6-ratio", title: "比・比例", detail: "数の関係を見つける", icon: "⚖️" },
    { id: "g6-letter", title: "文字と式", detail: "xを使って考える", icon: "✏️" },
  ],
  j1: [
    { id: "j1-integers", title: "正負の数", detail: "プラス・マイナス", icon: "±" },
    { id: "j1-expression", title: "文字式", detail: "式をシンプルに", icon: "✏️" },
    { id: "j1-equation", title: "一次方程式", detail: "xを見つけよう", icon: "🧩" },
  ],
};

function renderMathCourses() {
  const list = document.getElementById("mathCourseList");
  if (!list || !learningState) return;
  list.innerHTML = mathCourseCatalog[learningState.profile.grade].map(course => `
    <button class="course-choice" data-math-course="${course.id}" type="button">
      <span>${course.icon}</span><b>${course.title}</b><small>${course.detail}</small>
    </button>`).join("");
}

function renderHundredCourses() {
  const list = document.getElementById("hundredCourseList");
  if (!list || !learningState) return;
  const operations = [
    ["add", "たし算", "+"], ["sub", "ひき算", "−"], ["mul", "かけ算", "×"],
  ];
  const sizes = [10, 50, 100];
  const resume = learningState.inProgress?.kind === "hundred"
    ? `<button class="course-choice resume" data-resume-hundred type="button"><span>▶</span><b>つづきから</b><small>${learningState.inProgress.index}/${learningState.inProgress.questions.length}マス</small></button>`
    : "";
  list.innerHTML = resume + sizes.flatMap(size => operations.map(([op, label, symbol]) => `
    <button class="course-choice" data-hundred-size="${size}" data-hundred-op="${op}" type="button">
      <span>${symbol}</span><b>${size}マス ${label}</b><small>正確さチャレンジ</small>
    </button>`)).join("");
}

function renderEnglishCourses() {
  const list = document.getElementById("englishCourseList");
  if (!list) return;
  list.innerHTML = `
    <button class="course-choice" data-english-direction="en-ja" type="button"><span>EN</span><b>英語 → 日本語</b><small>意味をえらぼう</small></button>
    <button class="course-choice" data-english-direction="ja-en" type="button"><span>JP</span><b>日本語 → 英語</b><small>英語をえらぼう</small></button>`;
}

function numericChoices(answer, step = 1) {
  const format = value => Number.isInteger(value) ? String(value) : value.toFixed(1);
  const correct = format(answer);
  const wrong = uniqueShuffle([answer + step, answer - step, answer + (step * 2), answer - (step * 2)].map(format))
    .filter(value => value !== correct)
    .slice(0, 3);
  return shuffle([correct, ...wrong]);
}

function answerChoices(answer, candidates) {
  const correct = String(answer);
  const wrong = uniqueShuffle(candidates)
    .filter(value => value !== correct)
    .slice(0, 3);
  return shuffle([correct, ...wrong]);
}

function fractionText(n, d) {
  return `${n}/${d}`;
}

function makeMathQuestion(courseId) {
  let a; let b; let d; let answer; let text; let hint; let explanation;
  if (courseId === "g4-big") {
    a = rand(120, 980); b = rand(30, 390); const add = Math.random() < .5;
    if (!add && b > a) [a, b] = [b, a];
    answer = add ? a + b : a - b; text = `${a} ${add ? "+" : "−"} ${b}`;
    hint = "百のくらい、十のくらい、一のくらいに分けて考えよう。";
  } else if (courseId === "g4-decimal") {
    a = rand(8, 79) / 10; b = rand(1, 29) / 10; const add = Math.random() < .5;
    if (!add && b > a) [a, b] = [b, a];
    answer = Number((add ? a + b : a - b).toFixed(1)); text = `${a.toFixed(1)} ${add ? "+" : "−"} ${b.toFixed(1)}`;
    hint = "小数点をそろえて計算しよう。";
  } else if (courseId === "g4-fraction" || courseId === "g5-fraction") {
    d = randomItem(courseId === "g4-fraction" ? [4, 5, 6, 8] : [3, 4, 5, 6]);
    a = rand(1, d - 2); b = rand(1, d - a - 1); answer = fractionText(a + b, d);
    text = `${fractionText(a, d)} + ${fractionText(b, d)}`; hint = "分母が同じなら、分子だけをたそう。";
    return { text, answer, choices: answerChoices(answer, [fractionText(a + b, d + 1), fractionText(a * b, d), fractionText(a + b - 1, d), fractionText(a + b + 1, d), fractionText(a, d)]), hint, explanation: `${fractionText(a, d)} と ${fractionText(b, d)} は分母が同じなので、${fractionText(a + b, d)} です。` };
  } else if (courseId === "g5-decimal") {
    a = rand(12, 89) / 10; b = rand(2, 9); answer = Number((a * b).toFixed(1)); text = `${a.toFixed(1)} × ${b}`;
    hint = "まず小数点を考えずに計算してから、小数点の位置を決めよう。";
  } else if (courseId === "g5-rate") {
    a = randomItem([10, 20, 25, 50]); b = randomItem([20, 40, 60, 80, 100]); answer = (a / 100) * b; text = `${b}の${a}%`;
    hint = "10%は10こに分けた1こ分。そこから考えよう。";
  } else if (courseId === "g6-fraction") {
    const d1 = randomItem([2, 3, 4, 5]); const d2 = randomItem([2, 3, 4, 5]);
    a = rand(1, d1 - 1); b = rand(1, d2 - 1); const n = a * b; d = d1 * d2; const gcd = (x, y) => y ? gcd(y, x % y) : x;
    const div = gcd(n, d); answer = fractionText(n / div, d / div); text = `${fractionText(a, d1)} × ${fractionText(b, d2)}`;
    hint = "分子どうし、分母どうしをそれぞれかけよう。";
    return { text, answer, choices: answerChoices(answer, [fractionText(a + b, d1 + d2), fractionText(a * b, d1 + d2), fractionText(a + b, d1 * d2), fractionText((a * b) + 1, d1 * d2), fractionText(a * b, (d1 * d2) + 1), fractionText(a, d1), fractionText(b, d2)]), hint, explanation: `分子は ${a}×${b}、分母は ${d1}×${d2} と計算します。` };
  } else if (courseId === "g6-ratio") {
    a = rand(2, 8); b = rand(2, 8); const multiple = rand(2, 6); answer = b * multiple; text = `${a} : ${b} = ${a * multiple} : □`;
    hint = `左の${a}は${multiple}倍になっています。`;
  } else if (courseId === "g6-letter" || courseId === "j1-equation") {
    a = rand(3, 16); b = rand(3, 16); answer = a; text = `x ${courseId === "j1-equation" ? "−" : "+"} ${b} = ${courseId === "j1-equation" ? a - b : a + b}`;
    hint = "xだけが左に残るように、反対の計算をしよう。";
  } else if (courseId === "j1-integers") {
    a = rand(-12, 12); b = rand(-12, 12); answer = a + b; text = `${a} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
    hint = "符号がちがうときは、絶対値の大きい方から小さい方をひこう。";
  } else if (courseId === "j1-expression") {
    a = rand(2, 8); b = rand(2, 8); answer = `${a + b}x`; text = `${a}x + ${b}x`;
    hint = "同じxの項どうしは、数字の部分をたせるよ。";
    return { text, answer, choices: answerChoices(answer, [`${a * b}x`, `${a + b}`, `${Math.abs(a - b)}x`, `${a + b + 1}x`, `${Math.max(1, a + b - 1)}x`]), hint, explanation: `${a}x と ${b}x は同じ文字の項なので、${a + b}x です。` };
  }
  explanation = `${text} = ${answer}`;
  return { text, answer: String(answer), choices: numericChoices(Number(answer), Number.isInteger(answer) ? 1 : .1), hint, explanation };
}

const englishContent = {
  g4: [
    ["red", "赤", "色"], ["blue", "青", "色"], ["yellow", "黄", "色"], ["Monday", "月曜日", "曜日"], ["Friday", "金曜日", "曜日"], ["sunny", "晴れ", "天気"], ["rainy", "雨", "天気"], ["dog", "犬", "どうぶつ"], ["cat", "ねこ", "どうぶつ"], ["apple", "りんご", "食べ物"], ["water", "水", "飲み物"], ["hello", "こんにちは", "あいさつ"], ["thank you", "ありがとう", "あいさつ"], ["one", "1", "数"], ["ten", "10", "数"], ["green", "緑", "色"], ["white", "白", "色"], ["black", "黒", "色"], ["Tuesday", "火曜日", "曜日"], ["Sunday", "日曜日", "曜日"], ["cloudy", "くもり", "天気"], ["snow", "雪", "天気"], ["bird", "鳥", "どうぶつ"], ["fish", "魚", "どうぶつ"], ["orange", "オレンジ", "食べ物"], ["milk", "牛乳", "飲み物"], ["goodbye", "さようなら", "あいさつ"], ["please", "お願いします", "あいさつ"], ["five", "5", "数"], ["twenty", "20", "数"],
  ],
  g5: [
    ["January", "1月", "月"], ["August", "8月", "月"], ["music", "音楽", "教科"], ["science", "理科", "教科"], ["breakfast", "朝ごはん", "食事"], ["lunch", "昼ごはん", "食事"], ["soccer", "サッカー", "スポーツ"], ["swim", "泳ぐ", "動作"], ["can", "〜できる", "表現"], ["like", "好き", "動作"], ["clock", "時計", "物"], ["library", "図書館", "場所"], ["today", "今日", "時間"], ["tomorrow", "明日", "時間"], ["beautiful", "美しい", "形容詞"], ["April", "4月", "月"], ["December", "12月", "月"], ["math", "算数", "教科"], ["P.E.", "体育", "教科"], ["dinner", "夕食", "食事"], ["bread", "パン", "食事"], ["baseball", "野球", "スポーツ"], ["run", "走る", "動作"], ["read", "読む", "動作"], ["write", "書く", "動作"], ["chair", "いす", "物"], ["classroom", "教室", "場所"], ["morning", "朝", "時間"], ["evening", "夕方", "時間"], ["difficult", "むずかしい", "形容詞"],
  ],
  g6: [
    ["visited", "訪れた", "動作"], ["went", "行った", "動作"], ["want", "ほしい", "動作"], ["country", "国", "場所"], ["Australia", "オーストラリア", "国"], ["doctor", "医者", "仕事"], ["teacher", "先生", "仕事"], ["weekend", "週末", "時間"], ["yesterday", "昨日", "時間"], ["next", "次の", "形容詞"], ["enjoy", "楽しむ", "動作"], ["favorite", "お気に入りの", "形容詞"], ["because", "なぜなら", "つなぎ言葉"], ["together", "いっしょに", "副詞"], ["future", "未来", "時間"], ["saw", "見た", "動作"], ["ate", "食べた", "動作"], ["will", "〜するつもり", "表現"], ["America", "アメリカ", "国"], ["Japan", "日本", "国"], ["nurse", "看護師", "仕事"], ["singer", "歌手", "仕事"], ["last", "この前の", "時間"], ["soon", "まもなく", "時間"], ["first", "最初の", "形容詞"], ["learn", "学ぶ", "動作"], ["practice", "練習する", "動作"], ["so", "だから", "つなぎ言葉"], ["always", "いつも", "副詞"], ["dream", "夢", "名詞"],
  ],
  j1: [
    ["am", "〜です", "be動詞"], ["are", "〜です", "be動詞"], ["is", "〜です", "be動詞"], ["do", "する", "一般動詞"], ["does", "しますか", "一般動詞"], ["not", "〜ではない", "否定"], ["what", "何", "疑問詞"], ["where", "どこ", "疑問詞"], ["when", "いつ", "疑問詞"], ["he", "彼", "代名詞"], ["she", "彼女", "代名詞"], ["they", "彼ら・彼女ら", "代名詞"], ["study", "勉強する", "一般動詞"], ["play", "遊ぶ・する", "一般動詞"], ["live", "住んでいる", "一般動詞"], ["was", "〜だった", "be動詞"], ["were", "〜だった", "be動詞"], ["have", "持っている", "一般動詞"], ["has", "持っている（彼・彼女）", "一般動詞"], ["can", "〜できる", "助動詞"], ["who", "だれ", "疑問詞"], ["why", "なぜ", "疑問詞"], ["how", "どのように", "疑問詞"], ["we", "私たち", "代名詞"], ["you", "あなた・あなたたち", "代名詞"], ["my", "私の", "代名詞"], ["your", "あなたの", "代名詞"], ["speak", "話す", "一般動詞"], ["watch", "見る", "一般動詞"], ["know", "知っている", "一般動詞"],
  ],
};

function englishItemsForGrade(grade) {
  return englishContent[grade].map(([en, jp, tag], index) => ({ id: `en-${grade}-${index}`, en, jp, tag }));
}

function makeEnglishQuestion(item, direction, allItems) {
  const answer = direction === "en-ja" ? item.jp : item.en;
  const prompt = direction === "en-ja" ? item.en : item.jp;
  const alternatives = allItems
    .filter(other => other.id !== item.id)
    .map(other => direction === "en-ja" ? other.jp : other.en)
    .filter(choice => choice !== answer);
  const choices = answerChoices(answer, alternatives);
  return {
    text: prompt,
    answer,
    choices,
    hint: direction === "en-ja" ? `${item.tag}のことばです。` : `「${item.en}」を思い出そう。`,
    explanation: `${item.en} は「${item.jp}」です。`,
    example: item.tag === "あいさつ" ? `${item.en}!` : "",
    item,
  };
}

function createEnglishQuestions(direction) {
  const items = englishItemsForGrade(learningState.profile.grade);
  const now = todayKey();
  const review = shuffle(items.filter(item => learningState.mastery[item.id]?.nextReviewAt <= now));
  const fresh = shuffle(items.filter(item => !review.some(candidate => candidate.id === item.id)));
  const selected = [...review.slice(0, 3), ...fresh.slice(0, 7)];
  while (selected.length < 10) selected.push(randomItem(items));
  return shuffle(selected).map(item => makeEnglishQuestion(item, direction, items));
}

function updateMastery(question, isCleanCorrect) {
  if (!question.item || !learningState) return;
  const record = learningState.mastery[question.item.id] || { attempts: 0, correct: 0, streak: 0, nextReviewAt: todayKey() };
  record.attempts += 1;
  if (isCleanCorrect) {
    record.correct += 1;
    record.streak += 1;
    const days = record.streak >= 3 ? 14 : record.streak === 2 ? 7 : 3;
    const date = new Date(); date.setDate(date.getDate() + days);
    record.nextReviewAt = date.toISOString().slice(0, 10);
  } else {
    record.streak = 0;
    record.nextReviewAt = todayKey();
  }
  learningState.mastery[question.item.id] = record;
}

function createHundredQuestions(size, operation) {
  const columns = shuffle(Array.from({ length: 10 }, (_, index) => index + 1));
  const rowCount = Math.ceil(size / 10);
  const rows = operation === "mul"
    ? shuffle(Array.from({ length: 10 }, (_, index) => index + 1)).slice(0, rowCount)
    : shuffle(Array.from({ length: 10 }, (_, index) => index + 10)).slice(0, rowCount);
  const symbol = operation === "add" ? "+" : operation === "sub" ? "−" : "×";
  return rows.flatMap((a, rowIndex) => columns.map((b, columnIndex) => {
    const answer = operation === "add" ? a + b : operation === "sub" ? a - b : a * b;
    return {
      text: `${a} ${symbol} ${b}`,
      answer: String(answer),
      hint: operation === "mul" ? "九九を声に出してみよう。" : "大きい数と小さい数を分けて考えよう。",
      explanation: `${a} ${symbol} ${b} = ${answer}`,
      rowValue: a,
      columnValue: b,
      rowIndex,
      columnIndex,
    };
  })).slice(0, size);
}

function beginStudy(kind, options) {
  activeMode = "study";
  ensureAudio();
  hideLearningPanels();
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  resultEl.classList.remove("show");
  appEl.classList.remove("title-mode", "karuta-play-mode", "karuta-result-mode");
  gameEls.forEach(el => { el.hidden = true; });
  karutaMode.hidden = true;
  studyModeEl.hidden = false;
  const questions = kind === "english" ? createEnglishQuestions(options.direction)
    : kind === "math" ? Array.from({ length: 10 }, () => makeMathQuestion(options.courseId))
      : createHundredQuestions(options.size, options.operation);
  studySession = {
    kind, options, questions, index: 0, correct: 0, combo: 0, maxCombo: 0, misses: 0,
    answered: [], input: "", startedAt: performance.now(), elapsed: 0, locked: false,
  };
  renderStudyQuestion();
  startStudyTimer();
}

function restartStudySession() {
  if (!studySession) return showTitle();
  beginStudy(studySession.kind, studySession.options);
}

function startStudyTimer() {
  stopStudyTimer();
  const tick = () => {
    if (!studySession) return;
    studySession.elapsed = performance.now() - studySession.startedAt;
    studyTimerEl.textContent = formatTime(studySession.elapsed).slice(0, 5);
    studyTimerFrame = requestAnimationFrame(tick);
  };
  studyTimerFrame = requestAnimationFrame(tick);
}

function stopStudyTimer() {
  if (studyTimerFrame) cancelAnimationFrame(studyTimerFrame);
  studyTimerFrame = null;
}

function renderStudyGrid() {
  if (studySession.kind !== "hundred") { studyGridWrapEl.hidden = true; return; }
  studyGridWrapEl.hidden = false;
  const columns = studySession.questions.slice(0, Math.min(10, studySession.questions.length));
  const columnCount = columns.length;
  studyGridEl.style.setProperty("--grid-columns", columnCount + 1);
  const cells = studySession.questions.map((question, index) => {
    const result = studySession.answered[index];
    const classes = ["hundred-cell"];
    if (index === studySession.index) classes.push("current");
    if (result?.correct) classes.push("done");
    if (result && !result.correct) classes.push("missed");
    return `<span class="${classes.join(" ")}">${result?.correct ? escapeHtml(question.answer) : ""}</span>`;
  });
  const markup = [`<span class="hundred-cell head">${escapeHtml(studySession.options.operation === "add" ? "+" : studySession.options.operation === "sub" ? "−" : "×")}</span>`, ...columns.map(question => `<span class="hundred-cell head">${question.columnValue}</span>`)];
  for (let row = 0; row < Math.ceil(studySession.questions.length / columnCount); row++) {
    const first = studySession.questions[row * columnCount];
    if (!first) continue;
    markup.push(`<span class="hundred-cell head">${first.rowValue}</span>`);
    markup.push(...cells.slice(row * columnCount, (row + 1) * columnCount));
  }
  studyGridEl.innerHTML = markup.join("");
}

function renderStudyQuestion() {
  if (!studySession) return;
  const question = studySession.questions[studySession.index];
  if (!question) return finishStudy();
  studySession.locked = false;
  studySession.input = "";
  question.attempts = 0;
  studyCountEl.textContent = `${studySession.index + 1}/${studySession.questions.length}`;
  studyCorrectEl.textContent = `正解 ${studySession.correct}`;
  studyComboEl.textContent = `コンボ ${studySession.combo}`;
  studyProgressEl.style.width = `${(studySession.index / studySession.questions.length) * 100}%`;
  studyKickerEl.textContent = studySession.kind === "english" ? "えらんで答えよう" : studySession.kind === "hundred" ? "このマスをうめよう" : "4つからえらぼう";
  studyQuestionEl.textContent = `${question.text} = ?`;
  if (studySession.kind === "english") studyQuestionEl.textContent = question.text;
  studyExampleEl.hidden = !question.example;
  studyExampleEl.textContent = question.example || "";
  studyFeedbackEl.textContent = studySession.kind === "hundred" ? "テンキーで答えてね" : "こたえをえらぼう";
  studyFeedbackEl.className = "study-feedback";
  renderStudyGrid();
  if (studySession.kind === "hundred") {
    studyChoicesEl.innerHTML = `<div class="numeric-answer" id="studyAnswer">?</div>`;
    studyKeypadEl.hidden = false;
    studyKeypadEl.innerHTML = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "けす", "0", "OK"].map(key =>
      `<button data-study-key="${key}" class="${key === "OK" ? "enter" : ""}" type="button">${key}</button>`).join("");
  } else {
    studyKeypadEl.hidden = true;
    studyKeypadEl.innerHTML = "";
    studyChoicesEl.innerHTML = question.choices.map(choice => `<button data-study-answer="${escapeHtml(choice)}" type="button">${escapeHtml(choice)}</button>`).join("");
  }
}

function showStudyHint() {
  if (!studySession || studySession.locked) return;
  const question = studySession.questions[studySession.index];
  studyFeedbackEl.textContent = `ヒント：${question.hint}`;
  studyFeedbackEl.className = "study-feedback hint";
}

function handleStudyKey(key) {
  if (!studySession || studySession.kind !== "hundred" || studySession.locked) return;
  if (key === "けす") studySession.input = studySession.input.slice(0, -1);
  else if (key === "OK") return checkStudyAnswer(studySession.input);
  else if (studySession.input.length < 4) studySession.input += key;
  document.getElementById("studyAnswer").textContent = studySession.input || "?";
  if (/^\d$/.test(key)) playKeyTap();
}

function checkStudyAnswer(value) {
  if (!studySession || studySession.locked || value === "") return;
  const question = studySession.questions[studySession.index];
  const normalized = String(value).trim().replace(/−/g, "-");
  if (normalized === String(question.answer)) {
    studySession.locked = true;
    studySession.correct += 1;
    studySession.combo += 1;
    studySession.maxCombo = Math.max(studySession.maxCombo, studySession.combo);
    studySession.answered[studySession.index] = { correct: true, attempts: question.attempts };
    updateMastery(question, question.attempts === 0);
    studyFeedbackEl.textContent = studySession.combo >= 3 ? `${studySession.combo}れんぞく正解！` : "正解！";
    studyFeedbackEl.className = "study-feedback good";
    playCorrect(studySession.combo);
    if (studySession.kind !== "hundred") {
      studyChoicesEl.querySelectorAll("button").forEach(button => {
        button.disabled = true;
        if (button.dataset.studyAnswer === String(question.answer)) button.classList.add("correct");
      });
    }
    renderStudyGrid();
    setTimeout(() => { studySession.index += 1; renderStudyQuestion(); }, 480);
    return;
  }
  question.attempts += 1;
  question.hadError = true;
  studySession.misses += 1;
  studySession.combo = 0;
  studyComboEl.textContent = "コンボ 0";
  playWrong();
  if (studySession.kind === "hundred") studySession.input = "";
  const answerBox = document.getElementById("studyAnswer");
  if (answerBox) answerBox.textContent = "?";
  if (question.attempts >= 3) {
    studySession.locked = true;
    studySession.answered[studySession.index] = { correct: false, attempts: question.attempts };
    updateMastery(question, false);
    studyFeedbackEl.textContent = `答えは ${question.answer}。${question.explanation}`;
    studyFeedbackEl.className = "study-feedback hint";
    setTimeout(() => { studySession.index += 1; renderStudyQuestion(); }, 1400);
  } else {
    studyFeedbackEl.textContent = question.attempts === 2 ? `ヒント：${question.hint}` : "おしい！もう一度考えてみよう。";
    studyFeedbackEl.className = "study-feedback bad";
  }
}

function finishStudy() {
  if (!studySession) return;
  stopStudyTimer();
  studyProgressEl.style.width = "100%";
  const session = studySession;
  const perfect = session.correct === session.questions.length && session.misses === 0;
  const reward = completeLearningSession({
    mode: session.kind, total: session.questions.length, correct: session.correct, perfect, maxCombo: session.maxCombo,
  });
  if (session.kind === "hundred") {
    const key = `hundred_${session.options.size}_${session.options.operation}`;
    const old = learningState.bestScores[key];
    if (!old || session.elapsed < old.elapsed) learningState.bestScores[key] = { elapsed: session.elapsed, correct: session.correct };
  }
  learningState.inProgress = null;
  saveLearningState();
  studyModeEl.hidden = true;
  appEl.classList.add("title-mode");
  resultEl.classList.add("show");
  resultTitle.textContent = session.kind === "english" ? "英語チャレンジ" : session.kind === "hundred" ? `${session.options.size}マス計算` : "算数・数学チャレンジ";
  resultTime.textContent = formatTime(session.elapsed);
  resultText.innerHTML = `正解 ${session.correct}/${session.questions.length}<br>正答率 ${Math.round((session.correct / session.questions.length) * 100)}%<br>${session.misses ? `まちがい ${session.misses}回` : "ノーミス！"}`;
  resultBadges.innerHTML = [
    perfect ? `<span class="badge-chip">⭐ ノーミス！</span>` : "",
    `<span class="badge-chip xp">+${reward.xp}pt</span>`,
    reward.mission.claimed ? `<span class="badge-chip record">🎯 ミッション達成 +${reward.mission.coins}🪙</span>` : "",
  ].join("");
  rankingEl.innerHTML = "";
  if (perfect || reward.mission.claimed) launchConfetti(70);
  playFanfare();
}

function saveStudyProgress() {
  if (!studySession || studySession.kind !== "hundred") return showTitle();
  learningState.inProgress = {
    kind: "hundred", options: studySession.options, questions: studySession.questions,
    index: studySession.index, correct: studySession.correct, combo: studySession.combo,
    maxCombo: studySession.maxCombo, misses: studySession.misses, answered: studySession.answered,
  };
  saveLearningState();
  showTitle();
}

function resumeHundred() {
  const saved = learningState.inProgress;
  if (!saved) return;
  beginStudy("hundred", saved.options);
  studySession.questions = saved.questions;
  studySession.index = saved.index;
  studySession.correct = saved.correct;
  studySession.combo = saved.combo;
  studySession.maxCombo = saved.maxCombo;
  studySession.misses = saved.misses;
  studySession.answered = saved.answered || [];
  renderStudyQuestion();
}

function renderRecords() {
  const summary = document.getElementById("recordsSummary");
  const calendar = document.getElementById("recordsCalendar");
  const recordsRanking = document.getElementById("recordsRanking");
  const info = rankInfo(learningState.profile.xp);
  const weak = Object.values(learningState.mastery).filter(record => record.attempts > record.correct).length;
  summary.innerHTML = `<div><b>${info.rank.emoji} Lv.${info.levelIndex + 1}</b><span>${info.rank.title}</span></div><div><b>${learningState.activity.streakDays}日</b><span>れんぞく学習</span></div><div><b>${weak}こ</b><span>復習したい問題</span></div>`;
  const learned = new Set(learningState.activity.playedDates);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return `<span class="${learned.has(key) ? "learned" : ""}" title="${key}">${date.getDate()}</span>`;
  });
  calendar.innerHTML = `<b>さいきん14日</b><div>${days.join("")}</div>`;
  recordsRanking.innerHTML = rankingMarkup(level);
}

function showRecords() {
  hideLearningPanels();
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  resultEl.classList.remove("show");
  appEl.classList.add("title-mode");
  recordsScreenEl.hidden = false;
  renderRecords();
}

function initializeLearningHub() {
  learningState = loadLearningState();
  learningHubReady = true;
  document.querySelectorAll("[data-grade]").forEach(button => button.addEventListener("click", () => {
    learningState.profile.grade = button.dataset.grade;
    saveLearningState();
    showTitle();
  }));
  document.querySelectorAll("[data-open-panel]").forEach(button => button.addEventListener("click", () => {
    const panel = button.dataset.openPanel === "math" ? mathSelectEl : button.dataset.openPanel === "hundred" ? hundredSelectEl : englishSelectEl;
    showSubjectPanel(panel);
  }));
  document.querySelectorAll("[data-panel-home]").forEach(button => button.addEventListener("click", showTitle));
  document.getElementById("showRecords").addEventListener("click", showRecords);
  document.getElementById("changeGrade").addEventListener("click", showGradeScreen);
  document.getElementById("legacyCalcBtn").addEventListener("click", () => {
    mathSelectEl.hidden = true; titleScreen.hidden = false; legacyCoursesEl.hidden = false;
  });
  document.getElementById("mathCourseList").addEventListener("click", event => {
    const button = event.target.closest("[data-math-course]");
    if (button) beginStudy("math", { courseId: button.dataset.mathCourse });
  });
  document.getElementById("hundredCourseList").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button?.dataset.resumeHundred !== undefined) return resumeHundred();
    if (button?.dataset.hundredSize) beginStudy("hundred", { size: Number(button.dataset.hundredSize), operation: button.dataset.hundredOp });
  });
  document.getElementById("englishCourseList").addEventListener("click", event => {
    const button = event.target.closest("[data-english-direction]");
    if (button) beginStudy("english", { direction: button.dataset.englishDirection });
  });
  studyChoicesEl.addEventListener("click", event => {
    const button = event.target.closest("[data-study-answer]");
    if (button) checkStudyAnswer(button.dataset.studyAnswer);
  });
  studyKeypadEl.addEventListener("click", event => {
    const button = event.target.closest("[data-study-key]");
    if (button) handleStudyKey(button.dataset.studyKey);
  });
  document.getElementById("studyHint").addEventListener("click", showStudyHint);
  document.getElementById("studyPause").addEventListener("click", saveStudyProgress);
  document.getElementById("studyExit").addEventListener("click", saveStudyProgress);
  if (!learningState.profile.grade) showGradeScreen();
  else showTitle();
}

initializeLearningHub();
