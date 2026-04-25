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

      // Trim: wrangler secret often stores a trailing newline; local .env loaders usually trim.
      const apiKey = String(env.GROQ_API_KEY || '')
        .replace(/^\uFEFF/, '')
        .trim();
      if (!apiKey) {
        return withCors({ error: 'GROQ_API_KEY not configured on worker' }, 500);
      }

      // Strip our internal 'type' field, forward rest to Groq
      const { type: _type, ...groqPayload } = body;

      const payloadJson = JSON.stringify(groqPayload);
      if (!groqPayload.model || !Array.isArray(groqPayload.messages)) {
        return withCors(
          {
            error: 'Invalid Groq payload (need model + messages[])',
            keys: Object.keys(groqPayload),
          },
          400,
        );
      }

      // Byte body + explicit Content-Length: some APIs reject chunked POST from edge runtimes.
      const payloadBytes = new TextEncoder().encode(payloadJson);

      // Forward to Groq
      let groqRes;
      try {
        groqRes = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Prefer uncompressed responses (avoids rare empty-body decompress quirks)
            'Accept-Encoding': 'identity',
          },
          body: payloadBytes,
        });
      } catch (err) {
        return withCors({ error: 'Failed to reach Groq API', detail: err.message }, 502);
      }

      const ab = await groqRes.arrayBuffer();
      const rawText = new TextDecoder('utf-8').decode(ab);
      if (!rawText.trim()) {
        const reqId =
          groqRes.headers.get('x-request-id')
          || groqRes.headers.get('cf-ray')
          || groqRes.headers.get('x-groq-request-id')
          || '';
        return withCors(
          {
            error: 'Empty body from Groq (unusual for this API)',
            httpStatus: groqRes.status,
            groqBodyBytes: ab.byteLength,
            groqRequestId: reqId || undefined,
            groqContentType: groqRes.headers.get('content-type') || undefined,
            groqContentEncoding: groqRes.headers.get('content-encoding') || undefined,
            hint:
              'Re-save the Worker secret without spaces or line breaks after the key: npx wrangler secret put GROQ_API_KEY',
          },
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
