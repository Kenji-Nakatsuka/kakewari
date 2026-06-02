const appEl = document.querySelector(".app");
    const titleScreen = document.getElementById("titleScreen");
    const gameEls = document.querySelectorAll(".game-ui");
    const questionEl = document.getElementById("question");
    const answerEl = document.getElementById("answer");
    const feedbackEl = document.getElementById("feedback");
    const countEl = document.getElementById("count");
    const correctEl = document.getElementById("correct");
    const streakEl = document.getElementById("streak");
    const resultEl = document.getElementById("result");
    const resultTitle = document.getElementById("resultTitle");
    const resultText = document.getElementById("resultText");
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

    function showTitle() {
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

    function submit(forceWrong = false) {
      if (locked || !current) return;
      const value = Number(input);
      if (!forceWrong && (input === "" || input === "-")) return;

      locked = true;
      const ok = !forceWrong && value === current.answer;
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
        mistakes.push({ ...current, your: forceWrong ? "見た" : input });
      }

      correctEl.textContent = correct;
      streakEl.textContent = streak;
      index++;

      setTimeout(() => {
        if (index >= 10) finishSet();
        else renderQuestion();
      }, ok ? 430 : 950);
    }

    function finishSet() {
      lastMistakes = mistakes.slice();
      current = null;
      questionEl.textContent = "おしまい！";
      answerEl.textContent = `${correct}/10`;
      feedbackEl.textContent = lastMistakes.length ? "下に復習があるよ" : "全問正解！";
      feedbackEl.className = lastMistakes.length ? "feedback bad" : "feedback good";

      resultEl.classList.add("show");
      resultTitle.textContent = "セット結果";
      resultText.textContent = `10問中 ${correct}問 正解`;
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
      index = 0;
      correct = 0;
      streak = 0;
      input = "";
      locked = false;
      reviewQueue = asReview ? lastMistakes.map(m => ({ text: m.text, answer: m.answer })) : [];
      mistakes = [];
      resultEl.classList.remove("show");
      renderQuestion();
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

    document.getElementById("skip").addEventListener("click", () => submit(true));
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
