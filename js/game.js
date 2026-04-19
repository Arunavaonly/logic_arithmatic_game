// game.js — Core game loop, state machine, scoring
const Game = (() => {

  // ── State ──────────────────────────────────────────────────
  const state = {
    levelIndex:      0,
    questions:       [],
    qIndex:          0,
    score:           0,
    correctCount:    0,
    hintUsed:        false,
    skipsLeft:       2,
    streak:          0,
    maxStreak:       0,
    timerSecs:       0,
    timerInterval:   null,
    questionStart:   0,
    categoryResults: {},   // type → {correct, total}
    totalElapsed:    0,    // seconds across all questions
    levelStartTime:  0,
  };

  // ── Helpers ────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick10(arr) { return shuffle(arr).slice(0, 10); }

  function saveProgress() {
    const lv = GAME_DATA.levels[state.levelIndex];
    const key = `amq_level_${lv.id}`;
    const prev = JSON.parse(localStorage.getItem(key) || '{}');
    const accuracy = Math.round(state.correctCount / state.questions.length * 100);
    if ((state.score > (prev.score || 0))) {
      localStorage.setItem(key, JSON.stringify({
        score: state.score, accuracy, stars: calcStars(accuracy),
        unlocked: true
      }));
    }
    // Unlock next
    const nextLv = GAME_DATA.levels[state.levelIndex + 1];
    if (nextLv && accuracy >= lv.minScore) {
      const nk = `amq_level_${nextLv.id}`;
      const nPrev = JSON.parse(localStorage.getItem(nk) || '{}');
      if (!nPrev.unlocked) localStorage.setItem(nk, JSON.stringify({ unlocked: true, score: 0, accuracy: 0, stars: 0 }));
    }
  }

  function getLevelSave(levelId) {
    return JSON.parse(localStorage.getItem(`amq_level_${levelId}`) || 'null');
  }
  function isUnlocked(levelId) {
    if (levelId === 1) return true;
    const s = getLevelSave(levelId);
    return s && s.unlocked;
  }

  function calcStars(accuracy) {
    if (accuracy >= 85) return 3;
    if (accuracy >= 70) return 2;
    if (accuracy >= 60) return 1;
    return 0;
  }

  // ── Answer checking ────────────────────────────────────────
  function normalise(str) {
    return str.trim().toLowerCase()
      .replace(/\$/g, '')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}°]/g, '')
      .replace(/\s*(mph|km\/h|m\/s|days?|hours?|hrs?|mins?|minutes?|secs?|seconds?)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function evalFraction(str) {
    const m = str.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    return NaN;
  }

  function checkAnswer(userRaw, question) {
    const user = normalise(userRaw);
    for (const ans of question.answers) {
      if (user === ans) return true;
      // numeric tolerance
      const uNum = parseFloat(user),  aNum = parseFloat(ans);
      if (!isNaN(uNum) && !isNaN(aNum) && Math.abs(uNum - aNum) < 0.01) return true;
      // fraction vs decimal
      const uFrac = evalFraction(user), aFrac = evalFraction(ans);
      if (!isNaN(uFrac) && !isNaN(aNum)  && Math.abs(uFrac - aNum)  < 0.01) return true;
      if (!isNaN(aFrac) && !isNaN(uNum)  && Math.abs(uNum  - aFrac) < 0.01) return true;
      // partial keyword match for long textual answers
      if (ans.length > 6 && user.length > 3 && ans.includes(user)) return true;
    }
    return false;
  }

  // ── Timer ─────────────────────────────────────────────────
  function startTimer(seconds) {
    clearInterval(state.timerInterval);
    state.timerSecs = seconds;
    renderTimer();
    state.timerInterval = setInterval(() => {
      state.timerSecs--;
      renderTimer();
      if (state.timerSecs <= 5 && state.timerSecs > 0) Audio.timerUrgent();
      if (state.timerSecs <= 0) {
        clearInterval(state.timerInterval);
        onTimeUp();
      }
    }, 1000);
  }

  function stopTimer() { clearInterval(state.timerInterval); state.timerInterval = null; }

  function renderTimer() {
    const el = $('timer-display');
    if (!el) return;
    const lv = GAME_DATA.levels[state.levelIndex];
    if (!lv.timer) { el.textContent = ''; el.className = 'timer'; return; }
    el.textContent = `${t('timerLabel')} ${state.timerSecs}${t('seconds')}`;
    el.className = 'timer' + (state.timerSecs <= 10 ? ' timer-urgent' : '');
  }

  function onTimeUp() {
    // Treat as wrong — no score, reset streak
    Audio.wrong();
    state.streak = 0;
    StreakViz.update(0);
    showFeedback(false, true);
    Archimedes.onWrong();
    setTimeout(nextQuestion, 1800);
  }

  // ── Screens ────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id);
    if (el) { el.classList.add('active'); }
  }

  // ── Home screen ────────────────────────────────────────────
  function buildHomeScreen() {
    const container = $('level-cards');
    if (!container) return;
    container.innerHTML = '';
    GAME_DATA.levels.forEach((lv, i) => {
      const save    = getLevelSave(lv.id);
      const locked  = !isUnlocked(lv.id);
      const stars   = save ? save.stars : 0;
      const best    = save ? save.score : 0;

      const card = document.createElement('div');
      card.className = 'level-card' + (locked ? ' locked' : '');
      card.setAttribute('data-level', i);
      card.innerHTML = `
        <div class="level-numeral">${['I','II','III','IV'][i]}</div>
        <div class="level-name">${lv.name}</div>
        <div class="level-subtitle">${lv.subtitle}</div>
        <div class="level-stars">
          ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}
        </div>
        ${locked
          ? `<div class="level-lock">🔒 ${t('levelLocked')}</div>`
          : (best > 0 ? `<div class="level-best">${t('bestScore')}: ${best}</div>` : '')
        }
        ${lv.timer ? `<div class="level-timer-badge">⏱ ${lv.timer}${t('seconds')}/Q</div>` : `<div class="level-timer-badge">∞ No Timer</div>`}
      `;
      if (!locked) {
        card.addEventListener('click', () => startLevel(i));
      }
      container.appendChild(card);
    });
  }

  // ── Start level ────────────────────────────────────────────
  function startLevel(levelIndex) {
    state.levelIndex      = levelIndex;
    state.questions       = pick10(GAME_DATA.levels[levelIndex].problems);
    state.qIndex          = 0;
    state.score           = 0;
    state.correctCount    = 0;
    state.hintUsed        = false;
    state.skipsLeft       = 2;
    state.streak          = 0;
    state.maxStreak       = 0;
    state.categoryResults = {};
    state.levelStartTime  = Date.now();

    StreakViz.reset();
    showScreen('screen-game');
    renderGameHeader();
    Archimedes.greet(GAME_DATA.levels[levelIndex].name);
    setTimeout(() => loadQuestion(), 1000);
  }

  // ── Game header ────────────────────────────────────────────
  function renderGameHeader() {
    const lv = GAME_DATA.levels[state.levelIndex];
    const nameEl = $('game-level-name');
    if (nameEl) nameEl.textContent = `${['I','II','III','IV'][state.levelIndex]}. ${lv.name}`;
    updateProgress();
    updateScore();
  }

  function updateProgress() {
    const dots = $('progress-dots');
    const counter = $('question-counter');
    if (!dots) return;
    dots.innerHTML = '';
    for (let i = 0; i < state.questions.length; i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i < state.qIndex ? ' done' : '') + (i === state.qIndex ? ' current' : '');
      dots.appendChild(d);
    }
    if (counter) counter.textContent = t('questionOf', state.qIndex + 1, state.questions.length);
  }

  function updateScore() {
    const el = $('game-score');
    if (el) el.textContent = `${t('score')}: ${state.score}`;
  }

  // ── Load question ──────────────────────────────────────────
  function loadQuestion() {
    if (state.qIndex >= state.questions.length) { endLevel(); return; }

    const q    = state.questions[state.qIndex];
    const lv   = GAME_DATA.levels[state.levelIndex];
    state.hintUsed     = false;
    state.questionStart = Date.now();

    // Type badge
    const typeEl = $('problem-type');
    if (typeEl) typeEl.textContent = q.type;

    // Render LaTeX problem
    const problemEl = $('problem-text');
    if (problemEl) {
      problemEl.innerHTML = '';
      renderMath(q.problem, problemEl);
    }

    // Reset hint button
    const hintBtn = $('btn-hint');
    if (hintBtn) {
      hintBtn.textContent = t('hint');
      hintBtn.disabled    = false;
      hintBtn.classList.remove('used');
    }

    // Reset feedback
    const fb = $('answer-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'answer-feedback'; }

    // Clear input
    const inp = $('answer-input');
    if (inp) { inp.value = ''; inp.focus(); inp.disabled = false; }

    // Update progress
    updateProgress();
    updateScore();

    // Timer
    if (lv.timer) startTimer(lv.timer);
    else { stopTimer(); renderTimer(); }

    // Skip button
    const skipBtn = $('btn-skip');
    if (skipBtn) {
      skipBtn.textContent = `${t('skip')} (${state.skipsLeft})`;
      skipBtn.disabled = state.skipsLeft <= 0;
    }

    // Archimedes idle
    Archimedes.idle();
    Archimedes.silence();
  }

  // ── Render math ────────────────────────────────────────────
  function renderMath(text, container) {
    // Regex: match $...$ but allow \$ (escaped dollar) inside the expression.
    // (?:[^$\\]|\\.)* means: any char that is NOT $ or \, OR a backslash + any char.
    // This correctly handles currency like $\$20$ without breaking on the inner $.
    const mathRegex = /(\$(?:[^$\\]|\\.)*\$)/g;
    const parts = text.split(mathRegex);

    parts.forEach(part => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const span = document.createElement('span');
        const latex = part.slice(1, -1);
        try {
          katex.render(latex, span, { throwOnError: false, displayMode: false });
        } catch(e) {
          // Fallback: show readable version without LaTeX markers
          span.textContent = latex.replace(/\\[$]/g, '$').replace(/\\\\/g, '');
        }
        container.appendChild(span);
      } else if (part) {
        container.appendChild(document.createTextNode(part));
      }
    });
  }


  // ── Submit ─────────────────────────────────────────────────
  function submitAnswer() {
    const inp = $('answer-input');
    if (!inp || !inp.value.trim()) return;
    const q       = state.questions[state.qIndex];
    const correct = checkAnswer(inp.value, q);
    const elapsed = Math.round((Date.now() - state.questionStart) / 1000);
    state.totalElapsed += elapsed;

    // Category tracking
    if (!state.categoryResults[q.type]) state.categoryResults[q.type] = { correct: 0, total: 0 };
    state.categoryResults[q.type].total++;

    if (correct) {
      // Scoring
      const lv = GAME_DATA.levels[state.levelIndex];
      const timeBonus = lv.timer ? Math.max(0, lv.timer - elapsed) * 2 : Math.max(0, 30 - elapsed) * 1;
      const hintPenalty = state.hintUsed ? 15 : 0;
      const qScore = Math.max(10, 100 + timeBonus - hintPenalty);
      state.score        += qScore;
      state.correctCount++;
      state.streak++;
      state.maxStreak     = Math.max(state.maxStreak, state.streak);
      state.categoryResults[q.type].correct++;

      StreakViz.update(state.streak);
      showFeedback(true, false, qScore);
      Archimedes.onCorrect();
      Audio.correct();
      updateScore();

      stopTimer();
      inp.disabled = true;
      setTimeout(nextQuestion, 1600);
    } else {
      state.streak = 0;
      StreakViz.update(0);
      showFeedback(false, false);
      Archimedes.onWrong();
      Audio.wrong();
      // Shake input
      inp.classList.add('shake');
      setTimeout(() => inp.classList.remove('shake'), 500);
      inp.value = '';
      inp.focus();
    }
  }

  function showFeedback(correct, timedOut, qScore) {
    const fb = $('answer-feedback');
    if (!fb) return;
    if (timedOut) {
      fb.textContent = '⏰ Time up!';
      fb.className   = 'answer-feedback wrong';
    } else if (correct) {
      fb.textContent = `✓ +${qScore} pts`;
      fb.className   = 'answer-feedback correct';
    } else {
      fb.textContent = '✗ Try again';
      fb.className   = 'answer-feedback wrong';
    }
  }

  // ── Hint ───────────────────────────────────────────────────
  function useHint() {
    if (state.hintUsed) return;
    const q = state.questions[state.qIndex];
    state.hintUsed = true;
    const hintBtn = $('btn-hint');
    if (hintBtn) { hintBtn.textContent = t('hintUsed'); hintBtn.disabled = true; hintBtn.classList.add('used'); }
    Archimedes.onHint(q.hint);
    Audio.hint();
  }

  // ── Skip ───────────────────────────────────────────────────
  function skipQuestion() {
    if (state.skipsLeft <= 0) return;
    state.skipsLeft--;
    state.score = Math.max(0, state.score - 50);
    state.streak = 0;
    StreakViz.update(0);
    stopTimer();
    updateScore();
    nextQuestion();
  }

  // ── Next question ──────────────────────────────────────────
  function nextQuestion() {
    state.qIndex++;
    loadQuestion();
  }

  // ── End level ──────────────────────────────────────────────
  function endLevel() {
    stopTimer();
    const accuracy = Math.round(state.correctCount / state.questions.length * 100);
    const passed   = accuracy >= GAME_DATA.levels[state.levelIndex].minScore;
    saveProgress();

    if (passed) {
      buildRewardScreen(accuracy);
      showScreen('screen-reward');
      setTimeout(() => {
        Rewards.startConfetti();
        Archimedes.celebrate();
        Audio.levelComplete();
        Rewards.showReward(calcStars(accuracy));
      }, 400);
    } else {
      buildFailScreen(accuracy);
      showScreen('screen-fail');
      Archimedes.disappoint();
    }
  }

  function calcStars(acc) {
    if (acc >= 85) return 3;
    if (acc >= 70) return 2;
    if (acc >= 60) return 1;
    return 0;
  }

  // ── Reward screen ──────────────────────────────────────────
  function buildRewardScreen(accuracy) {
    const lv    = GAME_DATA.levels[state.levelIndex];
    const stars = calcStars(accuracy);
    const elapsed = Math.round((Date.now() - state.levelStartTime) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    // Badge
    const badgeEl = $('badge-display');
    if (badgeEl) {
      badgeEl.innerHTML = `
        <div id="badge-icon" class="badge-icon">${lv.badgeIcon}</div>
        <div class="badge-name">${lv.badge}</div>
      `;
    }

    // Score card
    const scoreEl = $('score-card');
    if (scoreEl) {
      scoreEl.innerHTML = `
        <div class="reward-stars">
          <span class="reward-star"></span>
          <span class="reward-star"></span>
          <span class="reward-star"></span>
        </div>
        <div class="reward-stat">${t('score')}: <strong>${state.score}</strong></div>
        <div class="reward-stat">${t('accuracy')}: <strong>${accuracy}%</strong></div>
        <div class="reward-stat">${t('timeTaken')}: <strong>${mm}:${ss}</strong></div>
        <div class="reward-stat">Max Streak: <strong>${state.maxStreak} 🔥</strong></div>
      `;
    }

    // Category breakdown
    const catEl = $('category-breakdown');
    if (catEl) {
      catEl.innerHTML = `<h3>${t('strengths')}</h3>`;
      const sorted = Object.entries(state.categoryResults)
        .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));
      sorted.forEach(([type, res]) => {
        const pct = Math.round(res.correct / res.total * 100);
        let icon = pct === 100 ? '🏅' : pct >= 70 ? '✅' : '⚠️';
        catEl.innerHTML += `
          <div class="cat-row">
            <span class="cat-icon">${icon}</span>
            <span class="cat-name">${type}</span>
            <div class="cat-bar">
              <div class="cat-bar-fill" data-pct="${pct}" style="width:0%"></div>
            </div>
            <span class="cat-pct">${pct}%</span>
          </div>`;
      });
    }

    // Lore
    const loreEl = $('lore-card');
    if (loreEl && lv.lore) {
      loreEl.innerHTML = `
        <div class="lore-label">${t('loreUnlocked')}</div>
        <div class="lore-title">${lv.lore.title}</div>
        <div class="lore-content">${lv.lore.content}</div>
        <div class="lore-author">${lv.lore.author}</div>
      `;
    }

    // Next level button
    const nextBtn = $('btn-next-level');
    const nextLv  = GAME_DATA.levels[state.levelIndex + 1];
    if (nextBtn) {
      if (nextLv) {
        nextBtn.style.display = '';
        nextBtn.textContent   = t('nextLevel');
      } else {
        nextBtn.style.display = 'none';
      }
    }
  }

  // ── Fail screen ────────────────────────────────────────────
  function buildFailScreen(accuracy) {
    const el = $('fail-content');
    if (!el) return;
    el.innerHTML = `
      <h2 class="fail-title">Not Quite, Scholar</h2>
      <p class="fail-accuracy">${t('accuracy')}: ${accuracy}%</p>
      <p class="fail-message">${t('failMessage')}</p>
      <div class="fail-actions">
        <button id="btn-retry" class="btn-primary">${t('tryAgain')}</button>
        <button id="btn-fail-home" class="btn-secondary">${t('home')}</button>
      </div>`;
    $('btn-retry')     ?.addEventListener('click', () => startLevel(state.levelIndex));
    $('btn-fail-home') ?.addEventListener('click', () => { showScreen('screen-home'); buildHomeScreen(); });
  }

  // Language toggle handler — also updates mid-game UI
  function updateUIStrings() {
    // Header buttons
    const sc = $('btn-sound');
    if (sc) sc.textContent = Audio.isMuted() ? t('soundOff') : t('soundOn');

    // Game screen (only if active)
    const hintBtn = $('btn-hint');
    if (hintBtn && !hintBtn.classList.contains('used')) hintBtn.textContent = t('hint');
    if (hintBtn &&  hintBtn.classList.contains('used')) hintBtn.textContent = t('hintUsed');

    const skipBtn = $('btn-skip');
    if (skipBtn) skipBtn.textContent = `${t('skip')} (${state.skipsLeft})`;

    const submitBtn = $('btn-submit');
    if (submitBtn) submitBtn.textContent = t('submit');

    const inp = $('answer-input');
    if (inp) inp.placeholder = t('placeholder');

    updateScore();
    updateProgress();
    renderTimer();
  }

  return {
    init() {
      if (!getLevelSave(1)) localStorage.setItem('amq_level_1', JSON.stringify({ unlocked: true, score: 0, accuracy: 0, stars: 0 }));

      buildHomeScreen();
      showScreen('screen-home');
      Archimedes.init();

      setTimeout(() => {
        const homeText = getLang() === 'en'
          ? "Welcome to Puzzle Parthenon! I am Archimedes, your game master. Complete the first level to unlock the next. Choose your trial to begin. Click on the hint button to ask for my help"
          : "পাজল পার্থেননে স্বাগতম! আমি আর্কিমিডিস, তোমার গেম মাস্টার। পরবর্তী স্তর খুলতে প্রথম স্তরটি শেষ করো। তোমার পরীক্ষা বেছে নাও। 'hint' বাটনে ক্লিক করলে আমি তোমাকে সাহায্য করবো।";
        Archimedes.speakHome(homeText, 40);
      }, 500);

      $('answer-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitAnswer(); });
      $('btn-submit')  ?.addEventListener('click',   () => submitAnswer());
      $('btn-hint')    ?.addEventListener('click',   () => useHint());
      $('btn-skip')    ?.addEventListener('click',   () => skipQuestion());
      $('btn-home')    ?.addEventListener('click',   () => { stopTimer(); showScreen('screen-home'); buildHomeScreen(); });
      $('btn-next-level')?.addEventListener('click', () => { Rewards.stopConfetti(); startLevel(state.levelIndex + 1); });
      $('btn-home-reward')?.addEventListener('click', () => { Rewards.stopConfetti(); showScreen('screen-home'); buildHomeScreen(); });

      const sc = $('streak-canvas');
      if (sc) StreakViz.init(sc);
      Rewards.init();
      initStarfield();

      $('btn-sound')?.addEventListener('click', () => {
        const m = !Audio.isMuted();
        Audio.setMuted(m);
        $('btn-sound').textContent = m ? t('soundOff') : t('soundOn');
      });

      $('btn-theme')?.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        $('btn-theme').textContent = isDark ? t('lightMode') : t('darkMode');
        localStorage.setItem('amq_theme', isDark ? 'light' : 'dark');
      });

      $('btn-lang')?.addEventListener('click', () => {
        const newLang = getLang() === 'en' ? 'bn' : 'en';
        setLang(newLang);
        $('btn-lang').textContent = t('lang');
        localStorage.setItem('amq_lang', newLang);
        buildHomeScreen();
        updateUIStrings();
        // Update home greeting
        const homeText = $('home-speech-text');
        if (homeText) homeText.textContent = getLang() === 'en'
          ? 'Greetings, Scholar. The path to mastery awaits. Choose your trial.'
          : 'শুভেচ্ছা, পণ্ডিত। জ্ঞানের পথ অপেক্ষা করছে। তোমার পরীক্ষা বেছে নাও।';
      });

      const savedTheme = localStorage.getItem('amq_theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        $('btn-theme').textContent = savedTheme === 'dark' ? t('darkMode') : t('lightMode');
      }
      const savedLang = localStorage.getItem('amq_lang');
      if (savedLang) { setLang(savedLang); $('btn-lang').textContent = t('lang'); }
    }
  };

})(); // end Game IIFE

// ── Starfield ────────────────────────────────────────────────
function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({length: 160}, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.4 + Math.random() * 1.4,
    a: Math.random(), da: 0.003 + Math.random() * 0.008
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a += s.da;
      const alpha = 0.3 + 0.7 * Math.abs(Math.sin(s.a));
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,220,160,${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

window.addEventListener('DOMContentLoaded', () => Game.init());
