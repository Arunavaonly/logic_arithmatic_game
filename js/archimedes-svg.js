// archimedes-svg.js — Injects Archimedes figure as a PNG image
(function buildArchimedesFigure() {
  const ARCHIMEDES_PNG_SRC = 'images/archimedes.png';

  function makeFigure() {
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

  document.addEventListener('DOMContentLoaded', () => {
    ['archimedes-home-fig', 'archimedes-game-fig', 'archimedes-reward-fig'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.textContent = '';
      el.appendChild(makeFigure());
    });
  });
})();
