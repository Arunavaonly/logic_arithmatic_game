// archimedes-svg.js — Injects Archimedes figure as a PNG image
(function buildArchimedesFigure() {
  const ARCHIMEDES_PNG_SRC = 'images/archimedes.png';
  const ARCHIMEDES_SPRITE_SRC_CANDIDATES = [
    'images/archimedes-sprite.png',
    'archimedes-sprite.png'
  ];

  const DEFAULT_SPRITE = {
    // Expected layout: a single horizontal strip of frames
    frameCount: 8,
    frameWidth: 220,
    frameHeight: 380
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image: ' + src));
      img.src = src;
    });
  }

  function makeStaticFigure() {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'archimedes-figure state-idle');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'Archimedes the ancient Greek mathematician');

    const img = document.createElement('img');
    img.src = ARCHIMEDES_PNG_SRC;
    img.alt = '';
    img.loading = 'eager';
    img.decoding = 'async';
    img.setAttribute('class', 'archimedes-image');

    wrap.appendChild(img);
    return wrap;
  }

  function makeSpriteFigure(spriteSrc) {
    const wrap = document.createElement('div');
    wrap.setAttribute('class', 'archimedes-figure archimedes-figure--sprite state-idle');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'Archimedes the ancient Greek mathematician');

    wrap.style.setProperty('--sprite-src', `url("${spriteSrc}")`);
    wrap.style.setProperty('--sprite-frame-count', String(DEFAULT_SPRITE.frameCount));
    wrap.style.setProperty('--sprite-frame-width', String(DEFAULT_SPRITE.frameWidth));
    wrap.style.setProperty('--sprite-frame-height', String(DEFAULT_SPRITE.frameHeight));

    const sprite = document.createElement('div');
    sprite.setAttribute('class', 'archimedes-sprite');
    sprite.setAttribute('aria-hidden', 'true');
    wrap.appendChild(sprite);

    return wrap;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const targets = ['archimedes-home-fig', 'archimedes-game-fig', 'archimedes-reward-fig']
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (targets.length === 0) return;

    // Default to static image; upgrade to sprite sheet if present.
    targets.forEach((el) => {
      el.textContent = '';
      el.appendChild(makeStaticFigure());
    });

    (async () => {
      for (const candidate of ARCHIMEDES_SPRITE_SRC_CANDIDATES) {
        try {
          await loadImage(candidate);
          targets.forEach((el) => {
            el.textContent = '';
            el.appendChild(makeSpriteFigure(candidate));
          });
          return;
        } catch {
          // try next candidate
        }
      }
      // Keep static fallback if sprite isn't available
    })();
  });
})();
