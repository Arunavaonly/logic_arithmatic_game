// audio.js — Web Audio API synthesised sounds (no files needed)
const Audio = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, type, start, duration, gainVal, rampDown = true) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(gainVal, c.currentTime + start);
    if (rampDown) gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.01);
  }

  return {
    setMuted(m) { muted = m; },
    isMuted() { return muted; },

    correct() {
      if (muted) return;
      // Rising two-note chime C5 → E5
      tone(523, 'sine', 0,    0.18, 0.35);
      tone(659, 'sine', 0.15, 0.28, 0.35);
    },

    wrong() {
      if (muted) return;
      // Soft low thud
      tone(140, 'sine',   0,    0.25, 0.25);
      tone(110, 'square', 0,    0.12, 0.08);
    },

    hint() {
      if (muted) return;
      // Gentle soft ding
      tone(880, 'sine', 0, 0.3, 0.15);
    },

    levelComplete() {
      if (muted) return;
      // Ascending 4-note fanfare
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(f, 'sine', i * 0.18, 0.35, 0.3));
    },

    tick() {
      if (muted) return;
      // Timer warning tick
      tone(880, 'square', 0, 0.05, 0.08);
    },

    timerUrgent() {
      if (muted) return;
      tone(1200, 'square', 0, 0.06, 0.12);
    }
  };
})();
