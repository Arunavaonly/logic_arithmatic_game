// Served on GitHub Pages: point Level 5 at the Cloudflare Worker (public URL only).
// Local: use gitignored config.js, or rapidfire.js falls back to http://localhost:3001
(function () {
  if (typeof window === 'undefined' || window.GROQ_PROXY_URL) return;
  if (window.location.hostname === 'arunavaonly.github.io') {
    window.GROQ_PROXY_URL = 'https://groq-proxy.logic-game-proxy.workers.dev';
  }
})();
