import { describe, it, expect } from 'vitest';
import { baseBlockCause, blockCause } from '../../lib/block-cause.js';
import { exhaustionErrorPayload, setExhaustionHeaders } from '../../lib/fallback-loop.js';
import type { AttemptRecord, AttemptErrorClass, ExhaustionBody } from '../../lib/fallback-loop.js';

function attempt(errorClass: AttemptErrorClass): AttemptRecord {
  return { platform: 'g', modelId: 'x', keyOrdinal: 1, errorClass };
}

describe('baseBlockCause', () => {
  it('DM1.1-1: cooldown family', () => {
    expect(baseBlockCause(['g/x: 1 key(s) — cooldown:1'], [])).toBe('cooldown');
  });

  it('DM1.1-2: every provider-limit reason', () => {
    for (const reason of ['provider-daily-cap', 'provider-minute-cap', 'provider-daily-token-cap', 'cloudflare-neuron-cap', 'checkin-required']) {
      expect(baseBlockCause([`g/x: 1 key(s) — ${reason}:1`], [])).toBe('provider_limit');
    }
  });

  it('DM1.1-3: every key-quota reason', () => {
    for (const reason of ['rpm/rpd-limit', 'tpm/tpd-limit', 'monthly-budget-cap', 'key-concurrency']) {
      expect(baseBlockCause([`g/x: 1 key(s) — ${reason}:1`], [])).toBe('key_quota');
    }
  });

  it('DM1.1-4: two different families give chain_exhausted', () => {
    expect(baseBlockCause(['g/x: 1 key(s) — cooldown:1', 'g/y: 1 key(s) — rpm/rpd-limit:1'], [])).toBe('chain_exhausted');
  });

  it('DM1.1-5: ignored reasons and ruled-out lines do not mix families', () => {
    expect(baseBlockCause([
      'g/x: 1 key(s) — cooldown:1, already-failed-this-request:1',
      'g/y ruled out earlier this request',
    ], [])).toBe('cooldown');
  });

  it('DM1.1-6: config-only lines give chain_exhausted', () => {
    expect(baseBlockCause([
      'g/x: no enabled+healthy key for platform',
      '5 model(s) skipped: no enabled+healthy key for platform (g, c)',
    ], [])).toBe('chain_exhausted');
  });

  it('DM1.1-7: an unknown non-ignored line mixes families', () => {
    expect(baseBlockCause(['m: no tool-calling support', 'g/x: 1 key(s) — cooldown:1'], [])).toBe('chain_exhausted');
  });

  it('DM1.1-8: attempt error classes', () => {
    expect(baseBlockCause([], [attempt('rate_limited'), attempt('rate_limited')])).toBe('provider_limit');
    expect(baseBlockCause([], [attempt('daily_quota_exhausted'), attempt('out_of_credits')])).toBe('key_quota');
    expect(baseBlockCause([], [attempt('rate_limited'), attempt('timeout')])).toBe('chain_exhausted');
  });
});

describe('blockCause', () => {
  const cooldownVisionDiag = [
    'g/v1: 1 key(s) — cooldown:1',
    'g/v2: 1 key(s) — cooldown:1',
    'g/v3: 1 key(s) — cooldown:1',
    'g/v4: 1 key(s) — cooldown:1',
    'g/v5: 1 key(s) — cooldown:1',
    'c/a: no vision support',
    'c/b: no vision support',
  ];

  it('DM1.1-9: non-429 statuses have no block cause', () => {
    for (const status of [502, 503, 413, 400]) {
      expect(blockCause({ status, requireVision: true, diag: [], attempts: [] })).toBeUndefined();
    }
  });

  it('DM1.1-10: vision, no attempts, only no-vision lines give no_vision_key', () => {
    expect(blockCause({
      status: 429,
      requireVision: true,
      diag: ['c/a: no vision support', 'c/b: no vision support', '5 model(s) skipped: no enabled+healthy key for platform (c)'],
      attempts: [],
    })).toEqual({ cause: 'no_vision_key' });
  });

  it('DM1.1-11: vision with cooldown diag gives vision_quota_exhausted/detail cooldown', () => {
    expect(blockCause({ status: 429, requireVision: true, diag: cooldownVisionDiag, attempts: [] }))
      .toEqual({ cause: 'vision_quota_exhausted', detail: 'cooldown' });
  });

  it('DM1.1-12: vision with rate_limited attempts and no diag', () => {
    expect(blockCause({ status: 429, requireVision: true, attempts: [attempt('rate_limited')] }))
      .toEqual({ cause: 'vision_quota_exhausted', detail: 'provider_limit' });
  });

  it('DM1.1-13: no vision flag means no vision cause even with no-vision diag', () => {
    expect(blockCause({ status: 429, requireVision: false, diag: cooldownVisionDiag, attempts: [] }))
      .toEqual({ cause: 'chain_exhausted' });
  });
});

describe('exhaustion payload and headers', () => {
  const base: ExhaustionBody = {
    status: 429, type: 'rate_limit_error', kind: 'rate_limit', message: 'exhausted', code: 'routing_exhausted',
  };

  it('DM1.1-14: cause is emitted only when present, detail only when present', () => {
    expect(exhaustionErrorPayload({ ...base, cause: 'cooldown' })).toEqual({
      message: 'exhausted', type: 'rate_limit_error', code: 'routing_exhausted', cause: 'cooldown',
    });
    expect(exhaustionErrorPayload({ ...base, cause: 'vision_quota_exhausted', causeDetail: 'cooldown' })).toEqual({
      message: 'exhausted', type: 'rate_limit_error', code: 'routing_exhausted',
      cause: 'vision_quota_exhausted', cause_detail: 'cooldown',
    });
    expect(exhaustionErrorPayload(base)).toEqual({
      message: 'exhausted', type: 'rate_limit_error', code: 'routing_exhausted',
    });
  });

  it('DM1.1-15: block headers are set before the Retry-After early return', () => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (name: string, value: string) => { headers[name] = value; } };
    setExhaustionHeaders(res, { ...base, cause: 'vision_quota_exhausted', causeDetail: 'cooldown' });
    expect(headers['X-Block-Cause']).toBe('vision_quota_exhausted');
    expect(headers['X-Block-Cause-Detail']).toBe('cooldown');
    expect(headers['Retry-After']).toBeUndefined();
  });
});
