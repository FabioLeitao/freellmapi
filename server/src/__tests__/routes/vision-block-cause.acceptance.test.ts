import { describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb, getUnifiedApiKey } from '../../db/index.js';
import { encrypt } from '../../lib/crypto.js';
import { setCooldown, clearAllCooldowns } from '../../services/ratelimit.js';
import { setMonthlyBudgetCaps } from '../../services/key-budget.js';

// Aceitação caixa-preta da issue fork #3 / upstream #2061 (desenho M1.1).
// A marca `pendente` (ADR-004 / ADR-008) foi retirada após a implementação.
//
// Nenhum teste pode chegar a um provedor real: só existem chaves `google` e
// `cerebras`, e todos os modelos aptos a despachar ficam barrados antes do
// envio (cooldown, cota ou sem visão num pedido com imagem).

function fresh() {
  process.env.ENCRYPTION_KEY = '0'.repeat(64);
  initDb(':memory:');
  // O mapa de cooldown vive no módulo e sobrevive ao initDb: limpar evita que
  // um caso herde o cooldown do anterior e mascare a causa esperada.
  clearAllCooldowns();
  const app = createApp();
  const token = getUnifiedApiKey();
  return { app, token };
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

async function post(app: Express, path: string, body: unknown, token: string) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
    return {
      status: res.status,
      body: json,
      headers: {
        cause: res.headers.get('x-block-cause'),
        detail: res.headers.get('x-block-cause-detail'),
        vision: res.headers.get('x-vision-model-available'),
      },
    };
  } finally {
    server.close();
  }
}

const PNG_IMAGE = {
  messages: [{ role: 'user', content: [
    { type: 'text', text: 'what is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
  ] }],
};

const TEXT_ONLY = { messages: [{ role: 'user', content: 'hello' }] };

function responsesImage(imageUrl: string) {
  return { input: [{ role: 'user', content: [
    { type: 'input_text', text: 'what is in this image?' },
    { type: 'input_image', image_url: imageUrl },
  ] }] };
}

describe('M1.1 — causa explícita de bloqueio com imagem no histórico (#3 / #2061)', () => {
  it('AM1.1-1 — imagem PNG sem modelo de visão habilitado: 422 no_vision_model', async () => {
    const { app, token } = fresh();
    disableVisionModels();

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('no_vision_model');
    expect(res.body.error.cause).toBe('no_vision_model');
    expect(res.headers.vision).toBe('false');
    expect(res.headers.cause).toBe('no_vision_model');
    expect(res.body.execution_id).toBeTruthy();
  });

  it('AM1.1-2 — visão habilitada, chave só de provedor sem visão: no_vision_key', async () => {
    const { app, token } = fresh();
    insertKey('cerebras', 'cerebras-no-vision');

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(429);
    expect(res.headers.cause).toBe('no_vision_key');
    expect(res.body.error.cause).toBe('no_vision_key');
  });

  it('AM1.1-3 — modelo de visão em cooldown: vision_quota_exhausted / cooldown', async () => {
    const { app, token } = fresh();
    const keyId = insertKey('google', 'google-vision-cooldown');
    cooldownVisionModels(keyId);

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(429);
    expect(res.headers.cause).toBe('vision_quota_exhausted');
    expect(res.headers.detail).toBe('cooldown');
    expect(res.body.error.cause).toBe('vision_quota_exhausted');
    expect(res.body.error.cause_detail).toBe('cooldown');
  });

  it('AM1.1-4 — modelo de visão com cota mensal esgotada: detail key_quota', async () => {
    const { app, token } = fresh();
    const keyId = insertKey('google', 'google-vision-capped');
    setMonthlyBudgetCaps(keyId, { tokenCap: 1 });

    const res = await post(app, '/v1/chat/completions', PNG_IMAGE, token);

    expect(res.status).toBe(429);
    expect(res.headers.cause).toBe('vision_quota_exhausted');
    expect(res.headers.detail).toBe('key_quota');
    expect(res.body.error.cause).toBe('vision_quota_exhausted');
    expect(res.body.error.cause_detail).toBe('key_quota');
  });

  it('AM1.1-5 — texto com todas as chaves em cooldown: cooldown sem detail', async () => {
    const { app, token } = fresh();
    const keyId = insertKey('google', 'google-text-cooldown');
    cooldownAllKeyedModels(keyId);

    const res = await post(app, '/v1/chat/completions', TEXT_ONLY, token);

    expect(res.status).toBe(429);
    expect(res.headers.cause).toBe('cooldown');
    expect(res.headers.detail).toBeNull();
    expect(res.body.error.cause).toBe('cooldown');
    expect(res.body.error.cause_detail).toBeUndefined();
  });

  it('AM1.1-6 — imagem por URL e em JPEG tem a mesma causa; nada é baixado', async () => {
    const { app, token } = fresh();
    const keyId = insertKey('google', 'google-vision-cooldown-url');
    cooldownVisionModels(keyId);

    // O host example.invalid não resolve: se o gateway tentasse baixar a
    // imagem, a resposta não seria o bloqueio de roteamento abaixo.
    const byUrl = await post(app, '/v1/chat/completions', {
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'what is in this image?' },
        { type: 'image_url', image_url: { url: 'https://example.invalid/a.jpg' } },
      ] }],
    }, token);
    expect(byUrl.status).toBe(429);
    expect(byUrl.headers.cause).toBe('vision_quota_exhausted');
    expect(byUrl.headers.detail).toBe('cooldown');
    expect(byUrl.body.error.cause).toBe('vision_quota_exhausted');
    expect(byUrl.body.error.cause_detail).toBe('cooldown');

    const byJpeg = await post(app, '/v1/chat/completions', {
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'what is in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' } },
      ] }],
    }, token);
    expect(byJpeg.status).toBe(429);
    expect(byJpeg.headers.cause).toBe('vision_quota_exhausted');
    expect(byJpeg.headers.detail).toBe('cooldown');
    expect(byJpeg.body.error.cause).toBe('vision_quota_exhausted');
    expect(byJpeg.body.error.cause_detail).toBe('cooldown');
  });

  it('AM1.1-7 — mesmas causas e cabeçalhos em /v1/responses', async () => {
    // 1) Sem modelo de visão habilitado → 422 no_vision_model.
    const first = fresh();
    disableVisionModels();
    const noVision = await post(first.app, '/v1/responses',
      responsesImage('data:image/png;base64,iVBORw0KGgo='), first.token);
    expect(noVision.status).toBe(422);
    expect(noVision.body.error.code).toBe('no_vision_model');
    expect(noVision.body.error.cause).toBe('no_vision_model');
    expect(noVision.headers.vision).toBe('false');
    expect(noVision.headers.cause).toBe('no_vision_model');

    // 2) Modelo de visão em cooldown → vision_quota_exhausted / cooldown.
    const second = fresh();
    const keyId = insertKey('google', 'google-vision-cooldown-responses');
    cooldownVisionModels(keyId);
    const cooled = await post(second.app, '/v1/responses',
      responsesImage('data:image/png;base64,iVBORw0KGgo='), second.token);
    expect(cooled.status).toBe(429);
    expect(cooled.headers.cause).toBe('vision_quota_exhausted');
    expect(cooled.headers.detail).toBe('cooldown');
    expect(cooled.body.error.cause).toBe('vision_quota_exhausted');
    expect(cooled.body.error.cause_detail).toBe('cooldown');
  });
});
