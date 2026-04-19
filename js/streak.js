// streak.js — Geometric streak visualizer drawn on a Canvas
const StreakViz = (() => {
  let canvas, ctx, currentSides = 0, targetSides = 0;
  let animFrame = null, progress = 0;

  const STREAK_SHAPES = [
    { sides: 0,  color: 'transparent',              label: ''         },
    { sides: 3,  color: '#4a90d9',                  label: 'Triangle' },
    { sides: 4,  color: '#5ba3e0',                  label: 'Square'   },
    { sides: 5,  color: '#2ecc8a',                  label: 'Pentagon' },
    { sides: 6,  color: '#27ae60',                  label: 'Hexagon'  },
    { sides: 7,  color: '#f0c040',                  label: 'Heptagon' },
    { sides: 8,  color: '#f39c12',                  label: 'Octagon'  },
  ];
  const STAR_COLOR = '#f0c040';

  function getSidesForStreak(streak) {
    if (streak <= 0) return 0;
    if (streak >= 6) return -1; // star mode
    return STREAK_SHAPES[streak].sides;
  }

  function drawPolygon(cx, cy, r, sides, color, rotation = 0, glow = false) {
    if (!ctx) return;
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i / sides) - Math.PI / 2 + rotation;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(cx, cy, outerR, innerR, points, color, rotation = 0) {
    if (!ctx) return;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i / points) - Math.PI / 2 + rotation;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '44';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  let starRotation = 0;
  let animating = false;

  function render(streak) {
    if (!canvas || !ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (streak <= 0) return;

    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;

    if (streak >= 6) {
      starRotation += 0.01;
      drawStar(cx, cy, r, r * 0.45, 6, STAR_COLOR, starRotation);
    } else {
      const info = STREAK_SHAPES[streak];
      drawPolygon(cx, cy, r, info.sides, info.color, 0, streak >= 4);
    }
  }

  let rafId = null;
  function startPulse(streak) {
    if (rafId) cancelAnimationFrame(rafId);
    function loop() {
      render(streak);
      rafId = requestAnimationFrame(loop);
    }
    loop();
  }

  return {
    init(canvasEl) {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');
      // Set canvas size
      canvas.width  = canvas.offsetWidth  || 80;
      canvas.height = canvas.offsetHeight || 80;
    },
    update(streak) {
      startPulse(streak);
    },
    reset() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
})();
