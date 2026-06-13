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
const digitRange = (digits) => digits === 1 ? [2, 9] : [10 ** (digits - 1), (10 ** digits) - 1];
const formatTerm = (value) => value < 0 ? `(${value})` : `${value}`;
const formatSigned = (value) => value < 0 ? `${value}` : `+${value}`;

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
  xpCard.innerHTML = `
    <div class="xp-head">
      <span class="xp-emoji">${rank.emoji}</span>
      <span class="xp-title">Lv.${levelIndex + 1} ${rank.title}</span>
      <span class="xp-points">${xp}pt</span>
    </div>
    <div class="xp-bar"><span style="width:${Math.round(progress * 100)}%"></span></div>
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
  rankingTabs.innerHTML = Object.entries(courses).map(([key, course]) => (
    `<button class="${key === rankingLevel ? "active" : ""}" data-ranking-level="${key}" type="button">${course.shortLabel}</button>`
  )).join("");
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
  timerEl.textContent = formatTime(elapsedMs);
  timerFrame = requestAnimationFrame(updateTimer);
}

function startTimer() {
  stopTimer();
  timerStart = performance.now();
  elapsedMs = 0;
  timerEl.textContent = formatTime(0);
  timerFrame = requestAnimationFrame(updateTimer);
}

function resetTimer() {
  stopTimer();
  elapsedMs = 0;
  timerEl.textContent = formatTime(0);
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
  countdownEl.hidden = true;
  resetTimer();
  current = null;
  locked = true;
  input = "";
  resultEl.classList.remove("show");
  appEl.classList.add("title-mode");
  titleScreen.hidden = false;
  rankingScreen.hidden = true;
  gameEls.forEach(el => el.hidden = true);
  renderTitleMedals();
  renderXpCard();
}

function showRankingScreen() {
  countdownToken++;
  countdownEl.hidden = true;
  resetTimer();
  current = null;
  locked = true;
  resultEl.classList.remove("show");
  appEl.classList.add("title-mode");
  titleScreen.hidden = true;
  rankingScreen.hidden = false;
  gameEls.forEach(el => el.hidden = true);
  renderTitleRanking();
}

function startLevel(nextLevel) {
  level = nextLevel;
  ensureAudio();
  appEl.classList.remove("title-mode");
  titleScreen.hidden = true;
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
document.getElementById("retryBtn").addEventListener("click", resetSet);
document.getElementById("homeBtn").addEventListener("click", showTitle);

document.getElementById("showRankings").addEventListener("click", showRankingScreen);
document.getElementById("rankingHome").addEventListener("click", showTitle);

rankingTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ranking-level]");
  if (!btn) return;
  rankingLevel = btn.dataset.rankingLevel;
  renderTitleRanking();
});

document.querySelectorAll("[data-level]").forEach(btn => {
  btn.addEventListener("click", () => startLevel(btn.dataset.level));
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
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
