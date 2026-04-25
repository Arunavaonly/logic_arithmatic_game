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
    const withCors = (body, status) =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: corsHeaders(origin),
      });

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      // Only allow POST
      if (request.method !== 'POST') {
        return withCors({ error: 'Method not allowed' }, 405);
      }

      // Check origin
      if (!isAllowed(origin)) {
        return withCors({ error: 'Forbidden' }, 403);
      }

      // Parse body
      let body;
      try {
        body = await request.json();
      } catch {
        return withCors({ error: 'Invalid JSON body' }, 400);
      }

      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return withCors({ error: 'Expected a JSON object body' }, 400);
      }

      // Check API key is configured
      if (!env.GROQ_API_KEY) {
        return withCors({ error: 'GROQ_API_KEY not configured on worker' }, 500);
      }

      // Strip our internal 'type' field, forward rest to Groq
      const { type: _type, ...groqPayload } = body;

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
        return withCors({ error: 'Failed to reach Groq API', detail: err.message }, 502);
      }

      const rawText = await groqRes.text();
      if (!rawText || !rawText.trim()) {
        return withCors(
          { error: 'Empty response from Groq', httpStatus: groqRes.status },
          groqRes.ok ? 502 : groqRes.status,
        );
      }
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        return withCors(
          {
            error: 'Groq returned non-JSON',
            status: groqRes.status,
            snippet: rawText.slice(0, 300),
          },
          502,
        );
      }

      return withCors(data, groqRes.status);
    } catch (err) {
      return withCors({ error: 'Worker error', detail: err.message }, 500);
    }
  },
};
