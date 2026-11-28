// Black-box acceptance for F0.5: the tag printed by the operator's wrapper has
// the canonical form, and the version a client reads from a built image is the
// tag that was baked into it — or the desktop version when no build-arg was
// given. No application module is imported. The image is built with --no-install
// semantics and run on an ephemeral host port; the :3001 service is untouched.
//
// Run with: node --test scripts/version-marker.acceptance.test.mjs
// Requires podman and the operator's wrapper on PATH/HOME.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = join(process.env.HOME ?? '', '.local/bin/freellmapi-databoar-build');
// T0.5 corrected: up-<upstream sha8>.databoar-<ref sha8>[.label], never <tag>-<n>-g<sha>.
const TAG = 'up-abc12345.databoar-def67890.zeroclassifier';
const DESKTOP_VERSION = JSON.parse(readFileSync(join(repo, 'desktop/package.json'), 'utf8')).version;
const scratchRoot = existsSync('/tmp/opencode') ? '/tmp/opencode' : tmpdir();

let scratch;
const madeImages = [];
const madeContainers = [];

before(() => {
  scratch = mkdtempSync(join(scratchRoot, 'qa-f05-'));
});

after(() => {
  for (const name of madeContainers) {
    try { execFileSync('podman', ['rm', '-f', name], { stdio: 'ignore' }); } catch { /* already gone */ }
  }
  for (const image of madeImages) {
    try { execFileSync('podman', ['image', 'rm', '-f', image], { stdio: 'ignore' }); } catch { /* shared layers */ }
  }
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

function requireTool(file, label) {
  assert.ok(existsSync(file), `${label} não está disponível neste host: ${file}`);
}

function makeSyntheticRepo() {
  const path = join(scratch, 'repo');
  // Ignore the operator's global git hooks/aliases: this is a hermetic fixture.
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
  const git = (args) => execFileSync('git', ['-C', path, ...args], { encoding: 'utf8', env }).trim();
  execFileSync('git', ['init', '-q', '-b', 'main', path], { encoding: 'utf8', env });
  git(['config', 'user.email', 'qa@example.invalid']);
  git(['config', 'user.name', 'QA']);
  writeFileSync(join(path, 'README.md'), 'base\n');
  git(['add', 'README.md']);
  git(['commit', '-q', '-m', 'base']);
  git(['remote', 'add', 'upstream', path]);
  git(['remote', 'add', 'origin', path]);
  git(['update-ref', 'refs/remotes/upstream/main', git(['rev-parse', 'HEAD'])]);
  writeFileSync(join(path, 'README.md'), 'base\npatch\n');
  git(['commit', '-qam', 'patch']);
  git(['update-ref', 'refs/remotes/origin/main', git(['rev-parse', 'HEAD'])]);
  const labels = join(scratch, 'empty-labels.tsv');
  writeFileSync(labels, '');
  return { path, labels };
}

function buildImage(suffix, buildArgs) {
  const image = `localhost/freellmapi:qa-f05-${suffix}-${process.pid}`;
  const args = ['build', '-q', ...buildArgs, '-t', image, '.'];
  const result = spawnSync('podman', args, { cwd: repo, encoding: 'utf8', timeout: 900_000 });
  assert.equal(result.status, 0, `podman build falhou: ${result.stderr}`);
  madeImages.push(image);
  return image;
}

async function versionFromImage(image) {
  const name = `qa-f05-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  madeContainers.push(name);
  // A fresh image has no .env: the production server needs a key to boot.
  // A throwaway 64-zero test key never leaves this container.
  const run = spawnSync('podman', ['run', '-d', '--rm', '--name', name, '-p', '127.0.0.1::3001',
    '-e', `ENCRYPTION_KEY=${'0'.repeat(64)}`, image], {
    encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(run.status, 0, `podman run falhou: ${run.stderr}`);
  const portLine = execFileSync('podman', ['port', name, '3001'], { encoding: 'utf8' }).trim();
  const port = Number(portLine.split(':').at(-1));
  assert.ok(Number.isInteger(port) && port > 0, `porta efêmera inválida: ${portLine}`);
  const base = `http://127.0.0.1:${port}`;

  // Bounded readiness loop for the container, not a timing dependency of the
  // behavior under test.
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    try { ready = (await fetch(`${base}/api/ping`)).ok; } catch { /* booting */ }
    if (!ready) await new Promise(r => setTimeout(r, 250));
  }
  if (!ready) {
    const logs = spawnSync('podman', ['logs', name], { encoding: 'utf8' });
    assert.ok(ready, `o contêiner não respondeu /api/ping; logs: ${String(logs.stdout ?? '').slice(-400)}`);
  }

  // First-run claim from inside the container: loopback needs no setup code.
  // It is still a plain HTTP client call to the dashboard API.
  const script = "fetch('http://127.0.0.1:3001/api/auth/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'qa@f05.example',password:'acceptance-password'})}).then(async r=>{const b=await r.json();if(!r.ok){console.error(JSON.stringify(b));process.exit(1)}console.log(b.token)})";
  const token = execFileSync('podman', ['exec', name, 'node', '-e', script], { encoding: 'utf8', timeout: 60_000 }).trim();
  assert.ok(token, 'o setup não devolveu token de sessão');

  const res = await fetch(`${base}/api/settings/version`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200, `GET /api/settings/version -> ${res.status}`);
  const body = await res.json();
  execFileSync('podman', ['rm', '-f', name], { stdio: 'ignore' });
  madeContainers.splice(madeContainers.indexOf(name), 1);
  return body.version;
}

test('AF0.5-1 wrapper --print-version prints the canonical up-…databoar-… tag', () => {
  requireTool(wrapper, 'freellmapi-databoar-build');
  const { path, labels } = makeSyntheticRepo();
  const result = spawnSync(wrapper, ['--print-version', '--ref', 'origin/main', '--no-install'], {
    env: {
      ...process.env,
      FREELLMAPI_REPO: path,
      FREELLMAPI_DATABOAR_LABELS: labels,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
    },
    encoding: 'utf8', timeout: 60_000,
  });
  assert.equal(result.status, 0, `wrapper saiu ${result.status}: ${result.stderr}`);
  const upstream = execFileSync('git', ['-C', path, 'rev-parse', 'upstream/main'], { encoding: 'utf8' }).trim();
  const ref = execFileSync('git', ['-C', path, 'rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
  assert.equal(
    result.stdout.trim(),
    `image: localhost/freellmapi:up-${upstream.slice(0, 8)}.databoar-${ref.slice(0, 8)}`,
  );
});

function pendente(name, fn) {
  test(`[pendente] ${name}`, async () => {
    let err;
    try { await fn(); } catch (e) { err = e; }
    if (err === undefined) throw new Error(`pendente passou: tire a marca de "${name}"`);
    if (err?.name !== 'AssertionError') throw err;
  });
}

pendente('AF0.5-2 image built with --build-arg FREEAPI_VERSION serves that exact tag', async () => {
  const image = buildImage('with-version', [
    '--build-arg', 'FREELLMAPI_COMMIT_SHA=abc12345',
    '--build-arg', `FREEAPI_VERSION=${TAG}`,
  ]);
  const env = execFileSync('podman', ['image', 'inspect', image, '--format', '{{json .Config.Env}}'], { encoding: 'utf8' });
  assert.ok(JSON.parse(env).includes(`FREEAPI_VERSION=${TAG}`), 'a imagem não carrega FREEAPI_VERSION');

  assert.equal(await versionFromImage(image), TAG);
});

// Already true on main: a build without the new build-arg has no FREEAPI_VERSION
// in its image config and the endpoint falls back to desktop/package.json.
// Guard, not a pending feature.
test('AF0.5-3 image built without the build-arg keeps the desktop version', async () => {
  const image = buildImage('without-version', ['--build-arg', 'FREELLMAPI_COMMIT_SHA=abc12345']);
  const env = execFileSync('podman', ['image', 'inspect', image, '--format', '{{json .Config.Env}}'], { encoding: 'utf8' });
  assert.ok(!JSON.parse(env).some(v => v.startsWith('FREEAPI_VERSION=')), 'build sem patches não deve inventar versão');

  assert.equal(await versionFromImage(image), DESKTOP_VERSION);
});
