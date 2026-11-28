import { afterEach, describe, expect, vi } from 'vitest';
import type { Express } from 'express';

// Black-box acceptance for M1.3: a caller must be able to read the two
// fallback headers on zero-attempt blocks (422/429) and on exhausted chains,
// and must NOT see them on success. Every assertion is made on the HTTP
// response. The provider dispatch is faked so no request can reach a real
// provider; the DB is in memory and never touches freeapi.db.

const chatCompletion = vi.fn();
const streamChatCompletion = vi.fn();
const fakeProvider = { name: 'fake', chatCompletion, streamChatCompletion } as any;

vi.mock('../../providers/index.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getProvider: () => fakeProvider,
    resolveProvider: () => fakeProvider,
  };
});

const { createApp } = await import('../../app.js');
const { initDb, getDb, getUnifiedApiKey } = await import('../../db/index.js');
const { encrypt } = await import('../../lib/crypto.js');
const { clearAllCooldowns, setCooldown } = await import('../../services/ratelimit.js');
const { setRoutingStrategy } = await import('../../services/router.js');
const { pendente } = await import('../helpers/pendente.js');

interface Reply {
  status: number;
  body: any;
  attempts: string | null;
  trail: string | null;
  cause: string | null;
}

async function post(app: Express, path: string, body: unknown, token?: string): Promise<Reply> {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* SSE or non-JSON */ }
    return {
      status: res.status,
      body: json,
      attempts: res.headers.get('x-fallback-attempts'),
      trail: res.headers.get('x-fallback-trail'),
      cause: res.headers.get('x-block-cause'),
    };
  } finally {
    server.close();
  }
}

function fresh() {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
  initDb(':memory:');
  // The cooldown map lives in a module and survives initDb.
  clearAllCooldowns();
  chatCompletion.mockReset();
  streamChatCompletion.mockReset();
  const app = createApp();
  return { app, token: getUnifiedApiKey() };
}

function insertKey(platform: string, label: string): number {
  const enc = encrypt('synthetic-acceptance-key');
  return Number(getDb().prepare(`
    INSERT INTO api_keys (platform, encrypted_key, iv, auth_tag, label, status, enabled)
    VALUES (?, ?, ?, ?, ?, 'healthy', 1)
  `).run(platform, enc.encrypted, enc.iv, enc.authTag, label).lastInsertRowid);
}

function disableVisionModels(): void {
  getDb().prepare('UPDATE models SET enabled = 0 WHERE supports_vision = 1').run();
}

function cooldownVisionModels(keyId: number): void {
  const rows = getDb().prepare(
    'SELECT platform, model_id FROM models WHERE supports_vision = 1 AND enabled = 1',
  ).all() as Array<{ platform: string; model_id: string }>;
  for (const row of rows) setCooldown(row.platform, row.model_id, keyId, 600_000);
}

/** Only the two tests that need real dispatch get a provider key. The
 *  zero-attempt cases must not accidentally gain a usable route. */
function allowDispatch(): void {
  setRoutingStrategy('priority');
  const enc = encrypt('synthetic-acceptance-key');
  getDb().prepare(`
    INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled)
    VALUES ('groq', 'groq-acceptance-dispatch', ?, ?, ?, 'healthy', 1)
  `).run(enc.encrypted, enc.iv, enc.authTag);
}

const PNG_IMAGE = {
  messages: [{ role: 'user', content: [
    { type: 'text', text: 'what is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
  ] }],
};
const TEXT_ONLY = { messages: [{ role: 'user', content: 'hello' }] };
const GOOD_RESULT = {
  choices: [{ message: { role: 'assistant', content: 'a real answer' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 },
};

/** The two headers must be real HTTP headers, not JSON fields. */
function expectZeroHeaders(res: Reply): void {
  expect(res.attempts).toBe('0');
  // Present with an empty value: get() returns '' only when the header was sent.
  expect(res.trail).toBe('');
}

afterEach(() => {
  if (process.env.FALLBACK_TIME_BUDGET_MS !== undefined) delete process.env.FALLBACK_TIME_BUDGET_MS;
  if (process.env.PROXY_RATE_LIMIT_RPM !== undefined) delete process.env.PROXY_RATE_LIMIT_RPM;
});

describe('zero-attempt fallback headers (M1.3)', () => {
  pendente('AM1.3-1 image without a vision model: 422 with 0/empty headers', async () => {
    const { app, token } = fresh();
    disableVisionModels();

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(422);
    expect(res.body?.error?.code).toBe('no_vision_model');
    expectZeroHeaders(res);
    expect(res.body?.execution_id).toBeTruthy();
    // They are HTTP headers, not keys of the JSON body. This test does not
    // assert a literal X-Block-Cause on the 422: the design is compatible with
    // both contracts of that header, and the PM decides which one is the base.
    const bodyKeys = Object.keys(res.body ?? {});
    expect(bodyKeys).not.toContain('X-Fallback-Attempts');
    expect(bodyKeys).not.toContain('X-Fallback-Trail');
  });

  pendente('AM1.3-2 vision model in cooldown: 429 with 0/empty headers', async () => {
    const { app, token } = fresh();
    const keyId = insertKey('google', 'google-vision-cooldown-m13');
    cooldownVisionModels(keyId);

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(429);
    // The 429 already has a distinct cause; the two headers must coexist with it.
    expect(res.cause).toBe('vision_quota_exhausted');
    expectZeroHeaders(res);
  });

  // Already true on main (setFallbackHeaders writes n/>0 on a 429 with
  // attempts): a regression guard, not a pending feature.
  it('AM1.3-3 exhausted chain after real attempts keeps n/>0 headers', async () => {
    const original = process.env.FALLBACK_TIME_BUDGET_MS;
    process.env.FALLBACK_TIME_BUDGET_MS = '1';
    try {
      const { app, token } = fresh();
      allowDispatch();
      chatCompletion.mockImplementation(async () => {
        throw Object.assign(new Error('Groq API error 429: rate limit'), { status: 429 });
      });

      const res = await post(app, '/v1/chat/completions', TEXT_ONLY, token);

      expect(res.status).toBe(429);
      expect(Number(res.attempts)).toBeGreaterThan(0);
      expect(res.trail).toBeTruthy();
      expect(res.trail).not.toBe('');
      expect(res.attempts).not.toBe('0');
    } finally {
      if (original === undefined) delete process.env.FALLBACK_TIME_BUDGET_MS;
      else process.env.FALLBACK_TIME_BUDGET_MS = original;
    }
  });

  pendente('AM1.3-4 gateway rate limit: 0/empty headers on the second request', async () => {
    const original = process.env.PROXY_RATE_LIMIT_RPM;
    process.env.PROXY_RATE_LIMIT_RPM = '1';
    try {
      const { app } = fresh();
      // The limiter sits before auth: neither request reaches a provider.
      const first = await post(app, '/v1/chat/completions', TEXT_ONLY);
      expect(first.status).not.toBe(429);

      const limited = await post(app, '/v1/chat/completions', TEXT_ONLY);
      expect(limited.status).toBe(429);
      expectZeroHeaders(limited);
    } finally {
      if (original === undefined) delete process.env.PROXY_RATE_LIMIT_RPM;
      else process.env.PROXY_RATE_LIMIT_RPM = original;
    }
  });

  // This regression already passes on main: no marker. The new helper must
  // never write 0/'' into a successful first-attempt response.
  it('AM1.3-5 first-attempt success carries no fallback headers', async () => {
    const { app, token } = fresh();
    allowDispatch();
    chatCompletion.mockResolvedValueOnce(GOOD_RESULT);

    const res = await post(app, '/v1/chat/completions', TEXT_ONLY, token);

    expect(res.status).toBe(200);
    expect(res.attempts).toBeNull();
    expect(res.trail).toBeNull();
  });

  pendente('AM1.3-1 across surfaces: /v1/responses and /v1/messages 422 too', async () => {
    const first = fresh();
    disableVisionModels();
    const responses = await post(first.app, '/v1/responses', {
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'what is in this image?' },
        { type: 'input_image', image_url: 'data:image/png;base64,iVBORw0KGgo=' },
      ] }],
    }, first.token);
    expect(responses.status).toBe(422);
    expectZeroHeaders(responses);

    const second = fresh();
    disableVisionModels();
    const messages = await post(second.app, '/v1/messages', {
      model: 'fake-model',
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'what is in this image?' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } },
      ] }],
    }, second.token);
    expect(messages.status).toBe(422);
    expectZeroHeaders(messages);
  });
});
