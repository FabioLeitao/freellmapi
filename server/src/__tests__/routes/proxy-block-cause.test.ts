import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb, getUnifiedApiKey, encrypt, setCooldown, setMonthlyBudgetCaps } from '../../db/index.js';

async function post(app: Express, path: string, body: any, key: string) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as any;
  const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  server.close();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json, headers: res.headers };
}

const IMAGE_MESSAGE = {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'what is in this image?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
    ],
  }],
};

describe('M1.1 Block Cause on 429/422 routes', () => {
  let app: Express;
  let key: string;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    app = createApp();
    key = getUnifiedApiKey();
    // Enable vision models and add a key for testing
    const db = getDb();
    db.prepare("UPDATE models SET enabled = 1 WHERE supports_vision = 1").run();
    db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('google', ?, 'test google')").run(encrypt('test-key'));
    // Add a cerebras key for testing
    db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('cerebras', ?, 'test cerebras')").run(encrypt('test-key'));
    // Disable all vision models except cerebras (no vision models)
    db.prepare("UPDATE models SET enabled = 0 WHERE supports_vision = 1").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'cerebras'").run();
  });

  afterAll(() => {
    // Restore vision models if they were disabled
    try {
      getDb().prepare("UPDATE models SET enabled = 1 WHERE supports_vision = 1").run();
    } catch {}
  });

  // DM1.1-19: Case B - image, google key, google vision models in cooldown
  it('DM1.1-19: image with google vision models in cooldown gives vision_quota_exhausted/cooldown', async () => {
    const db = getDb();
    // Enable only Google vision models (gemini-2.5-flash, gemini-2.5-pro, etc.)
    db.prepare("UPDATE models SET enabled = 0 WHERE platform != 'google'").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'google' AND supports_vision = 1").run();
    // Add a google key
    const keyId = db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('google', ?, 'test google') RETURNING id").get(encrypt('test-key')) as { id: number };
    // Put all google vision models in cooldown
    const visionModels = db.prepare("SELECT model_id FROM models WHERE platform = 'google' AND supports_vision = 1 AND enabled = 1").all() as { model_id: string }[];
    for (const m of visionModels) {
      setCooldown('google', m.model_id, keyId.id, 600000, 'rate_limit');
    }

    const { status, body, headers } = await post(app, '/v1/chat/completions', IMAGE_MESSAGE, key);
    expect(status).toBe(429);
    expect(body?.error?.code).toBe('routing_exhausted'); // unchanged
    expect(body?.error?.cause).toBe('vision_quota_exhausted');
    expect(body?.error?.cause_detail).toBe('cooldown');
    expect(headers.get('X-Block-Cause')).toBe('vision_quota_exhausted');
    expect(headers.get('X-Block-Cause-Detail')).toBe('cooldown');
    expect(body?.execution_id).toBeDefined();
  });

  // DM1.1-20: Case E - image, only cerebras key (no vision models)
  it('DM1.1-20: image with only cerebras key gives no_vision_key', async () => {
    const db = getDb();
    // Disable all vision models except cerebras (which has no vision models)
    db.prepare("UPDATE models SET enabled = 0 WHERE supports_vision = 1").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'cerebras'").run();
    // Add a cerebras key
    db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('cerebras', ?, 'test cerebras')").run(encrypt('test-key'));

    const { status, body, headers } = await post(app, '/v1/chat/completions', IMAGE_MESSAGE, key);
    expect(status).toBe(429);
    expect(body?.error?.cause).toBe('no_vision_key');
    expect(headers.get('X-Block-Cause')).toBe('no_vision_key');
    expect(body?.execution_id).toBeDefined();
  });

  // DM1.1-21: text, cerebras key with models in cooldown
  it('DM1.1-21: text with cerebras in cooldown gives cooldown cause', async () => {
    const db = getDb();
    // Disable vision models, enable cerebras
    db.prepare("UPDATE models SET enabled = 0 WHERE supports_vision = 1").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'cerebras'").run();
    const keyId = db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('cerebras', ?, 'test cerebras 2') RETURNING id").get(encrypt('test-key')) as { id: number };
    // Put cerebras models in cooldown
    const cerebrasModels = db.prepare("SELECT model_id FROM models WHERE platform = 'cerebras' AND enabled = 1").all() as { model_id: string }[];
    for (const m of cerebrasModels) {
      setCooldown('cerebras', m.model_id, keyId.id, 600000, 'rate_limit');
    }

    const { status, body, headers } = await post(app, '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'hello' }],
    }, key);
    expect(status).toBe(429);
    expect(body?.error?.code).toBe('rate_limit_exceeded');
    expect(body?.error?.cause).toBe('cooldown');
    expect(headers.get('X-Block-Cause')).toBe('cooldown');
    expect(headers.get('Retry-After')).toBeDefined(); // Retry-After present
    expect(body?.execution_id).toBeDefined();
  });

  // DM1.1-22: text, cerebras key with tokenCap exhausted
  it('DM1.1-22: text with cerebras tokenCap exhausted gives key_quota cause', async () => {
    const db = getDb();
    db.prepare("UPDATE models SET enabled = 0 WHERE supports_vision = 1").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'cerebras'").run();
    const keyId = db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('cerebras', ?, 'test cerebras 3') RETURNING id").get(encrypt('test-key')) as { id: number };
    // Set monthly budget cap to 1 token (will be exhausted)
    setMonthlyBudgetCaps(keyId.id, { tokenCap: 1 });

    const { status, body, headers } = await post(app, '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'hello' }],
    }, key);
    expect(status).toBe(429);
    expect(body?.error?.code).toBe('quota_exceeded');
    expect(body?.error?.cause).toBe('key_quota');
    expect(headers.get('X-Block-Cause')).toBe('key_quota');
    expect(body?.execution_id).toBeDefined();
  });

  // DM1.1-23: image and no vision model enabled
  it('DM1.1-23: image with no vision model enabled gives 422 no_vision_model', async () => {
    const db = getDb();
    // Disable ALL vision models
    db.prepare("UPDATE models SET enabled = 0 WHERE supports_vision = 1").run();

    const { status, body, headers } = await post(app, '/v1/chat/completions', IMAGE_MESSAGE, key);
    expect(status).toBe(422);
    expect(body?.error?.code).toBe('no_vision_model');
    expect(body?.error?.cause).toBe('no_vision_model');
    expect(headers.get('X-Vision-Model-Available')).toBe('false');
    expect(headers.get('X-Block-Cause')).toBe('no_vision_model');
    // No X-* keys in body for 422
    expect(body?.error?.cause).toBeDefined();
    expect(body?.error?.cause_detail).toBeUndefined();
    expect(body?.execution_id).toBeDefined();
  });

  // DM1.1-24: Case B in /v1/responses
  it('DM1.1-24: image with google vision models in cooldown on /v1/responses', async () => {
    const db = getDb();
    // Re-enable google vision models and put in cooldown
    db.prepare("UPDATE models SET enabled = 0 WHERE platform != 'google'").run();
    db.prepare("UPDATE models SET enabled = 1 WHERE platform = 'google' AND supports_vision = 1").run();
    const keyId = db.prepare("INSERT INTO keys (provider, api_key, label) VALUES ('google', ?, 'test google 2') RETURNING id").get(encrypt('test-key')) as { id: number };
    const visionModels = db.prepare("SELECT model_id FROM models WHERE platform = 'google' AND supports_vision = 1 AND enabled = 1").all() as { model_id: string }[];
    for (const m of visionModels) {
      setCooldown('google', m.model_id, keyId.id, 600000, 'rate_limit');
    }

    const server = app.listen(0, '127.0.0.1');
    if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
    const addr = server.address() as any;
    const res = await fetch(`http://127.0.0.1:${addr.port}/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: [{ role: 'user', content: [{ type: 'input_text', text: 'what is this?' }, { type: 'input_image', image_url: 'data:image/png;base64,iVBORw0KGgo=' }] }] }),
    });
    const text = await res.text();
    server.close();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    expect(res.status).toBe(429);
    expect(json?.error?.cause).toBe('vision_quota_exhausted');
    expect(json?.error?.cause_detail).toBe('cooldown');
    expect(res.headers.get('X-Block-Cause')).toBe('vision_quota_exhausted');
    expect(res.headers.get('X-Block-Cause-Detail')).toBe('cooldown');
    expect(json?.execution_id).toBeDefined();
  });

  // DM1.1-25: proxy-vision tests still pass (no change needed here, just verify)
  it('DM1.1-25: vision routing still works when vision models available', async () => {
    const db = getDb();
    // Enable vision models, no keys → routing exhaustion (429) but not 422
    db.prepare("UPDATE models SET enabled = 1 WHERE supports_vision = 1").run();
    db.prepare("UPDATE keys SET revoked_at = datetime('now')").run(); // Revoke all keys

    const { status, body } = await post(app, '/v1/chat/completions', IMAGE_MESSAGE, key);
    expect(status).not.toBe(422);
    expect(body?.error?.code).not.toBe('no_vision_model');
  });
});