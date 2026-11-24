import type { AttemptRecord } from './fallback-loop.js';

export type BaseBlockCause = 'cooldown' | 'provider_limit' | 'key_quota' | 'chain_exhausted';
export type BlockCause = 'no_vision_model' | 'no_vision_key' | 'vision_quota_exhausted' | BaseBlockCause;

export interface BlockCauseResult {
  cause: BlockCause;
  detail?: BaseBlockCause;
}

const CONFIG_LINE = /no provider registered|no enabled\+healthy key|no usable key|decrypt-error|no-resolved-provider|custom-key-mismatch/;
const NO_VISION_LINE = /no vision support/;
const REASON_LINE = /^(.+?):\s*\d+\s+key\(s\)\s+—\s+(.*)$/;
const REASON = /^([^:]+):\d+$/;

const PROVIDER_LIMIT_REASONS: ReadonlySet<string> = new Set([
  'provider-daily-cap', 'provider-minute-cap', 'provider-daily-token-cap', 'cloudflare-neuron-cap', 'checkin-required',
]);
const KEY_QUOTA_REASONS: ReadonlySet<string> = new Set([
  'rpm/rpd-limit', 'tpm/tpd-limit', 'monthly-budget-cap', 'key-concurrency',
]);
const IGNORED_REASONS: ReadonlySet<string> = new Set([
  'already-failed-this-request', 'decrypt-error', 'custom-key-mismatch', 'no-resolved-provider',
]);

type Family = BaseBlockCause | 'other';

function reasonFamily(reason: string): Family | undefined {
  if (reason === 'cooldown') return 'cooldown';
  if (PROVIDER_LIMIT_REASONS.has(reason)) return 'provider_limit';
  if (KEY_QUOTA_REASONS.has(reason)) return 'key_quota';
  if (IGNORED_REASONS.has(reason)) return undefined;
  return 'other';
}

function attemptFamily(errorClass: AttemptRecord['errorClass']): Family {
  if (errorClass === 'rate_limited') return 'provider_limit';
  if (errorClass === 'daily_quota_exhausted' || errorClass === 'out_of_credits' || errorClass === 'forbidden') return 'key_quota';
  return 'other';
}

function onlyFamily(families: ReadonlySet<Family>): BaseBlockCause {
  if (families.size === 1 && !families.has('other')) return [...families][0] as BaseBlockCause;
  return 'chain_exhausted';
}

export function baseBlockCause(diag: readonly string[], attempts: readonly AttemptRecord[], requireVision = true): BaseBlockCause {
  const families = new Set<Family>();

  for (const line of diag) {
    const lower = line.toLowerCase();
    const noVision = NO_VISION_LINE.test(lower);
    // Without a vision request, a "no vision support" diagnostic is not an
    // expected line: it counts as an unclassified reason (DM1.1-13).
    if ((requireVision && noVision) || lower.includes('ruled out earlier') || CONFIG_LINE.test(lower)) continue;
    const match = REASON_LINE.exec(line);
    if (!match) {
      families.add('other');
      continue;
    }
    for (const token of match[2].split(', ')) {
      const reason = REASON.exec(token)?.[1] ?? token;
      const family = reasonFamily(reason);
      if (family) families.add(family);
    }
  }

  for (const attempt of attempts) families.add(attemptFamily(attempt.errorClass));

  return onlyFamily(families);
}

export function blockCause(input: {
  status: number;
  requireVision: boolean;
  diag?: readonly string[];
  attempts: readonly AttemptRecord[];
}): BlockCauseResult | undefined {
  if (input.status !== 429) return undefined;

  const diag = input.diag ?? [];
  if (input.requireVision && input.attempts.length === 0 && diag.some(line => NO_VISION_LINE.test(line.toLowerCase())) &&
      diag.every(line => {
        const lower = line.toLowerCase();
        return NO_VISION_LINE.test(lower) || CONFIG_LINE.test(lower);
      })) {
    return { cause: 'no_vision_key' };
  }

  const detail = baseBlockCause(diag, input.attempts, input.requireVision);
  if (input.requireVision) return { cause: 'vision_quota_exhausted', detail };
  return { cause: detail };
}
