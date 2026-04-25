// js/rapidfire.js — Level 5: The Oracle's Trial
// AI-powered infinite rapid-fire elimination round via Groq (through Cloudflare Worker proxy)

const RapidFire = (() => {

  // ── Config ────────────────────────────────────────────────
  // In production: replace with your deployed Cloudflare Worker URL
  // For local dev: config.js sets window.GROQ_PROXY_URL = 'http://localhost:3001'
  const PROXY_URL = (typeof window !== 'undefined' && window.GROQ_PROXY_URL)
    || 'http://localhost:3001';

  // Level 5: no time constraint (intentionally relaxed for now)
  const TIMER_SECS    = 30; // kept for future use
  const HINT1_TRIGGER = 15; // kept for future use
  const HINT2_TRIGGER = 8;  // kept for future use

  // Both generation and evaluation use llama-3.3-70b-versatile
  const MODEL = 'llama-3.3-70b-versatile';

  const QUESTION_TYPES = [
    'lateral thinking puzzle',
    'mathematical reasoning requiring explanation',
    'logical deduction puzzle',
    'probability and reasoning puzzle',
    'abstract pattern recognition with justification',
    'real-world logic puzzle',
  ];

  // ── State ─────────────────────────────────────────────────
  const RF_RECENT_EN_KEY = 'amq_rf_recent_en_questions';
  /** Max questions kept in sessionStorage / sent to the model (prevents runaway prompt size). */
  const RF_HISTORY_CAP = 120;

  const state = {
    questionsAnswered: 0,
    score:             0,
    timerSecs:         TIMER_SECS,
    timerInterval:     null,
    currentQuestion:   null,  // { en: {type,question,hint1,hint2}, bn: {...} }
    hintsRevealed:     0,     // 0 = none, 1 = hint1 shown, 2 = both shown
    hint1Shown:        false,
    hint2Shown:        false,
    isEvaluating:      false,
    questionStartTime: 0,
    /** English question strings already shown this session (de-dupe for AI). */
    recentEnQuestions: [],
    reward: {
      isShowing: false,
    },
  };

  function readRfSessionJson(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw == null || raw === '') return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeRfSessionJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }

  function loadRecentQuestionsFromSession() {
    const arr = readRfSessionJson(RF_RECENT_EN_KEY, []);
    state.recentEnQuestions = Array.isArray(arr) ? arr.slice(-RF_HISTORY_CAP) : [];
  }

  function persistRecentQuestions() {
    writeRfSessionJson(RF_RECENT_EN_KEY, state.recentEnQuestions.slice(-RF_HISTORY_CAP));
  }

  function appendRecentEnglishQuestion(text) {
    const s = String(text || '').trim();
    if (!s) return;
    state.recentEnQuestions.push(s);
    if (state.recentEnQuestions.length > RF_HISTORY_CAP) state.recentEnQuestions.shift();
    persistRecentQuestions();
  }

  /** Compact numbered list of every prior English question for the model (full session history). */
  function formatFullQuestionHistoryForPrompt(list) {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!arr.length) return '';
    const lines = arr.map((q, i) => `${i + 1}. ${String(q).replace(/\s+/g, ' ').trim()}`);
    return lines.join('\n');
  }

  function normQSnippet(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 220);
  }

  function isQuestionTooSimilar(enText, recentList) {
    const n = normQSnippet(enText);
    if (n.length < 36) return false;
    return recentList.some((prev) => {
      const p = normQSnippet(prev);
      if (!p) return false;
      if (p === n) return true;
      if (n.includes(p) || p.includes(n)) return p.length > 40 || n.length > 40;
      const L = Math.min(n.length, p.length);
      if (L < 50) return false;
      let same = 0;
      for (let i = 0; i < L; i++) if (n[i] === p[i]) same++;
      return same / L > 0.88;
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id);
    if (el) el.classList.add('active');
    if (typeof Game !== 'undefined' && Game.syncHeaderHomeNav) Game.syncHeaderHomeNav();
  }

  // ── Reward animation (confetti + lore modal) ───────────────
  let rfCanvas = null;
  let rfCtx = null;
  let rfParticles = [];
  let rfRafId = null;
  const RF_COLORS = ['#f0c040', '#ffffff', '#2ecc71', '#f39c12', '#e8d5a3', '#5ba3e0', '#ff66cc'];

  function ensureRfConfettiCanvas() {
    if (document.getElementById('rf-confetti-canvas')) return;
    const c = document.createElement('canvas');
    c.id = 'rf-confetti-canvas';
    c.setAttribute('aria-hidden', 'true');
    c.style.position = 'fixed';
    c.style.inset = '0';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '1800';
    c.style.display = 'none';
    document.body.appendChild(c);
  }

  function initRfConfetti() {
    ensureRfConfettiCanvas();
    rfCanvas = document.getElementById('rf-confetti-canvas');
    if (!rfCanvas) return;
    rfCtx = rfCanvas.getContext('2d');

    const resize = () => {
      rfCanvas.width = window.innerWidth;
      rfCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  function rfCreateParticle() {
    return {
      x: Math.random() * window.innerWidth,
      y: -10,
      w: 5 + Math.random() * 9,
      h: 3 + Math.random() * 6,
      color: RF_COLORS[Math.floor(Math.random() * RF_COLORS.length)],
      vx: (Math.random() - 0.5) * 5,
      vy: 2 + Math.random() * 3.8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.25,
      life: 1.0,
    };
  }

  function rfSpawnBurst(count = 160) {
    for (let i = 0; i < count; i++) {
      const p = rfCreateParticle();
      // Spread from center-top area
      p.x = window.innerWidth * 0.15 + Math.random() * window.innerWidth * 0.7;
      rfParticles.push(p);
    }
  }

  function rfStepParticles() {
    rfParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.075;
      p.vx *= 0.99;
      p.rot += p.rotV;
      p.life -= 0.007;
    });
    rfParticles = rfParticles.filter(p => p.life > 0 && p.y < window.innerHeight + 30);
  }

  function rfDrawParticles() {
    if (!rfCtx || !rfCanvas) return;
    rfCtx.clearRect(0, 0, rfCanvas.width, rfCanvas.height);
    rfParticles.forEach(p => {
      rfCtx.save();
      rfCtx.globalAlpha = Math.max(0, p.life);
      rfCtx.translate(p.x, p.y);
      rfCtx.rotate(p.rot);
      rfCtx.fillStyle = p.color;
      rfCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      rfCtx.restore();
    });
  }

  function rfLoop() {
    rfStepParticles();
    rfDrawParticles();
    if (rfParticles.length > 0) {
      rfRafId = requestAnimationFrame(rfLoop);
    } else {
      rfStopConfetti();
    }
  }

  function rfStopConfetti() {
    if (rfRafId) { cancelAnimationFrame(rfRafId); rfRafId = null; }
    if (rfCtx && rfCanvas) rfCtx.clearRect(0, 0, rfCanvas.width, rfCanvas.height);
    if (rfCanvas) rfCanvas.style.display = 'none';
  }

  function rfStartConfetti() {
    initRfConfetti();
    if (!rfCanvas) return;
    rfStopConfetti();
    rfParticles = [];
    rfCanvas.style.display = 'block';
    rfSpawnBurst(190);
    setTimeout(() => rfSpawnBurst(90), 550);
    rfRafId = requestAnimationFrame(rfLoop);
  }

  function ensureRewardOverlay() {
    if (document.getElementById('rf-reward-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'rf-reward-overlay';
    overlay.className = 'rf-reward-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="rf-reward-box" role="dialog" aria-modal="true" aria-labelledby="rf-reward-title">
        <div class="rf-reward-crown">🏛️</div>
        <h2 id="rf-reward-title" class="rf-reward-title">Victory</h2>
        <div id="rf-reward-feedback" class="rf-reward-feedback"></div>
        <div id="rf-reward-lore" class="rf-reward-lore"></div>
        <div class="rf-reward-actions">
          <button id="rf-reward-next" class="btn-primary" type="button">Next Question →</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('rf-reward-next')?.addEventListener('click', () => {
      hideRewardOverlay();
      loadNextQuestion();
    });
  }

  function showRewardOverlay({ feedback, lore }) {
    ensureRewardOverlay();
    state.reward.isShowing = true;

    // Disable input while rewarding
    const inp = $('rf-answer-input'); if (inp) inp.disabled = true;
    const submitBtn = $('rf-btn-submit'); if (submitBtn) submitBtn.disabled = true;
    const hintBtn = $('rf-btn-hint'); if (hintBtn) hintBtn.disabled = true;

    const overlay = document.getElementById('rf-reward-overlay');
    const titleEl = document.getElementById('rf-reward-title');
    const fbEl = document.getElementById('rf-reward-feedback');
    const loreEl = document.getElementById('rf-reward-lore');

    const lang = getLang();
    if (titleEl) titleEl.textContent = lang === 'en' ? 'TRIUMPH' : 'বিজয়';
    if (fbEl) fbEl.textContent = String(feedback || '');

    if (loreEl) {
      const pickedLore = (lore && lore.title && lore.content && lore.author)
        ? lore
        : (() => {
          const rf = (typeof GAME_DATA !== 'undefined' && GAME_DATA.levels)
            ? GAME_DATA.levels.find(lv => lv && lv.isRapidFire)
            : null;
          const lores = (rf && Array.isArray(rf.lore)) ? rf.lore : [];
          return lores.length ? lores[Math.floor(Math.random() * lores.length)] : null;
        })();

      loreEl.innerHTML = pickedLore ? `
        <div class="lore-label">${t('loreUnlocked')}</div>
        <div class="lore-title">${pickedLore.title}</div>
        <div class="lore-content">${pickedLore.content}</div>
        <div class="lore-author">${pickedLore.author}</div>
      ` : '';
    }

    // Add a little pop animation on the question card
    const card = $('rf-question-card');
    if (card) {
      card.classList.remove('rf-win-pop');
      void card.offsetWidth;
      card.classList.add('rf-win-pop');
    }

    rfStartConfetti();
    if (overlay) overlay.style.display = 'flex';
  }

  function hideRewardOverlay() {
    const overlay = document.getElementById('rf-reward-overlay');
    if (overlay) overlay.style.display = 'none';
    rfStopConfetti();
    state.reward.isShowing = false;
  }

  function ensureEliminationOverlay() {
    if (document.getElementById('rf-elim-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'rf-elim-overlay';
    overlay.className = 'rf-elim-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="rf-elim-box" role="dialog" aria-modal="true" aria-labelledby="rf-elim-title">
        <div class="rf-elim-bolt">⚡</div>
        <h2 id="rf-elim-title" class="rf-elim-title">ELIMINATED</h2>
        <div id="rf-elim-feedback" class="rf-elim-feedback"></div>
        <div class="rf-elim-actions">
          <button id="rf-elim-retry" class="btn-primary" type="button">⚡ Try Again</button>
          <button id="rf-elim-home" class="btn-secondary" type="button">🏠 Home</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('rf-elim-retry')?.addEventListener('click', () => {
      hideEliminationOverlay();
      beginRound();
    });
    document.getElementById('rf-elim-home')?.addEventListener('click', () => {
      hideEliminationOverlay();
      showScreen('screen-home');
      if (typeof Game !== 'undefined' && Game.rebuildHome) Game.rebuildHome();
    });
  }

  function showEliminationOverlay(feedback) {
    ensureEliminationOverlay();

    // Erase question + answer UI
    state.currentQuestion = null;
    stopTimer();

    const qText = $('rf-question-text'); if (qText) qText.textContent = '';
    const badge = $('rf-type-badge'); if (badge) badge.textContent = '';
    const h1 = $('rf-hint1'); if (h1) { h1.style.display = 'none'; h1.textContent = ''; }
    const h2 = $('rf-hint2'); if (h2) { h2.style.display = 'none'; h2.textContent = ''; }
    const inp = $('rf-answer-input'); if (inp) { inp.value = ''; inp.disabled = true; }
    const submitBtn = $('rf-btn-submit'); if (submitBtn) submitBtn.disabled = true;
    const hintBtn = $('rf-btn-hint'); if (hintBtn) hintBtn.disabled = true;

    showLoading(false);
    showFeedback('', '');

    const overlay = document.getElementById('rf-elim-overlay');
    const fb = document.getElementById('rf-elim-feedback');
    const lang = getLang();
    const title = document.getElementById('rf-elim-title');
    if (title) title.textContent = lang === 'en' ? 'ELIMINATED' : 'বাদ পড়েছ';
    if (fb) fb.textContent = String(feedback || '');
    if (overlay) overlay.style.display = 'flex';
  }

  function hideEliminationOverlay() {
    const overlay = document.getElementById('rf-elim-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function extractFirstJsonObject(text) {
    const s = String(text || '');
    const start = s.indexOf('{');
    if (start < 0) return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
    return null;
  }

  function parseModelJson(raw) {
    const cleaned = String(raw || '')
      .trim()
      // Strip markdown code fences if the model adds them
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const candidate = extractFirstJsonObject(cleaned) || cleaned;

    try {
      return JSON.parse(candidate);
    } catch (e1) {
      // Common model issues: smart quotes, trailing commas
      const repaired = candidate
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1');
      try {
        return JSON.parse(repaired);
      } catch (e2) {
        const snippet = repaired.slice(0, 1800);
        const err = new Error(`Invalid JSON from model. ${e2.message}\n---\n${snippet}\n---`);
        err.cause = e2;
        throw err;
      }
    }
  }

  // ── Entry point (called from reward screen / home when entering Level V) ──
  function promptContinue() {
    const modal = $('rf-continue-modal');
    if (modal) modal.style.display = 'flex';
  }

  // ── Begin the round ───────────────────────────────────────
  function beginRound() {
    if (typeof Game !== 'undefined' && Game.isLevelUnlocked && !Game.isLevelUnlocked(5)) {
      const modal = $('rf-continue-modal');
      if (modal) modal.style.display = 'none';
      showScreen('screen-home');
      if (typeof Game !== 'undefined' && Game.rebuildHome) Game.rebuildHome();
      return;
    }

    ensureEliminationOverlay();
    ensureRewardOverlay();
    initRfConfetti();

    const modal = $('rf-continue-modal');
    if (modal) modal.style.display = 'none';

    hideEliminationOverlay();
    hideRewardOverlay();
    loadRecentQuestionsFromSession();
    state.questionsAnswered = 0;
    state.score             = 0;
    state.currentQuestion   = null;

    showScreen('screen-rapidfire');
    updateStats();
    loadNextQuestion();
  }

  // ── Load & generate a question ────────────────────────────
  async function loadNextQuestion() {
    state.hint1Shown    = false;
    state.hint2Shown    = false;
    state.isEvaluating  = false;

    const inp = $('rf-answer-input');
    if (inp) { inp.value = ''; inp.disabled = false; }

    const fb = $('rf-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'rf-feedback'; }

    const h1 = $('rf-hint1'); if (h1) { h1.style.display = 'none'; h1.classList.remove('hint-reveal'); }
    const h2 = $('rf-hint2'); if (h2) { h2.style.display = 'none'; h2.classList.remove('hint-reveal'); }

    const hintBtn = $('rf-btn-hint');
    if (hintBtn) { hintBtn.textContent = '💡 Hint'; hintBtn.disabled = false; hintBtn.classList.remove('used'); }

    state.hintsRevealed = 0;
    state.hint1Shown    = false;
    state.hint2Shown    = false;

    const submitBtn = $('rf-btn-submit');
    if (submitBtn) submitBtn.disabled = false;

    showLoading(true);

    try {
      let q = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        q = await generateQuestion(attempt);
        const enQ = q?.en?.question || '';
        if (!isQuestionTooSimilar(enQ, state.recentEnQuestions)) break;
      }
      state.currentQuestion = q;
      if (q?.en?.question) appendRecentEnglishQuestion(q.en.question);
      showLoading(false);
      renderQuestion(q);
      // No time constraint in Level 5 (for now)
    } catch (err) {
      showLoading(false);
      showFeedback('⚠️ Failed to load question. Check Worker is running.', 'rf-error');
      console.error('RapidFire generateQuestion error:', err);
    }
  }

  // ── Groq: generate bilingual question ────────────────────
  async function generateQuestion(retryAttempt = 0) {
    const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const fullHistory = [...state.recentEnQuestions];
    const historyText = formatFullQuestionHistoryForPrompt(fullHistory);
    const historyBlock = historyText.length
      ? `\n\n═══ COMPLETE LIST OF ENGLISH QUESTIONS ALREADY ASKED THIS SESSION ═══\n`
      + `There are ${fullHistory.length} prior question(s). The model MUST read every line below.\n`
      + `Hard rules:\n`
      + `- Your NEW "en.question" must NOT repeat, paraphrase, or lightly reskin ANY item below (same story, same numbers, same trick, same answer path, or same structure with different names).\n`
      + `- If a topic appears below, choose a DIFFERENT domain, mechanism, and numerical setup.\n`
      + `- Treat the list as forbidden territory except for tone/voice — the puzzle itself must be wholly fresh.\n`
      + (retryAttempt > 0 ? `- Retry ${retryAttempt}: previous output was rejected as too similar; be radically more different.\n` : '')
      + `\n${historyText}\n`
      + `═══ END OF PRIOR QUESTIONS ═══\n`
      : '\n\n(No prior questions in this session yet — invent any strong puzzle.)\n';

    const prompt = `You are Archimedes, master of logic and reasoning. Generate ONE challenging ${type} suitable for an advanced player.

The question MUST require the student to explain their reasoning in 2–4 sentences — not just give a single number or one-word answer.

Uniqueness: vary the setting, quantities, names, and logical twist compared to any prior questions in this session.
Freshness nonce (must influence details; do not ignore): ${nonce}
${historyBlock}

Return ONLY valid JSON (no markdown, no code fences, no extra text).
Rules: use double quotes for ALL keys/strings; DO NOT include trailing commas; if you use quotes inside a string, escape them like \\".
Use this EXACT structure:
{
  "en": {
    "type": "Logic",
    "question": "Full question in English with clear context",
    "hint1": "Subtle first hint that nudges without giving the answer",
    "hint2": "Stronger second hint that reveals the core approach"
  },
  "bn": {
    "type": "লজিক",
    "question": "Same question fully translated to Bangla",
    "hint1": "Same hint 1 in Bangla",
    "hint2": "Same hint 2 in Bangla"
  }
}`;

    const data = await callProxy({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.92,
      max_tokens: 700,
      // If supported by the API, force valid JSON output
      response_format: { type: 'json_object' },
    });

    const raw = data.choices[0].message.content.trim();
    return parseModelJson(raw);
  }

  // ── Groq: evaluate the user's answer ─────────────────────
  async function evaluateAnswer(userAnswer) {
    const lang = getLang();
    const q    = state.currentQuestion[lang];
    const langName = lang === 'en' ? 'English' : 'Bangla';

    const rfLevel = (typeof GAME_DATA !== 'undefined' && GAME_DATA.levels)
      ? GAME_DATA.levels.find(lv => lv && lv.isRapidFire)
      : null;
    const loreExamples = (rfLevel && Array.isArray(rfLevel.lore) ? rfLevel.lore : []).slice(0, 2);
    const loreExampleBlock = loreExamples.length
      ? `\n\nLore style examples from this game (imitate this tone/shape, do NOT copy verbatim):\n${JSON.stringify(loreExamples, null, 2)}`
      : '';

    const prompt = `You are a strict but fair examiner evaluating a student's answer to a logic puzzle.

Question: ${q.question}

Student's answer: "${userAnswer}"

Evaluation rules:
- The student must demonstrate correct reasoning
- Minor spelling or grammar errors are acceptable
- The core logic must be correct
- Be fair — if the student clearly understands the concept, mark as correct

If the answer is correct, also congratulate the student and unlock ONE short historical “lore” in the same style as the game's lore cards:
- title: 4–10 words
- content: 2–4 sentences, vivid but accurate, mythology/ancient-math vibe
- author: an attribution line starting with "— "
${loreExampleBlock}

Reply with ONLY valid JSON (no markdown, no extra text). Use this EXACT structure:
Correct:
{
  "result": "correct",
  "feedback": "Short encouraging message in ${langName}",
  "lore": { "title": "...", "content": "...", "author": "— ..." }
}
Incorrect:
{ "result": "incorrect", "feedback": "Brief explanation of the flaw in ${langName}" }`;

    const data = await callProxy({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 360,
      response_format: { type: 'json_object' },
    });

    const raw = data.choices[0].message.content.trim();
    return parseModelJson(raw);
  }

  // ── Call the Cloudflare Worker proxy ─────────────────────
  async function callProxy(payload) {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Worker responded ${res.status}`);
    }
    return res.json();
  }

  // ── Render question ───────────────────────────────────────
  function renderQuestion(q) {
    const lang = getLang();
    const lq   = q[lang];

    const badge = $('rf-type-badge');
    const text  = $('rf-question-text');
    const h1    = $('rf-hint1');
    const h2    = $('rf-hint2');

    if (badge) badge.textContent = lq.type;
    if (text)  text.textContent  = lq.question;
    // Hint text is pre-stored but hidden — revealed on button click
    if (h1)    h1.textContent    = `💡 ${lq.hint1}`;
    if (h2)    h2.textContent    = `💡💡 ${lq.hint2}`;

    updateStats();
    const inp = $('rf-answer-input');
    if (inp) inp.focus();
  }

  // ── Manual hint reveal (button-triggered) ─────────────────
  function showNextHint() {
    if (!state.currentQuestion) return;
    if (state.hintsRevealed >= 2) return;

    state.hintsRevealed++;
    const lang = getLang();
    const lq   = state.currentQuestion[lang];

    if (state.hintsRevealed === 1) {
      const h1 = $('rf-hint1');
      if (h1) {
        h1.textContent = `💡 ${lq.hint1}`;
        h1.style.display = 'block';
        requestAnimationFrame(() => h1.classList.add('hint-reveal'));
      }
      const hintBtn = $('rf-btn-hint');
      if (hintBtn) hintBtn.textContent = '💡💡 Hint 2';
    } else {
      const h2 = $('rf-hint2');
      if (h2) {
        h2.textContent = `💡💡 ${lq.hint2}`;
        h2.style.display = 'block';
        requestAnimationFrame(() => h2.classList.add('hint-reveal'));
      }
      const hintBtn = $('rf-btn-hint');
      if (hintBtn) {
        hintBtn.textContent = '✓ All Hints Used';
        hintBtn.disabled = true;
        hintBtn.classList.add('used');
      }
    }
  }

  // ── Timer ─────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    state.timerSecs = TIMER_SECS;
    state.questionStartTime = Date.now();
    renderTimer();

    state.timerInterval = setInterval(() => {
      state.timerSecs--;
      renderTimer();

      if (state.timerSecs <= 5 && state.timerSecs > 0) {
        if (typeof Audio !== 'undefined') Audio.timerUrgent?.();
      }
      if (state.timerSecs <= 0) {
        stopTimer();
        onTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function renderTimer() {
    const el = $('rf-timer');
    if (!el) return;
    el.textContent = `${state.timerSecs}s`;
    el.className = 'rf-timer'
      + (state.timerSecs <= 8  ? ' rf-timer-critical' :
         state.timerSecs <= 15 ? ' rf-timer-warning'  : '');
  }

  function onTimeUp() {
    const lang = getLang();
    showEliminationOverlay(lang === 'en'
      ? "⏰ Time's up! The Oracle did not receive your answer in time."
      : '⏰ সময় শেষ! ওরাকল সময়মতো তোমার উত্তর পাননি।');
  }

  // ── Submit answer ─────────────────────────────────────────
  async function submitAnswer() {
    if (state.isEvaluating) return;
    if (state.reward.isShowing) return;

    const inp = $('rf-answer-input');
    const answer = inp?.value?.trim() || '';

    if (answer.length < 5) {
      showFeedback(getLang() === 'en'
        ? '⚠️ Please write a more detailed answer.'
        : '⚠️ আরও বিস্তারিত উত্তর লেখো।', 'rf-warning');
      return;
    }

    state.isEvaluating = true;
    if (inp) inp.disabled = true;
    const submitBtn = $('rf-btn-submit');
    if (submitBtn) submitBtn.disabled = true;

    showFeedback(getLang() === 'en'
      ? '🔮 Archimedes is evaluating your reasoning…'
      : '🔮 আর্কিমিডিস তোমার উত্তর বিশ্লেষণ করছেন…', 'rf-evaluating');

    if (typeof Archimedes !== 'undefined') Archimedes.think?.();

    try {
      const result = await evaluateAnswer(answer);

      if (result.result === 'correct') {
        const qScore     = 100;
        state.score     += qScore;
        state.questionsAnswered++;

        showFeedback(`✓ ${result.feedback}  (+${qScore} pts)`, 'rf-correct');
        if (typeof Audio !== 'undefined') Audio.correct?.();
        if (typeof Archimedes !== 'undefined') Archimedes.celebrate?.();
        updateStats();

        // Reward overlay + lore unlock (then user proceeds)
        showRewardOverlay({ feedback: result.feedback, lore: result.lore });
      } else {
        if (typeof Audio !== 'undefined') Audio.wrong?.();
        if (typeof Archimedes !== 'undefined') Archimedes.onWrong?.();
        setTimeout(() => showEliminationOverlay(result.feedback), 250);
      }
    } catch (err) {
      console.error('RapidFire evaluateAnswer error:', err);
      state.isEvaluating = false;
      if (inp) inp.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      showFeedback('⚠️ Evaluation failed. Please try again.', 'rf-error');
    }
  }

  // ── Elimination ───────────────────────────────────────────
  // (Handled via modal overlay so it appears above everything.)

  // ── UI helpers ────────────────────────────────────────────
  function showLoading(show) {
    const loadEl = $('rf-loading');
    const cardEl = $('rf-question-card');
    if (loadEl) loadEl.style.display = show ? 'flex' : 'none';
    if (cardEl) cardEl.style.display = show ? 'none' : 'flex';
  }

  function showFeedback(msg, cls) {
    const el = $('rf-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className   = `rf-feedback ${cls || ''}`;
  }

  function updateStats() {
    const lang = getLang();
    const qEl  = $('rf-questions-count');
    const sEl  = $('rf-score-display');
    if (qEl) qEl.textContent = lang === 'en'
      ? `${state.questionsAnswered} Survived`
      : `${state.questionsAnswered} উত্তীর্ণ`;
    if (sEl) sEl.textContent = `${lang === 'en' ? 'Score' : 'স্কোর'}: ${state.score}`;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    promptContinue,
    beginRound,
    submitAnswer,
    showNextHint,
  };

})();
