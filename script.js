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
    const reviewList = document.getElementById("reviewList");
    const reviewBtn = document.getElementById("reviewBtn");
    const signBtn = document.querySelector('[data-action="sign"]');
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const modeSets = {
      elementary: [
        { label: "ミックス", mode: "mix" },
        { label: "かけ算", mode: "mul" },
        { label: "わり算", mode: "div" },
      ],
      middle: [
        { label: "ミックス", mode: "mix" },
        { label: "たしひき", mode: "addsub" },
        { label: "かけわり", mode: "muldiv" },
      ],
    };

    let level = "elementary";
    let mode = "mix";
    let current = null;
    let input = "";
    let index = 0;
    let correct = 0;
    let streak = 0;
    let mistakes = [];
    let lastMistakes = [];
    let reviewQueue = [];
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
    const formatTerm = (value) => value < 0 ? `(${value})` : `${value}`;
    const formatSigned = (value) => value < 0 ? `${value}` : `+${value}`;
    const pad = (value, size = 2) => String(value).padStart(size, "0");
    const rankingKey = () => `keisanWallTimes_${level}_${mode}`;

    function formatTime(ms) {
      const total = Math.max(0, Math.floor(ms));
      const minutes = Math.floor(total / 60000);
      const seconds = Math.floor((total % 60000) / 1000);
      const millis = total % 1000;
      return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
    }

    function readTimes() {
      const match = document.cookie.match(new RegExp(`(?:^|; )${rankingKey()}=([^;]*)`));
      if (!match) return [];
      try {
        const times = JSON.parse(decodeURIComponent(match[1]));
        return Array.isArray(times) ? times.filter(Number.isFinite) : [];
      } catch {
        return [];
      }
    }

    function saveTime(ms) {
      const times = [...readTimes(), Math.floor(ms)].sort((a, b) => a - b).slice(0, 10);
      document.cookie = `${rankingKey()}=${encodeURIComponent(JSON.stringify(times))}; max-age=31536000; path=/; SameSite=Lax`;
      return times;
    }

    function renderRanking(times = readTimes()) {
      if (!times.length) {
        rankingEl.innerHTML = `<h3>ベストタイム</h3><p>まだ記録がありません</p>`;
        return;
      }

      rankingEl.innerHTML = `<h3>ベストタイム</h3><ol>${times.map((time, i) => `<li><span>${i + 1}</span><b>${formatTime(time)}</b></li>`).join("")}</ol>`;
    }

    function stopTimer() {
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

    function makeElementaryQuestion() {
      const type = mode === "mix" ? (Math.random() < .5 ? "mul" : "div") : mode;
      if (type === "mul") {
        const a = rand(2, 9), b = rand(2, 9);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      const b = rand(2, 9), ans = rand(2, 9);
      return { text: `${b * ans} ÷ ${b}`, answer: ans };
    }

    function makeMiddleQuestion() {
      const groups = mode === "mix" ? ["addsub", "muldiv"] : [mode];
      const group = groups[rand(0, groups.length - 1)];

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

      const [b, ans] = signedPair(-9, 9, false);
      return { text: `${b * ans} ÷ ${b}`, answer: ans };
    }

    function makeQuestion() {
      return level === "middle" ? makeMiddleQuestion() : makeElementaryQuestion();
    }

    function renderModeButtons() {
      document.querySelectorAll(".mode button").forEach((btn, i) => {
        const item = modeSets[level][i];
        btn.textContent = item.label;
        btn.dataset.mode = item.mode;
        btn.classList.toggle("active", i === 0);
      });
      mode = "mix";
      signBtn.disabled = level !== "middle";
    }

    function renderQuestion() {
      locked = false;
      input = "";
      current = reviewQueue.length ? reviewQueue.shift() : makeQuestion();
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
      lastMistakes = [];
      reviewQueue = [];
      mistakes = [];
      resultEl.classList.remove("show");
      appEl.classList.add("title-mode");
      titleScreen.hidden = false;
      gameEls.forEach(el => el.hidden = true);
    }

    function startLevel(nextLevel) {
      level = nextLevel;
      appEl.classList.remove("title-mode");
      titleScreen.hidden = true;
      gameEls.forEach(el => el.hidden = false);
      renderModeButtons();
      resetSet(false);
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

      locked = true;
      const ok = value === current.answer;
      answerEl.textContent = current.answer;

      if (ok) {
        correct++;
        streak++;
        feedbackEl.textContent = "正解！";
        feedbackEl.className = "feedback good";
        playCorrectEffect();
      } else {
        streak = 0;
        feedbackEl.textContent = `答えは ${current.answer}`;
        feedbackEl.className = "feedback bad";
        mistakes.push({ ...current, your: input });
      }

      correctEl.textContent = correct;
      streakEl.textContent = streak;
      index++;
      if (index >= 10) stopTimer();

      setTimeout(() => {
        if (index >= 10) finishSet();
        else renderQuestion();
      }, ok ? 430 : 950);
    }

    function finishSet() {
      stopTimer();
      const finalMs = elapsedMs;
      lastMistakes = mistakes.slice();
      const bestTimes = lastMistakes.length ? readTimes() : saveTime(finalMs);
      current = null;
      questionEl.textContent = "おしまい！";
      answerEl.textContent = `${correct}/10`;
      feedbackEl.textContent = lastMistakes.length ? "下に復習があるよ" : "全問正解！";
      feedbackEl.className = lastMistakes.length ? "feedback bad" : "feedback good";

      resultEl.classList.add("show");
      resultTitle.textContent = "セット結果";
      resultTime.textContent = formatTime(finalMs);
      resultText.textContent = lastMistakes.length ? `10問中 ${correct}問 正解（全問正解で記録）` : `10問中 ${correct}問 正解`;
      renderRanking(bestTimes);
      reviewList.innerHTML = "";

      if (!lastMistakes.length) {
        reviewList.innerHTML = `<div class="review-item">まちがいなし。もう1セットいこう！</div>`;
        reviewBtn.textContent = "もう1セット";
      } else {
        lastMistakes.forEach((m, i) => {
          const item = document.createElement("div");
          item.className = "review-item";
          item.textContent = `${i + 1}. ${m.text} = ${m.answer}（あなた: ${m.your || "未入力"}）`;
          reviewList.appendChild(item);
        });
        reviewBtn.textContent = "まちがい復習スタート";
      }
    }

    function resetSet(asReview = false) {
      countdownToken++;
      countdownEl.hidden = true;
      index = 0;
      correct = 0;
      streak = 0;
      input = "";
      locked = true;
      reviewQueue = asReview ? lastMistakes.map(m => ({ text: m.text, answer: m.answer })) : [];
      mistakes = [];
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
      if (action === "sign") {
        if (!locked && level === "middle") input = input.startsWith("-") ? input.slice(1) : `-${input}`;
      } else if (key && !locked && input.length < 3) {
        input += key;
      }
      answerEl.textContent = input || "?";
    });

    document.querySelectorAll(".mode button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".mode button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        mode = btn.dataset.mode;
        lastMistakes = [];
        resetSet(false);
      });
    });

    document.getElementById("clearInput").addEventListener("click", () => {
      if (locked) return;
      input = input.slice(0, -1);
      answerEl.textContent = input || "?";
    });
    document.getElementById("newSet").addEventListener("click", () => {
      lastMistakes = [];
      resetSet(false);
    });
    document.getElementById("levelSelect").addEventListener("click", showTitle);
    reviewBtn.addEventListener("click", () => resetSet(lastMistakes.length > 0));
    document.querySelectorAll("[data-level]").forEach(btn => {
      btn.addEventListener("click", () => startLevel(btn.dataset.level));
    });

    window.addEventListener("keydown", (e) => {
      if (/^[0-9]$/.test(e.key) && !locked && input.length < 3) {
        input += e.key;
        answerEl.textContent = input;
      }
      if (e.key === "-" && !locked && level === "middle") {
        input = input.startsWith("-") ? input.slice(1) : `-${input}`;
        answerEl.textContent = input || "?";
      }
      if (e.key === "Backspace" && !locked) {
        input = input.slice(0, -1);
        answerEl.textContent = input || "?";
      }
      if (e.key === "Enter") submit();
    });

    showTitle();
