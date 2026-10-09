import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync, utimesSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Run the real launchers in an isolated tree with inert dependencies. No .env,
// real Prisma client, database, HTTP endpoint or mail transport is accessed.
function fixture(t, mode) {
  const root = mkdtempSync(join(tmpdir(), 'v2-launcher-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, text) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  for (const name of ['run.mjs', 'environment.mjs', 'cms-worker.mjs']) {
    put(`scripts/${name}`, readFileSync(new URL(name, import.meta.url), 'utf8'));
  }
  put('scripts/load-env.mjs', `import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function loadEnv() { process.chdir(root); }
`);
  const record = value => `require('node:fs').appendFileSync(process.env.LAUNCH_LOG, ${JSON.stringify(value + '\n')});`;
  put('node_modules/prisma/build/index.js', record('migration-cli'));
  put('.next/standalone/server.js', `${record('web')} setTimeout(() => {}, 100);`);
  put('scripts/mail-worker.mjs', String.raw`import { appendFileSync } from 'node:fs'; appendFileSync(process.env.LAUNCH_LOG, 'mail-worker\n');`);
  put('node_modules/@prisma/client/package.json', JSON.stringify({ name: '@prisma/client', type: 'module', exports: './index.js' }));
  put('node_modules/@prisma/client/index.js', String.raw`import { appendFileSync } from 'node:fs';
export class PrismaClient {
  constructor() { appendFileSync(process.env.LAUNCH_LOG, 'prisma-created\n'); }
  async $disconnect() { appendFileSync(process.env.LAUNCH_LOG, 'prisma-disconnected\n'); }
}
`);
  put('src/modules/cms/schedule-worker.mjs', String.raw`import { appendFileSync } from 'node:fs';
export async function processCmsSchedules() {
  appendFileSync(process.env.LAUNCH_LOG, 'cms-batch\n');
  return { scanned: 0, results: [] };
}
`);
  const db = mode === 'local' ? 'aibildiri_v2' : `aibildiri_v2_${mode}`;
  const host = mode === 'local' ? '127.0.0.1:55432' : `db-v2-${mode}:5432`;
  const env = {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}`,
    APP_ENV: mode,
    APP_BASE_URL: mode === 'local' ? 'http://127.0.0.1:3100' : mode === 'preview' ? 'https://v2-preview.example.invalid' : 'https://kongre.stativera.store',
    V2_DB_HOST: `db-v2-${mode}`,
    DATABASE_URL: `postgresql://${db}:unit-test-only@${host}/${db}`,
    DIRECT_URL: `postgresql://${db}:unit-test-only@${host}/${db}`,
    SESSION_COOKIE_NAMESPACE: `aibildiri_v2_${mode}`,
    DRAFT_SESSION_SECRET: 'unit-test-only-secret-'.repeat(3),
    FILE_STORAGE: 'database',
    MAIL_MODE: mode === 'production' ? 'delivery' : 'capture',
    EMAIL_DELIVERY_ENABLED: mode === 'production' ? 'true' : 'false',
    MAIL_CAPTURE_DIR: mode === 'local' ? '.local/mail' : '/app/.preview/mail',
    PREVIEW_ACCESS_USER: 'test', PREVIEW_ACCESS_PASSWORD: 'unit-test-access-'.repeat(3),
    LAUNCH_LOG: join(root, 'launch.log'),
  };
  const invoke = (path, args, overrides = {}) => spawnSync(process.execPath, [path, ...args], {
    cwd: root, env: { ...env, ...overrides }, encoding: 'utf8', timeout: 10000,
  });
  const entries = () => existsSync(env.LAUNCH_LOG) ? readFileSync(env.LAUNCH_LOG, 'utf8').trim().split('\n') : [];
  return { invoke, entries, put, root };
}

for (const mode of ['local', 'preview', 'production']) {
  for (const path of ['scripts/cms-worker.mjs', 'scripts/run.mjs']) {
    test(`${mode} CMS job runs through ${path} after environment validation`, t => {
      const f = fixture(t, mode);
      const result = f.invoke(path, path.endsWith('/run.mjs') ? ['cms-worker', '--once'] : ['--once']);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(f.entries(), ['prisma-created', 'cms-batch', 'prisma-disconnected']);
    });
  }
}

test('direct CMS worker rejects unsafe environment before constructing Prisma', t => {
  const f = fixture(t, 'production');
  const result = f.invoke('scripts/cms-worker.mjs', ['--once'], { SESSION_COOKIE_NAMESPACE: 'old-live-session' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SESSION_COOKIE_NAMESPACE/);
  assert.deepEqual(f.entries(), []);
});

for (const mode of ['preview', 'production']) {
  test(`${mode} web start never starts embedded workers, even with autostart flags`, t => {
    const f = fixture(t, mode);
    f.put('scripts/cms-worker.mjs', String.raw`import { appendFileSync } from 'node:fs'; appendFileSync(process.env.LAUNCH_LOG, 'cms-worker\n');`);
    const result = f.invoke('scripts/run.mjs', ['start'], { MAIL_WORKER_AUTOSTART: 'true', CMS_WORKER_AUTOSTART: 'true' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(f.entries(), ['web']);
  });
}

test('production migration launcher refuses to invoke Prisma without confirmation', t => {
  const f = fixture(t, 'production');
  const result = f.invoke('scripts/run.mjs', ['migrate']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /V2_PRODUCTION_MIGRATION_CONFIRM/);
  assert.deepEqual(f.entries(), []);
});

test('production migration launcher invokes only the migration job when confirmed', t => {
  const f = fixture(t, 'production');
  const result = f.invoke('scripts/run.mjs', ['migrate'], { V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(f.entries(), ['migration-cli']);
});

test('production migration confirmation cannot bypass an unsafe target', t => {
  const f = fixture(t, 'production');
  const result = f.invoke('scripts/run.mjs', ['migrate'], {
    V2_PRODUCTION_MIGRATION_CONFIRM: 'aibildiri_v2_production',
    DIRECT_URL: 'postgresql://legacy:unit-test-only@db-v2-production:5432/aibildiri',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dedicated database and user required/);
  assert.deepEqual(f.entries(), []);
});

for (const worker of ['mail', 'cms']) {
  const key = `${worker.toUpperCase()}_WORKER_HEARTBEAT_FILE`;
  function workerFixture(t, fails = false) {
    const f = fixture(t, 'production');
    f.put(`scripts/${worker}-worker.mjs`, readFileSync(new URL(`${worker}-worker.mjs`, import.meta.url), 'utf8'));
    if (worker === 'mail') {
      f.put('src/modules/communication/transport.mjs', "export function createEmailTransport() { return { provider: 'test' }; }");
      f.put('src/modules/communication/queue.mjs', fails
        ? "export async function processEmailQueue() { throw new Error('synthetic database failure'); }"
        : 'export async function processEmailQueue() { return { claimed: 0, results: [] }; }');
    } else if (fails) {
      f.put('src/modules/cms/schedule-worker.mjs', "export async function processCmsSchedules() { throw new Error('synthetic database failure'); }");
    }
    return f;
  }
  test(`${worker} worker writes an atomic heartbeat after a successful batch`, t => {
    const f = workerFixture(t);
    const path = join(f.root, `${worker}-heartbeat`);
    const result = f.invoke(`scripts/${worker}-worker.mjs`, ['--once'], { [key]: path });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(Number.isFinite(Date.parse(readFileSync(path, 'utf8').trim())));
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(f.root).filter(name => name.startsWith(`${worker}-heartbeat`)), [`${worker}-heartbeat`]);
  });
  test(`${worker} worker does not refresh its heartbeat after a failed batch`, t => {
    const f = workerFixture(t, true);
    const path = join(f.root, `${worker}-heartbeat`);
    writeFileSync(path, 'previous successful batch\n');
    utimesSync(path, new Date('2020-01-01T00:00:00Z'), new Date('2020-01-01T00:00:00Z'));
    const before = statSync(path).mtimeMs;
    const result = f.invoke(`scripts/${worker}-worker.mjs`, ['--once'], { [key]: path });
    assert.equal(result.status, 1);
    assert.equal(statSync(path).mtimeMs, before);
    assert.equal(readFileSync(path, 'utf8'), 'previous successful batch\n');
    assert.match(result.stderr, /worker could not finish a batch/);
    assert.doesNotMatch(result.stderr, /synthetic database failure/);
    assert.deepEqual(f.entries(), ['prisma-created', 'prisma-disconnected']);
  });
  test(`${worker} worker does not create a heartbeat for invalid configuration`, t => {
    const f = workerFixture(t);
    const path = join(f.root, `${worker}-heartbeat`);
    const result = f.invoke(`scripts/${worker}-worker.mjs`, ['--once'], { [key]: path, FILE_STORAGE: 'unconfigured' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /FILE_STORAGE/);
    assert.equal(existsSync(path), false);
    assert.deepEqual(f.entries(), []);
  });
}
