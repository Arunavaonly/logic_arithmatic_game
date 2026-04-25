/**
 * Cloudflare Worker — Secure Groq API Proxy
 * 
 * Receives requests from the game (GitHub Pages / localhost),
 * forwards them to Groq API with the secret key, returns the response.
 * The API key is NEVER exposed to the browser.
 * 
 * Endpoints:
 *   POST /  — body: { type: 'generate' | 'evaluate', ...groqPayload }
 *
 * Deploy: wrangler deploy
 * Local:  wrangler dev   (reads GROQ_API_KEY from .dev.vars)
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Origins allowed to call this worker
const ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  // Browser Origin is scheme + host only (no /repo path on GitHub Pages)
  'https://arunavaonly.github.io',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function isAllowed(origin) {
  if (!origin) return true; // allow curl/wrangler dev with no origin
  return ALLOWED_ORIGINS.some(o => origin.startsWith(o));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    // Check origin
    if (!isAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: corsHeaders(origin),
      });
    }

    // Check API key is configured
    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured on worker' }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    // Strip our internal 'type' field, forward rest to Groq
    const { type, ...groqPayload } = body;

    // Forward to Groq
    let groqRes;
    try {
      groqRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groqPayload),
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to reach Groq API', detail: err.message }), {
        status: 502,
        headers: corsHeaders(origin),
      });
    }

    const data = await groqRes.json();

    return new Response(JSON.stringify(data), {
      status: groqRes.status,
      headers: corsHeaders(origin),
    });
  },
};
