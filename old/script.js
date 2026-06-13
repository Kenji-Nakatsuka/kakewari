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

    function makeQuestion() {
      const type = mode === "mix" ? (Math.random() < .5 ? "mul" : "div") : mode;
      if (type === "mul") {
        const a = rand(2, 9), b = rand(2, 9);
        return { text: `${a} × ${b}`, answer: a * b };
      }
      const b = rand(2, 9), ans = rand(2, 9);
      return { text: `${b * ans} ÷ ${b}`, answer: ans };
    }

    function renderQuestion() {
      locked = false;
      input = "";
      current = reviewQueue.length ? reviewQueue.shift() : makeQuestion();
      questionEl.textContent = current.text;
      answerEl.textContent = "?";
      feedbackEl.textContent = "テンキーで答えてね";
      feedbackEl.className = "feedback";
      countEl.textContent = `${Math.min(index + 1, 10)}/10`;
      correctEl.textContent = correct;
      streakEl.textContent = streak;
      questionEl.classList.remove("pop");
      void questionEl.offsetWidth;
      questionEl.classList.add("pop");
    }

    function submit(forceWrong = false) {
      if (locked || !current) return;
      const value = Number(input);
      if (!forceWrong && input === "") return;

      locked = true;
      const ok = !forceWrong && value === current.answer;
      answerEl.textContent = current.answer;

      if (ok) {
        correct++;
        streak++;
        feedbackEl.textContent = "正解！";
        feedbackEl.className = "feedback good";
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
      if (action === "clear") {
        input = input.slice(0, -1);
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
    document.getElementById("newSet").addEventListener("click", () => {
      lastMistakes = [];
      resetSet(false);
    });
    reviewBtn.addEventListener("click", () => resetSet(lastMistakes.length > 0));

    window.addEventListener("keydown", (e) => {
      if (/^[0-9]$/.test(e.key) && !locked && input.length < 3) {
        input += e.key;
        answerEl.textContent = input;
      }
      if (e.key === "Backspace") {
        input = input.slice(0, -1);
        answerEl.textContent = input || "?";
      }
      if (e.key === "Enter") submit();
    });

    renderQuestion();
