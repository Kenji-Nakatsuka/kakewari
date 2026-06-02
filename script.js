const appEl = document.querySelector(".app");
const titleScreen = document.getElementById("titleScreen");
const gameEls = document.querySelectorAll(".game-ui");
const countdownEl = document.getElementById("countdown");
const timerEl = document.getElementById("timer");
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const feedbackEl = document.getElementById("feedback");
const countEl = document.getElementById("count");
const correctEl = document.getElementById("correct");
const streakEl = document.getElementById("streak");
const resultEl = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultTime = document.getElementById("resultTime");
const resultText = document.getElementById("resultText");
const rankingEl = document.getElementById("ranking");
const rankingScreen = document.getElementById("rankingScreen");
const titleRankingList = document.getElementById("titleRankingList");
const rankingTabs = document.getElementById("rankingTabs");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const courses = {
  elementary: {
    label: "小学生向け",
    shortLabel: "小学生",
    detail: "かけ算・わり算",
    leftDigits: 1,
    rightDigits: 1,
  },
  hard: {
    label: "小学生向け 難しい",
    shortLabel: "難しい",
    detail: "2桁と2桁のかけ算・わり算",
    leftDigits: 2,
    rightDigits: 2,
  },
  oni: {
    label: "小学生向け 鬼",
    shortLabel: "鬼",
    detail: "3桁と2桁のかけ算・わり算",
    leftDigits: 3,
    rightDigits: 2,
  },
  middle: {
    label: "中学生向け",
    shortLabel: "中学生",
    detail: "正の数・負の数の加減乗除",
    signed: true,
  },
};

let level = "elementary";
let rankingLevel = "elementary";
let current = null;
let input = "";
let index = 0;
let correct = 0;
let streak = 0;
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

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

function readTimes(course = level) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${rankingKey(course)}=([^;]*)`));
  if (!match) return [];
  try {
    const times = JSON.parse(decodeURIComponent(match[1]));
    return Array.isArray(times) ? times.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function saveTime(ms) {
  const times = [...readTimes(level), Math.floor(ms)].sort((a, b) => a - b).slice(0, 10);
  document.cookie = `${rankingKey(level)}=${encodeURIComponent(JSON.stringify(times))}; max-age=31536000; path=/; SameSite=Lax`;
  return times;
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

function makeQuestion() {
  const course = courses[level];
  if (course.signed) return makeMiddleQuestion();

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

function renderQuestion() {
  locked = false;
  input = "";
  current = makeQuestion();
  questionEl.textContent = current.text;
  answerEl.textContent = "?";
  answerEl.classList.remove("correct-mark");
  feedbackEl.textContent = "テンキーで答えてね";
  feedbackEl.className = "feedback";
  countEl.textContent = `${Math.min(index + 1, 10)}/10`;
  correctEl.textContent = correct;
  streakEl.textContent = streak;
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

  [2, 1, "GO"].forEach((value, i) => {
    setTimeout(() => {
      if (token !== countdownToken) return;
      countdownEl.textContent = value;
      feedbackEl.textContent = value === "GO" ? "スタート！" : `スタートまで ${value}`;
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
  appEl.classList.remove("title-mode");
  titleScreen.hidden = true;
  rankingScreen.hidden = true;
  gameEls.forEach(el => el.hidden = false);
  document.querySelector('[data-action="sign"]').disabled = !courses[level].signed;
  resetSet();
}

function playCorrectEffect() {
  answerEl.classList.remove("correct-mark");
  void answerEl.offsetWidth;
  answerEl.classList.add("correct-mark");

  if (prefersReducedMotion) return;

  const burst = document.createElement("span");
  burst.className = "spark-burst";
  burst.setAttribute("aria-hidden", "true");

  for (let i = 0; i < 8; i++) {
    const spark = document.createElement("span");
    spark.style.setProperty("--i", i);
    burst.appendChild(spark);
  }

  answerEl.appendChild(burst);
  setTimeout(() => burst.remove(), 420);
}

function submit() {
  if (locked || !current) return;
  const value = Number(input);
  if (input === "" || input === "-") return;

  if (value !== current.answer) {
    streak = 0;
    input = "";
    answerEl.textContent = "?";
    feedbackEl.textContent = "ちがう！もう一回";
    feedbackEl.className = "feedback bad";
    streakEl.textContent = streak;
    answerEl.classList.remove("shake");
    void answerEl.offsetWidth;
    answerEl.classList.add("shake");
    return;
  }

  locked = true;
  correct++;
  streak++;
  answerEl.textContent = current.answer;
  feedbackEl.textContent = "正解！";
  feedbackEl.className = "feedback good";
  correctEl.textContent = correct;
  streakEl.textContent = streak;
  index++;
  playCorrectEffect();
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
  current = null;
  questionEl.textContent = "おしまい！";
  answerEl.textContent = `${correct}/10`;
  feedbackEl.textContent = "クリア！";
  feedbackEl.className = "feedback good";

  resultEl.classList.add("show");
  resultTitle.textContent = courses[level].label;
  resultTime.textContent = formatTime(finalMs);
  resultText.textContent = "10問クリア";
  renderResultRanking(bestTimes);
}

function resetSet() {
  countdownToken++;
  countdownEl.hidden = true;
  index = 0;
  correct = 0;
  streak = 0;
  input = "";
  locked = true;
  resultEl.classList.remove("show");
  renderQuestion();
  beginCountdown();
}

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
    if (courses[level].signed) input = input.startsWith("-") ? input.slice(1) : `-${input}`;
  } else if (key && input.length < 6) {
    input += key;
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
    answerEl.textContent = input;
  }
  if (e.key === "-" && !locked && courses[level].signed) {
    input = input.startsWith("-") ? input.slice(1) : `-${input}`;
    answerEl.textContent = input || "?";
  }
  if (e.key === "Backspace" && !locked) {
    input = input.slice(0, -1);
    answerEl.textContent = input || "?";
  }
  if (e.key === "Enter") submit();
});

renderTitleRanking();
showTitle();
