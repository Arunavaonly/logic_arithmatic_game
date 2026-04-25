/**
 * local-server.js — Local development proxy for Groq API
 *
 * Reads GROQ_API_KEY from .env and proxies requests from the game to Groq.
 * The API key is NEVER sent to the browser — it stays here on Node.js.
 *
 * Usage:
 *   node local-server.js
 *
 * Then serve the game with Live Server (VS Code) or:
 *   npx serve .
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Read .env manually (no external deps needed) ──────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env file not found. Create one with GROQ_API_KEY=your_key');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

loadEnv();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT         = process.env.PORT || 3002;
const GROQ_HOST    = 'api.groq.com';
const GROQ_PATH    = '/openai/v1/chat/completions';
const DEBUG_LOG    = String(process.env.DEBUG_LOG || '').toLowerCase();
const LOG_FULL     = DEBUG_LOG === '1' || DEBUG_LOG === 'true' || DEBUG_LOG === 'full';
const LOG_TRUNCATE_CHARS = Number(process.env.LOG_TRUNCATE_CHARS || 2000);

if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
  console.error('❌  GROQ_API_KEY is not set. Open .env and paste your real key.');
  process.exit(1);
}

function safeStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function truncate(s, n = LOG_TRUNCATE_CHARS) {
  const str = typeof s === 'string' ? s : safeStringify(s);
  if (LOG_FULL) return str;
  if (str.length <= n) return str;
  return str.slice(0, n) + `\n… (truncated, ${str.length - n} more chars)`;
}

function ts() {
  return new Date().toLocaleTimeString();
}

function summarizePayload(payload) {
  const model = payload?.model;
  const temp = payload?.temperature;
  const max = payload?.max_tokens;
  const msg0 = payload?.messages?.[0]?.content;
  const preview = typeof msg0 === 'string' ? msg0.replace(/\s+/g, ' ').slice(0, 160) : '';
  return { model, temperature: temp, max_tokens: max, first_message_preview: preview };
}

// ── Proxy server ──────────────────────────────────────────────
const server = http.createServer((req, res) => {

  // CORS headers — allow any localhost origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // Collect request body
  let rawBody = '';
  req.on('data', chunk => rawBody += chunk);
  req.on('end', () => {

    // Validate JSON
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const start = Date.now();
    console.log('');
    console.log(`────────────── [${ts()}] RapidFire → Proxy ──────────────`);
    console.log(`From: ${req.socket.remoteAddress || 'unknown'}  ${req.method} ${req.url}`);
    console.log(`Summary: ${safeStringify(summarizePayload(payload))}`);
    if (LOG_FULL) {
      console.log('Payload:');
      console.log(truncate(payload));
    }

    const bodyStr = JSON.stringify(payload);

    // Forward to Groq API
    const options = {
      hostname: GROQ_HOST,
      path:     GROQ_PATH,
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const groqReq = https.request(options, groqRes => {
      let data = '';
      groqRes.on('data', chunk => data += chunk);
      groqRes.on('end', () => {
        res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
        const ms = Date.now() - start;
        console.log(`Groq: HTTP ${groqRes.statusCode}  (${ms}ms)`);

        // Log response body (truncated by default)
        try {
          const json = JSON.parse(data);
          const content = json?.choices?.[0]?.message?.content;
          const usage = json?.usage;
          if (usage) console.log(`Usage: ${safeStringify(usage)}`);
          if (typeof content === 'string') {
            console.log('Model content:');
            console.log(truncate(content));
          } else {
            console.log('Response JSON:');
            console.log(truncate(json));
          }
        } catch {
          console.log('Raw response (non-JSON or parse failed):');
          console.log(truncate(data));
        }

        console.log(`────────────── [${ts()}] End ──────────────`);
      });
    });

    groqReq.on('error', err => {
      console.error('Groq request error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to reach Groq API', detail: err.message }));
    });

    groqReq.write(bodyStr);
    groqReq.end();
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ⚡ Puzzle Parthenon — Local Groq Proxy');
  console.log('  ────────────────────────────────────────');
  console.log(`  ✅  Proxy running at http://localhost:${PORT}`);
  console.log(`  🔑  API key loaded from .env`);
  console.log(`  🧾  Debug logging: ${LOG_FULL ? 'FULL' : 'summary + truncated'} (set DEBUG_LOG=full for full bodies)`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Open the game with VS Code Live Server (port 5500)');
  console.log('     OR run:  npx serve . -l 5500');
  console.log('  2. Complete Level 4 to unlock The Oracle\'s Trial');
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
