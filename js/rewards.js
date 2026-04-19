// rewards.js — Confetti canvas + badge + star animations
const Rewards = (() => {
  let canvas, ctx, particles = [], rafId = null;

  // ── Confetti ──────────────────────────────────────────────
  const COLORS = ['#f0c040','#ffffff','#2ecc71','#f39c12','#e8d5a3','#5ba3e0'];

  function createParticle() {
    return {
      x:    Math.random() * window.innerWidth,
      y:    -10,
      w:    6 + Math.random() * 8,
      h:    3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx:   (Math.random() - 0.5) * 4,
      vy:   2 + Math.random() * 3,
      rot:  Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      life: 1.0,
    };
  }

  function spawnBurst(count = 200) {
    for (let i = 0; i < count; i++) {
      const p = createParticle();
      // Spread from center-top area
      p.x = window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6;
      particles.push(p);
    }
  }

  function stepParticles() {
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.07;        // gravity
      p.vx *= 0.99;        // drag
      p.rot += p.rotV;
      p.life -= 0.006;
    });
    particles = particles.filter(p => p.life > 0 && p.y < window.innerHeight + 20);
  }

  function drawParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
  }

  function confettiLoop() {
    stepParticles();
    drawParticles();
    if (particles.length > 0) {
      rafId = requestAnimationFrame(confettiLoop);
    } else {
      stopConfetti();
    }
  }

  function stopConfetti() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Stars animation ────────────────────────────────────────
  function animateStars(count) {
    const stars = document.querySelectorAll('.reward-star');
    stars.forEach((s, i) => {
      s.classList.remove('filled', 'pop');
      if (i < count) {
        setTimeout(() => { s.classList.add('filled'); setTimeout(() => s.classList.add('pop'), 50); }, i * 350);
      }
    });
  }

  // ── Badge animation ────────────────────────────────────────
  function animateBadge() {
    const badge = document.getElementById('badge-icon');
    if (!badge) return;
    badge.classList.remove('badge-pop');
    void badge.offsetWidth;  // reflow
    badge.classList.add('badge-pop');
  }

  // ── Category bars ─────────────────────────────────────────
  function animateBars() {
    document.querySelectorAll('.cat-bar-fill').forEach(bar => {
      const target = bar.dataset.pct;
      bar.style.width = '0%';
      setTimeout(() => { bar.style.width = target + '%'; }, 300);
    });
  }

  return {
    init() {
      canvas = document.getElementById('confetti-canvas');
      if (canvas) {
        ctx = canvas.getContext('2d');
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        window.addEventListener('resize', () => {
          canvas.width  = window.innerWidth;
          canvas.height = window.innerHeight;
        });
      }
    },

    startConfetti() {
      stopConfetti();
      particles = [];
      spawnBurst(220);
      // Second burst for drama
      setTimeout(() => spawnBurst(120), 600);
      rafId = requestAnimationFrame(confettiLoop);
    },

    stopConfetti,

    showReward(stars) {
      animateBadge();
      animateStars(stars);
      setTimeout(animateBars, 500);
    }
  };
})();
