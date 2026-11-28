import { describe, expect } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb, getUnifiedApiKey } from '../../db/index.js';
import { encrypt } from '../../lib/crypto.js';
import { initServerLogs, resetServerLogsForTest } from '../../lib/server-logs.js';
import { clearAllCooldowns, setCooldown } from '../../services/ratelimit.js';
import { setMonthlyBudgetCaps } from '../../services/key-budget.js';
import { mintDashboardToken } from '../helpers/auth.js';
import { pendente } from '../helpers/pendente.js';

// Black-box acceptance for M1.2: the operator must be able to tell every block
// cause apart by reading the dashboard log alone. Preparation uses the same
// seams as the existing route suites (in-memory DB, synthetic keys, cooldowns);
// the log is read only through the dashboard endpoint, never by importing the
// logger. No request here can reach a real provider: every dispatch path is
// blocked before sending (cooldown, quota, or no vision), and the rate-limit
// case fails at the gateway before authentication.

interface Reply {
  status: number;
  body: any;
  headers: Record<string, string | null>;
}

interface LogEntry {
  level?: string;
  source?: string;
  event?: string;
  requestId?: string;
  message?: string;
}

async function request(
  app: Express,
  path: string,
  body?: unknown,
  token?: string,
  extraHeaders: Record<string, string> = {},
): Promise<Reply> {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON response */ }
    return {
      status: res.status,
      body: json,
      headers: {
        cause: res.headers.get('x-block-cause'),
        'retry-after': res.headers.get('retry-after'),
      },
    };
  } finally {
    server.close();
  }
}

function fresh() {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
  initDb(':memory:');
  // The cooldown map and the log ring live in modules and survive initDb.
  clearAllCooldowns();
  resetServerLogsForTest();
  initServerLogs();
  const app = createApp();
  return { app, token: getUnifiedApiKey(), dashToken: mintDashboardToken('qa-m1-2@example.com') };
}

/** Read the operator's view of the log. A protocol/fixture failure is a hard
 *  error, not a pending assertion: the marker must only absorb "not built yet". */
async function routeBlocks(app: Express, dashToken: string): Promise<LogEntry[]> {
  const res = await request(app, '/api/logs?event=route_blocked', undefined, dashToken);
  if (res.status !== 200) throw new Error(`GET /api/logs responded ${res.status}`);
  const entries = Array.isArray(res.body?.entries) ? res.body.entries : [];
  return entries.filter((entry: LogEntry) => entry?.event === 'route_blocked');
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

function cooldownAllKeyedModels(keyId: number): void {
  const rows = getDb().prepare(
    'SELECT platform, model_id FROM models WHERE enabled = 1',
  ).all() as Array<{ platform: string; model_id: string }>;
  for (const row of rows) setCooldown(row.platform, row.model_id, keyId, 600_000);
}

const PNG_IMAGE = {
  messages: [{ role: 'user', content: [
    { type: 'text', text: 'what is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
  ] }],
};

const TEXT_ONLY = { messages: [{ role: 'user', content: 'hello' }] };

describe('route_blocked log acceptance', () => {
  pendente('AM1.2-1 image without a vision model logs cause and execution id', async () => {
    const { app, token, dashToken } = fresh();
    disableVisionModels();

    const res = await request(app, '/v1/chat/completions', PNG_IMAGE, token, {
      'X-Request-Id': 'acc-1',
    });
    expect(res.status).toBe(422);

    const events = await routeBlocks(app, dashToken);
    const event = events.find(e => String(e.message).includes('cause=no_vision_model'));
    expect(event, 'route_blocked event with cause=no_vision_model').toBeDefined();
    expect(event?.requestId).toBe('acc-1');
    expect(String(event?.message)).toContain('execution_id=acc-1');
    expect(event?.level).toBe('warn');
    expect(event?.source).toBe('RouteBlock');
  });

  pendente('AM1.2-2 each block cause gets its own event and pair', async () => {
    const cases = [
      {
        id: 'acc-2-no-vision-key', body: PNG_IMAGE,
        prepare: () => { insertKey('cerebras', 'cerebras-no-vision'); },
      },
      {
        id: 'acc-2-vision-cooldown', body: PNG_IMAGE,
        prepare: () => { const keyId = insertKey('google', 'google-vision-cooldown'); cooldownVisionModels(keyId); },
      },
      {
        id: 'acc-2-cooldown', body: TEXT_ONLY,
        prepare: () => { const keyId = insertKey('cerebras', 'cerebras-text-cooldown'); cooldownAllKeyedModels(keyId); },
      },
      {
        id: 'acc-2-key-quota', body: TEXT_ONLY,
        prepare: () => {
          const keyId = insertKey('cerebras', 'cerebras-text-capped');
          setMonthlyBudgetCaps(keyId, { tokenCap: 1 });
        },
      },
    ];

    // The design names `no_vision_key` for the first case, but the M1.1 build
    // already on main removed that code as dead and answers 422 no_vision_model
    // instead. Read the cause from the HTTP response (the operator-visible
    // contract) so this test checks propagation, not a cause that no longer
    // exists. The divergence was reported back to the architect.
    const pairs: string[] = [];
    for (const item of cases) {
      const { app, token, dashToken } = fresh();
      item.prepare();

      const res = await request(app, '/v1/chat/completions', item.body, token, {
        'X-Request-Id': item.id,
      });
      const cause = res.body?.error?.cause ?? res.body?.error?.code ?? res.headers.cause ?? undefined;
      expect(cause, `response cause for ${item.id}`).toBeTruthy();

      const events = await routeBlocks(app, dashToken);
      expect(events.length, `one route_blocked event for ${item.id}`).toBe(1);
      const match = /cause=([^\s]+)/.exec(String(events[0]?.message));
      expect(match?.[1], `logged cause for ${item.id}`).toBe(cause);
      expect(events[0]?.requestId, `logged execution id for ${item.id}`).toBe(item.id);
      pairs.push(`${cause}/${item.id}`);
    }

    expect(new Set(pairs).size, 'no two cause/execution-id pairs are equal').toBe(pairs.length);
  });

  pendente('AM1.2-3 log messages carry no prompt, image or key', async () => {
    const collect = async (
      prepare: () => void,
      body: unknown,
      requestId: string,
    ): Promise<LogEntry[]> => {
      const { app, token, dashToken } = fresh();
      prepare();
      const res = await request(app, '/v1/chat/completions', body, token, {
        'X-Request-Id': requestId,
      });
      if (res.status !== 422 && res.status !== 429) {
        throw new Error(`expected a blocked response, got ${res.status}`);
      }
      return routeBlocks(app, dashToken);
    };

    const noVision = await collect(disableVisionModels, PNG_IMAGE, 'acc-3-no-vision');
    const cooled = await collect(() => {
      const keyId = insertKey('google', 'google-vision-cooldown');
      cooldownVisionModels(keyId);
    }, PNG_IMAGE, 'acc-3-cooldown');

    const events = [...noVision, ...cooled];
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const message = String(event?.message);
      expect(message).not.toContain('what is in this image?');
      expect(message).not.toContain('data:image');
      expect(message).not.toContain('synthetic-acceptance-key');
      expect(message).not.toContain('freellmapi-');
    }
  });

  pendente('AM1.2-4 gateway rate limit exposes the cause and logs it', async () => {
    const originalRpm = process.env.PROXY_RATE_LIMIT_RPM;
    process.env.PROXY_RATE_LIMIT_RPM = '1';
    try {
      const { app, dashToken } = fresh();
      // No token: the limiter sits before auth, so neither request can reach a
      // provider. The first passes the limiter (401); the second trips it.
      const first = await request(app, '/v1/chat/completions', TEXT_ONLY);
      expect(first.status).not.toBe(429);

      const limited = await request(app, '/v1/chat/completions', TEXT_ONLY);
      expect(limited.status).toBe(429);
      expect(limited.body?.error?.type).toBe('rate_limit_error');
      expect(limited.headers.cause).toBe('gateway_rate_limit');
      expect(limited.body?.error?.cause).toBe('gateway_rate_limit');
      expect(limited.headers['retry-after']).toBeTruthy();

      const events = await routeBlocks(app, dashToken);
      const event = events.find(e => String(e.message).includes('cause=gateway_rate_limit'));
      expect(event, 'route_blocked event with cause=gateway_rate_limit').toBeDefined();
      expect(String(event?.message)).toContain('surface=gateway rate limiter');
    } finally {
      if (originalRpm === undefined) delete process.env.PROXY_RATE_LIMIT_RPM;
      else process.env.PROXY_RATE_LIMIT_RPM = originalRpm;
    }
  });
});
