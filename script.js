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
const japaneseSelectEl = document.getElementById("japaneseSelect");
const scienceSelectEl = document.getElementById("scienceSelect");
const socialSelectEl = document.getElementById("socialSelect");
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
  ["gradeScreen", "mathSelect", "hundredSelect", "englishSelect", "japaneseSelect", "scienceSelect", "socialSelect", "studyMode", "recordsScreen"]
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
  document.getElementById("japaneseSelectGrade").textContent = grade.label;
  document.getElementById("scienceSelectGrade").textContent = grade.label;
  document.getElementById("socialSelectGrade").textContent = grade.label;
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

const knowledgeContent = {
  social: {
    g4: [
      ["日本にある都道府県の数は？", "47", "都・道・府・県をすべて合わせます。", "日本には47の都道府県があります。"],
      ["日本でいちばん高い山は？", "富士山", "静岡県と山梨県にまたがる山です。", "日本でいちばん高い山は富士山です。"],
      ["日本の首都は？", "東京都", "国会議事堂がある都道府県です。", "日本の首都は東京都です。"],
      ["川の水をきれいにして水道水にする施設は？", "浄水場", "水を『浄化』する場所です。", "浄水場では川などの水を安全な水道水にします。"],
      ["火事を消したり救急活動をしたりする施設は？", "消防署", "消防車や救急車が出動します。", "消防署は消火や救急などの仕事をします。"],
      ["集めたごみを燃やして処理する施設は？", "清掃工場", "ごみ収集車が運び込みます。", "燃やせるごみは主に清掃工場で処理されます。"],
      ["交通安全や事件の防止に取り組む施設は？", "警察署", "警察官が働く場所です。", "警察署は地域の安全を守ります。"],
      ["市や町が地域のために定めるきまりを何という？", "条例", "国の法律とは別の、地域のきまりです。", "地方公共団体が定めるきまりを条例といいます。"],
    ],
    g5: [
      ["越後平野が広がり、米作りがさかんな都道府県は？", "新潟県", "日本海側にある県です。", "新潟県は越後平野を中心に米作りがさかんです。"],
      ["自動車工業が特にさかんな都道府県は？", "愛知県", "中京工業地帯の中心です。", "愛知県では自動車やその部品の生産がさかんです。"],
      ["日本の南側を流れる暖流は？", "黒潮", "日本海流とも呼ばれます。", "黒潮は日本の南岸に沿って流れる暖流です。"],
      ["魚や貝などを人工的に育てて出荷する漁業は？", "養殖業", "いけすなどで育てます。", "魚や貝を育てて出荷する漁業を養殖業といいます。"],
      ["原料を輸入し、製品にして輸出する貿易は？", "加工貿易", "原料を『加工』して価値を高めます。", "原料を輸入して製品を輸出する形を加工貿易といいます。"],
      ["関東から北九州へ工業地域が帯状に続く地域は？", "太平洋ベルト", "太平洋側に工業地帯が連なります。", "工業が集中する帯状の地域を太平洋ベルトといいます。"],
      ["ビニールハウスなどで出荷時期を早める栽培は？", "促成栽培", "温暖な気候や施設を使います。", "出荷時期を早める栽培を促成栽培といいます。"],
      ["国の海岸から一定範囲で、国の主権が及ぶ海は？", "領海", "国の『領域』に含まれる海です。", "海岸から一定範囲の、国の主権が及ぶ海を領海といいます。"],
    ],
    g6: [
      ["縄文時代に使われた、縄目の模様がある土器は？", "縄文土器", "時代の名前が付いています。", "縄目の模様がある土器を縄文土器といいます。"],
      ["邪馬台国の女王は？", "卑弥呼", "中国の歴史書にも登場します。", "邪馬台国の女王は卑弥呼です。"],
      ["645年に始まった政治の改革は？", "大化の改新", "中大兄皇子らが進めました。", "645年に大化の改新が始まりました。"],
      ["710年に都が置かれた場所は？", "平城京", "現在の奈良市付近です。", "710年、奈良に平城京が置かれました。"],
      ["鎌倉に武士の政権を開いた人物は？", "源頼朝", "征夷大将軍になった人物です。", "源頼朝は鎌倉に武士の政権を開きました。"],
      ["江戸幕府を開いた人物は？", "徳川家康", "関ヶ原の戦いに勝利しました。", "徳川家康は1603年に江戸幕府を開きました。"],
      ["江戸幕府が終わり、近代国家づくりが始まった改革は？", "明治維新", "明治時代の始まりにつながります。", "明治維新によって近代国家づくりが進みました。"],
      ["国の政治の最終的な決定権が国民にある考え方は？", "国民主権", "日本国憲法の三原則の一つです。", "国民主権とは、政治の最終的な決定権を国民が持つことです。"],
    ],
    j1: [
      ["世界で最も面積が大きい大陸は？", "ユーラシア大陸", "日本もこの大陸の東側にあります。", "世界で最も大きい大陸はユーラシア大陸です。"],
      ["経度0度の基準となる線は？", "本初子午線", "イギリスのグリニッジを通ります。", "経度0度の線を本初子午線といいます。"],
      ["緯度0度の線は？", "赤道", "地球を南北に分ける線です。", "緯度0度の線を赤道といいます。"],
      ["季節によって吹く向きが変わる風は？", "季節風", "モンスーンとも呼ばれます。", "季節で向きが変わる風を季節風といいます。"],
      ["チグリス川・ユーフラテス川流域で栄えた文明は？", "メソポタミア文明", "現在のイラク付近です。", "両河川の流域ではメソポタミア文明が栄えました。"],
      ["十七条の憲法を定めたとされる人物は？", "聖徳太子", "冠位十二階も定めたとされます。", "聖徳太子は十七条の憲法を定めたとされます。"],
      ["将軍と御家人を結んだ『ご恩』と対になるものは？", "奉公", "御家人が将軍のために働くことです。", "鎌倉時代の主従関係は、ご恩と奉公で結ばれました。"],
      ["三権分立を説いたフランスの思想家は？", "モンテスキュー", "『法の精神』を著しました。", "モンテスキューは三権分立を説きました。"],
    ],
  },
  science: {
    g4: [
      ["空気を温めると、体積はどうなる？", "大きくなる", "温められた空気は広がります。", "空気は温めると体積が大きくなります。"],
      ["水がふっとうする温度は、およそ何℃？", "100℃", "水面からあわが出続ける温度です。", "標準的な気圧では水は約100℃でふっとうします。"],
      ["水がこおり始める温度は、およそ何℃？", "0℃", "温度計の目盛りの基準の一つです。", "水は約0℃でこおり始めます。"],
      ["乾電池2個を直列につなぐと、豆電球はどうなる？", "明るくなる", "乾電池の向きをそろえてつなぎます。", "直列つなぎでは電流が強くなり、豆電球は明るくなります。"],
      ["電気が流れるために必要な回路の形は？", "一つの輪", "途中が切れていると電気は流れません。", "回路が一つの輪のようにつながると電気が流れます。"],
      ["ベガ・アルタイル・デネブを結んだ形は？", "夏の大三角", "夏の夜空で見つけやすい星の並びです。", "3つの星を結ぶと夏の大三角になります。"],
      ["月が明るく見える理由は？", "太陽の光を反射するから", "月自身が光を作っているわけではありません。", "月は太陽の光を反射して明るく見えます。"],
      ["うでを曲げるとき、内側の筋肉はどうなる？", "縮む", "筋肉は縮むことで骨を動かします。", "うでを曲げるとき、内側の筋肉は縮みます。"],
    ],
    g5: [
      ["種子から最初に出てくる葉を何という？", "子葉", "種子の中にある葉です。", "発芽して最初に出る葉を子葉といいます。"],
      ["花粉がめしべの先につくことを何という？", "受粉", "実や種子ができるために必要です。", "花粉がめしべの先につくことを受粉といいます。"],
      ["日本付近の雲は、多くの場合どちらからどちらへ動く？", "西から東", "天気も同じ向きに変わることが多いです。", "日本付近の雲は多くの場合、西から東へ動きます。"],
      ["台風の中心に近づくと、風は一般にどうなる？", "強くなる", "中心付近ほど注意が必要です。", "一般に台風の中心に近いほど風は強くなります。"],
      ["食塩水を温めると、食塩がとける量はどうなる？", "少し増える", "物質によって増え方は異なります。", "食塩は水温が上がると、とける量が少し増えます。"],
      ["物が水にとけた後、全体の重さはどうなる？", "変わらない", "見えなくなっても物は水の中にあります。", "物が水にとけても、全体の重さは変わりません。"],
      ["ふりこの1往復の時間を変える条件は？", "糸の長さ", "おもりの重さではありません。", "ふりこの長さを変えると、1往復の時間が変わります。"],
      ["川の上流に多い石の特徴は？", "大きく角ばっている", "流される時間がまだ短い場所です。", "上流の石は大きく角ばったものが多く見られます。"],
    ],
    g6: [
      ["植物が日光を受けてでんぷんを作るはたらきは？", "光合成", "葉で行われます。", "植物が日光を使って養分を作るはたらきを光合成といいます。"],
      ["物が燃え続けるのを助ける気体は？", "酸素", "空気中に約21%含まれます。", "酸素には物を燃やすはたらきがあります。"],
      ["はく息に多く、石灰水を白くにごらせる気体は？", "二酸化炭素", "物が燃えた後にもできます。", "はく息には二酸化炭素が含まれ、石灰水を白くにごらせます。"],
      ["血液を全身へ送り出す臓器は？", "心臓", "胸の中で拍動しています。", "心臓は血液を全身へ送り出します。"],
      ["消化された養分を主に吸収する臓器は？", "小腸", "内側に多くのひだがあります。", "養分は主に小腸から吸収されます。"],
      ["月が太陽とほぼ同じ方向にあり、見えにくいときの月は？", "新月", "満月とは反対の位置関係です。", "月が太陽と同じ方向にあるころを新月といいます。"],
      ["てこがつり合うときに等しくなるものは？", "力×支点からの距離", "力の大きさだけでは決まりません。", "左右の『力×支点からの距離』が等しいと、てこはつり合います。"],
      ["手回し発電機で起こるエネルギーの変化は？", "運動から電気", "手で回す動きが電気になります。", "手回し発電機は運動エネルギーを電気エネルギーに変えます。"],
    ],
    j1: [
      ["植物の細胞にあり、動物の細胞にはないつくりは？", "細胞壁", "細胞の外側を囲む丈夫なつくりです。", "細胞壁は植物の細胞に見られるつくりです。"],
      ["顕微鏡の倍率は、接眼レンズと対物レンズの倍率をどうする？", "かけ合わせる", "10倍と40倍なら400倍です。", "顕微鏡の倍率は接眼レンズと対物レンズの倍率をかけて求めます。"],
      ["火のついた線香を入れると激しく燃える気体は？", "酸素", "物を燃やすはたらきがあります。", "酸素の中では線香が激しく燃えます。"],
      ["石灰水を白くにごらせる気体は？", "二酸化炭素", "呼吸でも出る気体です。", "二酸化炭素を通すと石灰水は白くにごります。"],
      ["物質が状態変化するとき、質量はどうなる？", "変わらない", "形や体積が変わっても物質の量は同じです。", "状態変化の前後で物質の質量は変わりません。"],
      ["光が鏡で反射するとき、入射角と等しい角は？", "反射角", "法線を基準に測ります。", "光の反射では入射角と反射角が等しくなります。"],
      ["音の高さを決めるものは？", "振動数", "1秒間に振動する回数です。", "振動数が多いほど高い音になります。"],
      ["力の大きさを表す単位は？", "ニュートン", "記号はNです。", "力の大きさはニュートン（N）で表します。"],
    ],
  },
  japanese: {
    g4: [
      ["「博物館」の読み方は？", "はくぶつかん", "いろいろな資料を展示する場所です。", "「博物館」は「はくぶつかん」と読みます。"],
      ["「協力」の読み方は？", "きょうりょく", "力を合わせることです。", "「協力」は「きょうりょく」と読みます。"],
      ["「季節」の読み方は？", "きせつ", "春・夏・秋・冬のことです。", "「季節」は「きせつ」と読みます。"],
      ["「連続」の読み方は？", "れんぞく", "続けて起こることです。", "「連続」は「れんぞく」と読みます。"],
      ["ことわざ「石の上にも□」に入ることばは？", "三年", "辛抱強く続ける大切さを表します。", "ことわざは「石の上にも三年」です。"],
      ["ことわざ「急がば□」に入ることばは？", "回れ", "急ぐときほど安全な方法を選ぶという意味です。", "ことわざは「急がば回れ」です。"],
      ["四字熟語「一石□」に入ることばは？", "二鳥", "一つの行動で二つの利益を得ることです。", "四字熟語は「一石二鳥」です。"],
      ["慣用句「その場の□を読む」に入ることばは？", "空気", "その場の雰囲気という意味で使います。", "「その場の空気を読む」という表現です。"],
    ],
    g5: [
      ["「提案」の読み方は？", "ていあん", "考えを出すことです。", "「提案」は「ていあん」と読みます。"],
      ["「責任」の読み方は？", "せきにん", "引き受けた役目を果たすことです。", "「責任」は「せきにん」と読みます。"],
      ["「賛成」の読み方は？", "さんせい", "意見に同意することです。", "「賛成」は「さんせい」と読みます。"],
      ["「適切」の読み方は？", "てきせつ", "その場によく合っていることです。", "「適切」は「てきせつ」と読みます。"],
      ["ことわざ「馬の耳に□」に入ることばは？", "念仏", "何を言っても効き目がないという意味です。", "ことわざは「馬の耳に念仏」です。"],
      ["四字熟語「十人□」に入ることばは？", "十色", "人にはそれぞれ違いがあるという意味です。", "四字熟語は「十人十色」です。"],
      ["四字熟語「温故□」に入ることばは？", "知新", "昔を学び、新しい知識を得ることです。", "四字熟語は「温故知新」です。"],
      ["ことわざ「失敗は□のもと」に入ることばは？", "成功", "失敗から学ぶ大切さを表します。", "ことわざは「失敗は成功のもと」です。"],
    ],
    g6: [
      ["「尊敬」の読み方は？", "そんけい", "相手を敬うことです。", "「尊敬」は「そんけい」と読みます。"],
      ["「警告」の読み方は？", "けいこく", "危険などを前もって知らせることです。", "「警告」は「けいこく」と読みます。"],
      ["「臨時」の読み方は？", "りんじ", "決まった時ではなく、その時だけのことです。", "「臨時」は「りんじ」と読みます。"],
      ["「困難」の読み方は？", "こんなん", "物事をするのが難しいことです。", "「困難」は「こんなん」と読みます。"],
      ["ことわざ「継続は□なり」に入ることばは？", "力", "続けることの大切さを表します。", "ことわざは「継続は力なり」です。"],
      ["ことわざ「百聞は□にしかず」に入ることばは？", "一見", "聞くだけでなく自分で見る方がよいという意味です。", "ことわざは「百聞は一見にしかず」です。"],
      ["四字熟語「有言□」に入ることばは？", "実行", "言ったことを必ず行うことです。", "四字熟語は「有言実行」です。"],
      ["四字熟語「試行□」に入ることばは？", "錯誤", "試しながら失敗を重ね、解決に近づくことです。", "四字熟語は「試行錯誤」です。"],
    ],
    j1: [
      ["「抽象」の読み方は？", "ちゅうしょう", "具体的な形から共通点を取り出した考えです。", "「抽象」は「ちゅうしょう」と読みます。"],
      ["「論理」の読み方は？", "ろんり", "筋道を立てた考え方です。", "「論理」は「ろんり」と読みます。"],
      ["「推敲」の読み方は？", "すいこう", "文章を何度も練り直すことです。", "「推敲」は「すいこう」と読みます。"],
      ["「著者」の読み方は？", "ちょしゃ", "その文章や本を書いた人です。", "「著者」は「ちょしゃ」と読みます。"],
      ["文「雨が強くなった。□、試合は中止になった」に入る接続語は？", "そのため", "前の内容が原因、後ろが結果です。", "原因と結果をつなぐ「そのため」が合います。"],
      ["文「身近な再利用品、□、再生紙などがある」に入ることばは？", "たとえば", "具体例を挙げるときの接続語です。", "具体例を示す「たとえば」が合います。"],
      ["「鳥が空を飛ぶ」の「飛ぶ」の品詞は？", "動詞", "動作を表し、言い切りがウ段の音です。", "「飛ぶ」は動作を表す動詞です。"],
      ["「静かな教室」の「静かな」の品詞は？", "形容動詞", "言い切りの形は「静かだ」です。", "「静かな」は形容動詞「静かだ」の連体形です。"],
    ],
  },
};

const knowledgeDistractors = {
  "social-g4-0": ["46", "48", "50"],
  "social-g4-1": ["北岳", "奥穂高岳", "槍ヶ岳"],
  "social-g4-2": ["大阪府", "京都府", "北海道"],
  "social-g4-3": ["下水処理場", "配水場", "ダム"],
  "social-g4-4": ["警察署", "市役所", "保健所"],
  "social-g4-5": ["浄水場", "下水処理場", "リサイクルセンター"],
  "social-g4-6": ["消防署", "税務署", "保健所"],
  "social-g4-7": ["法律", "規則", "公約"],
  "social-g5-0": ["秋田県", "山形県", "宮城県"],
  "social-g5-1": ["静岡県", "群馬県", "広島県"],
  "social-g5-2": ["親潮", "対馬海流", "リマン海流"],
  "social-g5-3": ["沿岸漁業", "沖合漁業", "栽培漁業"],
  "social-g5-4": ["中継貿易", "自由貿易", "保護貿易"],
  "social-g5-5": ["京浜工業地帯", "瀬戸内工業地域", "北九州工業地域"],
  "social-g5-6": ["抑制栽培", "露地栽培", "二期作"],
  "social-g5-7": ["排他的経済水域", "公海", "接続水域"],
  "social-g6-0": ["弥生土器", "須恵器", "土師器"],
  "social-g6-1": ["推古天皇", "持統天皇", "紫式部"],
  "social-g6-2": ["壬申の乱", "承久の乱", "応仁の乱"],
  "social-g6-3": ["平安京", "藤原京", "長岡京"],
  "social-g6-4": ["源義経", "北条時政", "足利尊氏"],
  "social-g6-5": ["徳川家光", "豊臣秀吉", "織田信長"],
  "social-g6-6": ["大政奉還", "廃藩置県", "文明開化"],
  "social-g6-7": ["基本的人権の尊重", "平和主義", "三権分立"],
  "social-j1-0": ["アフリカ大陸", "北アメリカ大陸", "南アメリカ大陸"],
  "social-j1-1": ["国際日付変更線", "赤道", "北回帰線"],
  "social-j1-2": ["本初子午線", "北極圏", "南回帰線"],
  "social-j1-3": ["偏西風", "貿易風", "海陸風"],
  "social-j1-4": ["エジプト文明", "インダス文明", "中国文明"],
  "social-j1-5": ["中大兄皇子", "聖武天皇", "桓武天皇"],
  "social-j1-6": ["忠誠", "年貢", "恩賞"],
  "social-j1-7": ["ルソー", "ロック", "ヴォルテール"],
  "science-g4-0": ["小さくなる", "変わらない", "なくなる"],
  "science-g4-1": ["90℃", "95℃", "110℃"],
  "science-g4-2": ["−10℃", "5℃", "10℃"],
  "science-g4-3": ["暗くなる", "明るさは変わらない", "つかなくなる"],
  "science-g4-4": ["二つの輪", "直線", "枝分かれ"],
  "science-g4-5": ["冬の大三角", "春の大曲線", "北斗七星"],
  "science-g4-6": ["月自身が光るから", "星の光を集めるから", "地球の光を反射するから"],
  "science-g4-7": ["伸びる", "ゆるむ", "変わらない"],
  "science-g5-0": ["本葉", "胚乳", "根毛"],
  "science-g5-1": ["発芽", "結実", "受精"],
  "science-g5-2": ["東から西", "北から南", "南から北"],
  "science-g5-3": ["弱くなる", "変わらない", "止まる"],
  "science-g5-4": ["大きく増える", "減る", "変わらない"],
  "science-g5-5": ["軽くなる", "重くなる", "半分になる"],
  "science-g5-6": ["おもりの重さ", "振れ幅", "おもりの形"],
  "science-g5-7": ["小さく丸い", "小さく角ばっている", "大きく丸い"],
  "science-g6-0": ["呼吸", "蒸散", "発芽"],
  "science-g6-1": ["二酸化炭素", "窒素", "水素"],
  "science-g6-2": ["酸素", "窒素", "水蒸気"],
  "science-g6-3": ["肺", "胃", "肝臓"],
  "science-g6-4": ["胃", "大腸", "肝臓"],
  "science-g6-5": ["満月", "上弦の月", "下弦の月"],
  "science-g6-6": ["力＋支点からの距離", "力÷支点からの距離", "力−支点からの距離"],
  "science-g6-7": ["電気から運動", "電気から光", "光から電気"],
  "science-j1-0": ["細胞膜", "核", "細胞質"],
  "science-j1-1": ["足し合わせる", "引き算する", "割り算する"],
  "science-j1-2": ["二酸化炭素", "水素", "窒素"],
  "science-j1-3": ["酸素", "水素", "窒素"],
  "science-j1-4": ["増える", "減る", "物質によって変わる"],
  "science-j1-5": ["屈折角", "臨界角", "偏角"],
  "science-j1-6": ["振幅", "波長", "音速"],
  "science-j1-7": ["ジュール", "パスカル", "ワット"],
  "japanese-g4-0": ["はくものかん", "ばくぶつかん", "はくぶつけん"],
  "japanese-g4-1": ["きょりょく", "きょうりき", "ごうりょく"],
  "japanese-g4-2": ["きぶし", "きせち", "きぶん"],
  "japanese-g4-3": ["れんそく", "れんつづき", "れんしょく"],
  "japanese-g4-4": ["三日", "三月", "一年"],
  "japanese-g4-5": ["走れ", "急げ", "止まれ"],
  "japanese-g4-6": ["一鳥", "三鳥", "二石"],
  "japanese-g4-7": ["風", "声", "色"],
  "japanese-g5-0": ["だいあん", "ていなん", "ていえん"],
  "japanese-g5-1": ["せきじん", "せいにん", "せきに"],
  "japanese-g5-2": ["ざんせい", "さんしょう", "さんじょう"],
  "japanese-g5-3": ["てきせい", "てっせつ", "てきぜつ"],
  "japanese-g5-4": ["説法", "経文", "お経"],
  "japanese-g5-5": ["十通り", "十人", "百色"],
  "japanese-g5-6": ["新知", "知古", "新故"],
  "japanese-g5-7": ["成長", "工夫", "挑戦"],
  "japanese-g6-0": ["そんきょう", "ぞんけい", "そんけ"],
  "japanese-g6-1": ["けいごく", "きょうこく", "けいこ"],
  "japanese-g6-2": ["りんし", "れんじ", "のぞみどき"],
  "japanese-g6-3": ["こなん", "こんねん", "くなん"],
  "japanese-g6-4": ["宝", "道", "技"],
  "japanese-g6-5": ["一回", "一度", "一目"],
  "japanese-g6-6": ["実現", "実践", "行動"],
  "japanese-g6-7": ["錯覚", "誤算", "試行"],
  "japanese-j1-0": ["ちゅうぞう", "ちゅうそう", "ちゅしょう"],
  "japanese-j1-1": ["りんり", "ろんぎ", "ろんじ"],
  "japanese-j1-2": ["すいごう", "ついこう", "すいぎょう"],
  "japanese-j1-3": ["ちょじゃ", "しょしゃ", "ちょうしゃ"],
  "japanese-j1-4": ["しかし", "一方", "また"],
  "japanese-j1-5": ["つまり", "しかし", "ところが"],
  "japanese-j1-6": ["名詞", "形容詞", "副詞"],
  "japanese-j1-7": ["形容詞", "連体詞", "副詞"],
};

function createKnowledgeQuestions(kind) {
  const grade = learningState.profile.grade;
  const items = knowledgeContent[kind][grade].map(([text, answer, hint, explanation], index) => ({
    id: `${kind}-${grade}-${index}`,
    text,
    answer,
    hint,
    explanation,
  }));
  return shuffle(items).map(item => ({
    text: item.text,
    answer: item.answer,
    choices: answerChoices(item.answer, knowledgeDistractors[item.id]),
    hint: item.hint,
    explanation: item.explanation,
    item,
  }));
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
      : kind === "hundred" ? createHundredQuestions(options.size, options.operation)
        : createKnowledgeQuestions(kind);
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
  const knowledgeKickers = { japanese: "漢字・ことば", science: "自然のしくみ", social: "地理・歴史・くらし" };
  studyKickerEl.textContent = knowledgeKickers[studySession.kind]
    || (studySession.kind === "english" ? "えらんで答えよう" : studySession.kind === "hundred" ? "このマスをうめよう" : "4つからえらぼう");
  const isKnowledge = Boolean(knowledgeKickers[studySession.kind]);
  studyQuestionEl.classList.toggle("knowledge-question", isKnowledge);
  studyQuestionEl.textContent = studySession.kind === "math" || studySession.kind === "hundred"
    ? `${question.text} = ?`
    : question.text;
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
  const resultTitles = {
    math: "算数・数学チャレンジ",
    english: "英語チャレンジ",
    japanese: "国語チャレンジ",
    science: "理科チャレンジ",
    social: "社会チャレンジ",
  };
  resultTitle.textContent = session.kind === "hundred" ? `${session.options.size}マス計算` : resultTitles[session.kind];
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
    const panels = {
      math: mathSelectEl,
      hundred: hundredSelectEl,
      english: englishSelectEl,
      japanese: japaneseSelectEl,
      science: scienceSelectEl,
      social: socialSelectEl,
    };
    showSubjectPanel(panels[button.dataset.openPanel]);
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
  document.querySelectorAll("[data-knowledge-kind]").forEach(button => button.addEventListener("click", () => {
    beginStudy(button.dataset.knowledgeKind, {});
  }));
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
