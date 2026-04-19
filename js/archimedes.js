// archimedes.js — Character controller: states, speech bubble, typewriter
const Archimedes = (() => {
  let speechEl = null;
  let charEls = {};   // keyed by container id
  let typeTimer = null;
  let currentState = 'idle';

  const STATES = ['idle', 'thinking', 'celebrating', 'disappointed'];

  function setCharState(state) {
    currentState = state;
    document.querySelectorAll('.archimedes-figure').forEach(el => {
      STATES.forEach(s => el.classList.remove('state-' + s));
      el.classList.add('state-' + state);
    });
  }

  function typewrite(el, text, speed = 28, onDone) {
    if (typeTimer) clearInterval(typeTimer);
    el.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(typeTimer);
        typeTimer = null;
        if (onDone) onDone();
      }
    }, speed);
  }

  function speak(text, state = null, speed = 28) {
    if (state) setCharState(state);
    const bubble = document.getElementById('speech-bubble');
    const textEl  = document.getElementById('speech-text');
    if (!bubble || !textEl) return;
    bubble.classList.add('visible');
    typewrite(textEl, text, speed);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function stripLatex(text) {
    return text
      .replace(/\$([^$]+)\$/g, '$1')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
      .replace(/\\dots/g, '...')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[{}]/g, '')
      .trim();
  }

  return {
    init() {
      setCharState('idle');
    },

    idle() { setCharState('idle'); },

    speakHome(text, speed = 40) {
      const bubble = document.getElementById('home-speech-bubble');
      const textEl  = document.getElementById('home-speech-text');
      if (!bubble || !textEl) return;
      bubble.classList.add('visible');
      typewrite(textEl, text, speed);
    },

    greet(levelName) {
      speak(t('levelStart', levelName), 'idle');
    },

    onCorrect() {
      speak(pickRandom(t('correct')), 'celebrating');
      setTimeout(() => setCharState('idle'), 2200);
    },

    onWrong() {
      speak(pickRandom(t('wrong')), 'disappointed');
      setTimeout(() => setCharState('idle'), 2000);
    },

    onHint(hintText) {
      const intro = pickRandom(t('hintIntro'));
      speak(intro + ' ' + stripLatex(hintText), 'thinking');
    },

    celebrate() {
      speak(pickRandom(t('archiCelebrate')), 'celebrating');
    },

    disappoint() {
      speak(pickRandom(t('archiDisappoint')), 'disappointed');
      setTimeout(() => setCharState('idle'), 3000);
    },

    silence() {
      const bubble = document.getElementById('speech-bubble');
      if (bubble) bubble.classList.remove('visible');
      if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
      setCharState('idle');
    }
  };
})();
