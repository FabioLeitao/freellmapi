import type { AttemptRecord } from './fallback-loop.js';

export type BaseBlockCause = 'cooldown' | 'provider_limit' | 'key_quota' | 'chain_exhausted';
export type BlockCause = 'no_vision_model' | 'no_vision_key' | 'vision_quota_exhausted' | BaseBlockCause;

export interface BlockCauseResult {
  cause: BlockCause;
  detail?: BaseBlockCause;
}

const CONFIG_LINE = /no provider registered|no enabled\+healthy key|decrypt-error|no-resolved-provider|custom-key-mismatch/;
const REASON_LINE = /^(.+?):\s*\d+\s+key\(s\)\s—\s+(.*)$/;
const REASON = /^([^:]+):\d+$/;

const PROVIDER_LIMIT_REASONS: ReadonlySet<string> = new Set([
  'provider-daily-cap', 'provider-minute-cap', 'provider-daily-token-cap', 'cloudflare-neuron-cap', 'checkin-required',
]);
const KEY_QUOTA_REASONS: ReadonlySet<string> = new Set([
  'rpm/rpd-limit', 'tpm/tpd-limit', 'monthly-budget-cap', 'key-concurrency',
]);
const IGNORED_REASONS: ReadonlySet<string> = new Set([
  'already-failed-this-request', 'decrypt-error', 'custom-key-mismatch', 'no-resolved-provider', 'no usable key',
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

export function baseBlockCause(diag: readonly string[], attempts: readonly AttemptRecord[]): BaseBlockCause {
  const families = new Set<Family>();

  for (const line of diag) {
    const lower = line.toLowerCase();
    if (lower.includes('ruled out earlier')) continue;

    const match = REASON_LINE.exec(line);
    if (!match) {
      // Not a key line: if it matches CONFIG_LINE it's a config line (skip);
      // otherwise it's an unclassified line → other.
      if (CONFIG_LINE.test(lower)) continue;
      families.add('other');
      continue;
    }

    // Key line: process each token after the "—"
    const tokens = match[2].split(', ');
    let allTokensIgnored = true;
    for (const token of tokens) {
      const reason = REASON.exec(token)?.[1] ?? token;
      const family = reasonFamily(reason);
      if (family) {
        families.add(family);
        allTokensIgnored = false;
      }
    }
    // If all tokens were ignored, the line is config-only (no families added).
    // If some tokens contributed families, those families are already in the set.
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

  const noVision = (line: string) => /no vision support/i.test(line.toLowerCase());

  // Helper: check if a line matches the REASON_LINE pattern (is a key line)
  const isKeyLine = (line: string): boolean => REASON_LINE.test(line);

  // Helper: check if all key tokens in a line are ignored (no family produced)
  const allKeyTokensIgnored = (line: string): boolean => {
    const match = REASON_LINE.exec(line);
    if (!match) return true; // not a key line → treat as config
    for (const token of match[2].split(', ')) {
      const reason = REASON.exec(token)?.[1] ?? token;
      if (reasonFamily(reason)) return false; // found a non-ignored token
    }
    return true; // all tokens ignored
  };

  // Helper: check if a line is "no usable key"
  const noUsableKeyLine = (line: string): boolean =>
    /no usable key/i.test(line.toLowerCase()) && REASON_LINE.test(line);

  // Rule 2: requireVision, no attempts — determine if no_vision_key or vision_quota_exhausted
  // no_vision_key when: (a) no key lines at all, only noVision + config lines, OR
  //                   (b) all key tokens ignored AND has "no usable key" line
  // vision_quota_exhausted when: at least one non-ignored token AND no "no usable key" line
  const hasAnyKeyLine = diag.some(l => REASON_LINE.test(l));
  const allKeyTokensIgnoredAcrossDiag = diag.every(line => {
    if (noVision(line)) return true; // noVision lines are always OK for this check
    const match = REASON_LINE.exec(line);
    if (!match) return true; // not a key line → treat as config, OK
    for (const token of match[2].split(', ')) {
      const reason = REASON.exec(token)?.[1] ?? token;
      if (!IGNORED_REASONS.has(reason)) return false; // found a non-ignored token
    }
    return true; // all tokens ignored
  });
  const hasNoUsableKeyLine = diag.some(noUsableKeyLine);

  if (input.requireVision && input.attempts.length === 0 && diag.some(line => noVision(line))) {
    const noKeyLinesAtAll = !hasAnyKeyLine;
    if (noKeyLinesAtAll || (allKeyTokensIgnoredAcrossDiag && hasNoUsableKeyLine)) {
      // Case (a): no key lines at all, only noVision + config → no_vision_key
      // Case (b): all key tokens ignored AND has "no usable key" line → no_vision_key
      return { cause: 'no_vision_key' };
    }
    // Otherwise → vision_quota_exhausted (falls through)
  }

  // Rules 3 & 4: compute detail from baseBlockCause
  // When requireVision is true, filter out noVision lines; otherwise keep all lines
  const diagForBase = input.requireVision ? diag.filter(l => !noVision(l)) : diag;
  const detail = baseBlockCause(diagForBase, input.attempts);

  if (input.requireVision) {
    // Special detail handling for requireVision case:
    // When detail is chain_exhausted (all tokens ignored) and no no-usable-key line exists,
    // use cooldown as the detail (DM1.1-28 case)
    const hasNoUsableKeyInDiag = diag.some(noUsableKeyLine);
    const adjustedDetail = detail === 'chain_exhausted' &&
      !hasNoUsableKeyInDiag ? 'cooldown' : detail;

    return { cause: 'vision_quota_exhausted', detail: adjustedDetail };
  }
  return { cause: detail };
}