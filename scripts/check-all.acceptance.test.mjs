// Black-box acceptance for F0.10: the local gate must run the six CI steps in
// order, stop on the first failure, and keep the host/container paths separate.
// Everything runs through fake `npm`/`podman` executables first on PATH: no
// npm ci, no network, no :3001, no freeapi.db. It is deliberately NOT part of
// `npm test` (ADR-012, package.json belongs to the upstream).
//
// Run with: node --test scripts/check-all.acceptance.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(repo, 'scripts/check-all.sh');
const EXPECTED_STEPS = [
  'ci',
  'run test:migrations',
  'test',
  'run lint',
  'run build',
  '--prefix client run check:i18n',
];

/** ADR-004/008 strict marker adapted to node:test: only an AssertionError
 *  counts as "not built yet". The dev replaces `pendente(` with `test(`. */
function pendente(name, fn) {
  test(`[pendente] ${name}`, async () => {
    let err;
    try { await fn(); } catch (e) { err = e; }
    if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`);
    if (err?.name !== 'AssertionError') throw err;
  });
}

const scratchRoot = existsSync('/tmp/opencode') ? '/tmp/opencode' : tmpdir();
let scratch;
let counter = 0;

before(() => {
  scratch = mkdtempSync(join(scratchRoot, 'qa-f010-'));
  writeFileSync(join(scratch, 'npm'), `#!/bin/sh
printf 'NPM|%s|%s\\n' "$*" "$PWD" >> "$CHECK_ALL_LOG"
if [ -n "$CHECK_ALL_FAIL_ON" ] && [ "$*" = "$CHECK_ALL_FAIL_ON" ]; then
  echo "shim npm: falha simulada em $*" >&2
  exit 7
fi
exit 0
`, { mode: 0o755 });
  writeFileSync(join(scratch, 'podman'), `#!/bin/sh
printf 'PODMAN|%s\\n' "$*" >> "$CHECK_ALL_LOG"
if [ "$PODMAN_FAIL" = "1" ]; then
  echo "shim podman: falha simulada" >&2
  exit 127
fi
FREELLMAPI_CHECK_ALL_IN_CONTAINER=1 bash "$CHECK_ALL_SCRIPT"
`, { mode: 0o755 });
  chmodSync(join(scratch, 'npm'), 0o755);
  chmodSync(join(scratch, 'podman'), 0o755);
});

after(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

function run(args = [], overrides = {}) {
  const log = join(scratch, `log-${++counter}.txt`);
  const env = {
    ...process.env,
    PATH: `${scratch}:${process.env.PATH}`,
    CHECK_ALL_LOG: log,
    CHECK_ALL_SCRIPT: script,
    CHECK_ALL_FAIL_ON: '',
    PODMAN_FAIL: '',
    ...overrides,
  };
  // Called from another directory: the script must find the repo root itself.
  const result = spawnSync('bash', [script, ...args], {
    cwd: scratch, env, encoding: 'utf8', timeout: 30_000,
  });
  const text = existsSync(log) ? readFileSync(log, 'utf8').trim() : '';
  const lines = text === '' ? [] : text.split('\n');
  return { ...result, lines, npm: lines.filter(l => l.startsWith('NPM|')), podman: lines.filter(l => l.startsWith('PODMAN|')) };
}

function stepOf(line) {
  return line.slice('NPM|'.length).split('|')[0];
}

function requireScript() {
  assert.ok(existsSync(script), 'scripts/check-all.sh ainda não existe');
}

pendente('AF0.10-1 green host gate runs exactly the six CI steps, in order, from the repo root', () => {
  requireScript();
  const r = run();

  assert.equal(r.status, 0, `gate saiu ${r.status}: ${r.stderr}`);
  assert.deepEqual(r.npm.map(stepOf), EXPECTED_STEPS);
  assert.equal(r.podman.length, 0);
  for (const line of r.npm) {
    assert.equal(line.split('|')[1], repo, `cwd do passo ${stepOf(line)}`);
  }
});

pendente('AF0.10-1 the gate contains no side-effect escape hatch or production path', () => {
  requireScript();
  const text = readFileSync(script, 'utf8');
  for (const bad of [
    '3001', 'freeapi.db', 'docker-compose', 'podman-compose',
    '|| true', 'continue-on-error', '--no-verify', 'npm install',
  ]) {
    assert.ok(!text.includes(bad), `o gate não deve conter "${bad}"`);
  }
});

pendente('AF0.10-2 a failing step stops the gate and names the step in the banner', () => {
  requireScript();
  const migrations = run([], { CHECK_ALL_FAIL_ON: 'run test:migrations' });
  assert.notEqual(migrations.status, 0);
  assert.deepEqual(migrations.npm.map(stepOf), ['ci', 'run test:migrations']);
  assert.match(migrations.stdout + migrations.stderr, /test:migrations/);

  const build = run([], { CHECK_ALL_FAIL_ON: 'run build' });
  assert.notEqual(build.status, 0);
  assert.deepEqual(build.npm.map(stepOf), EXPECTED_STEPS.slice(0, 5));
  assert.match(build.stdout + build.stderr, /build/);
});

pendente('AF0.10-3 --container publishes no port, uses the mount and runs each step once', () => {
  requireScript();
  const r = run(['--container']);

  assert.equal(r.status, 0, `gate --container saiu ${r.status}: ${r.stderr}`);
  assert.equal(r.podman.length, 1);
  const args = r.podman[0].slice('PODMAN|'.length);
  for (const flag of ['--rm', '--entrypoint', '/app', 'FREELLMAPI_CHECK_ALL_IN_CONTAINER=1']) {
    assert.ok(args.includes(flag), `podman run deve trazer ${flag}`);
  }
  for (const flag of ['-p ', '--publish', '--network=host']) {
    assert.ok(!args.includes(flag), `podman run não deve publicar porta nem usar ${flag}`);
  }
  assert.deepEqual(r.npm.map(stepOf), EXPECTED_STEPS);
});

pendente('AF0.10-3 recursion and a missing podman fail before any host step runs', () => {
  requireScript();
  const recursive = run(['--container'], { FREELLMAPI_CHECK_ALL_IN_CONTAINER: '1' });
  assert.notEqual(recursive.status, 0);
  assert.equal(recursive.podman.length, 0);
  assert.equal(recursive.npm.length, 0);

  const missing = run(['--container'], { PODMAN_FAIL: '1' });
  assert.notEqual(missing.status, 0);
  assert.equal(missing.npm.length, 0);
  assert.match(missing.stdout + missing.stderr, /podman/i);
});
