// Independent network namespace: existing APP_ENV=local safety checks remain unchanged.
import { cpSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const state = resolve(root, '.local/isolated-acceptance');
const app = resolve(state, 'app');
const context = 'colima-kongre-test';
const dbName = 'kongre-acceptance-db';
const appName = 'kongre-acceptance-app';
const image = 'kongre-local-test-runtime';
const marker = resolve(state, 'synthetic-only.json');
const copied = ['src', 'scripts', 'prisma', 'public', 'data', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs'];
function docker(args, options = {}) {
  const result = spawnSync('docker', ['--context', context, ...args], { cwd: root, stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`Isolated Docker operation failed: ${args[0]}`);
}
function containerExists(name) {
  return spawnSync('docker', ['--context', context, 'container', 'inspect', '--format', '{{.Id}}', name], { stdio: 'ignore' }).status === 0;
}
function checked() {
  if (!existsSync(marker) || JSON.parse(readFileSync(marker, 'utf8')).syntheticOnly !== true) throw new Error('Run prepare before using the isolated environment');
}
function sync() { for (const name of copied) if (existsSync(resolve(root, name))) cpSync(resolve(root, name), resolve(app, name), { recursive: true }); }
const action = process.argv[2];
if (action === 'prepare') {
  if (existsSync(state)) throw new Error('Isolated state already exists; use sync or start');
  mkdirSync(app, { recursive: true, mode: 0o700 });
  sync();
  const password = randomBytes(32).toString('hex');
  const url = `postgresql://aibildiri_v2:${password}@127.0.0.1:55432/aibildiri_v2`;
  const environment = ['APP_ENV=local', `DATABASE_URL=${url}`, `DIRECT_URL=${url}`, 'APP_BASE_URL=http://127.0.0.1:3100', 'SESSION_COOKIE_NAMESPACE=aibildiri_v2_local', `DRAFT_SESSION_SECRET=${randomBytes(32).toString('hex')}`, 'FILE_STORAGE=database', 'MAIL_MODE=capture', 'MAIL_CAPTURE_DIR=.local/mail', 'ISOLATED_LOCAL_TEST=synthetic-only', 'SMTP_HOST=', 'SMTP_USER=', 'SMTP_PASS=', 'SMTP_FROM=', 'RESEND_API_KEY=', 'RESEND_SENDER_EMAIL='].join('\n') + '\n';
  writeFileSync(resolve(app, '.env'), environment, { mode: 0o600, flag: 'wx' });
  writeFileSync(resolve(state, 'db.env'), `POSTGRES_USER=aibildiri_v2\nPOSTGRES_DB=aibildiri_v2\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(marker, JSON.stringify({ syntheticOnly: true, sourceCopiedFrom: root, app, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log('Disposable source copy prepared; no working DB or .env was copied.');
} else if (action === 'install') {
  checked();
  docker(['build', '-t', image, '-f', 'deploy/Dockerfile.local-test', '.']);
  if (containerExists(dbName)) docker(['start', dbName]);
  else docker(['run', '-d', '--name', dbName, '--env-file', resolve(state, 'db.env'), '--publish', '127.0.0.1:3102:3101', '--mount', 'type=volume,source=kongre-acceptance-postgres,target=/var/lib/postgresql/data', 'postgres:16-alpine', 'postgres', '-p', '55432']);
  const run = command => docker(['run', '--rm', '--network', `container:${dbName}`, '--mount', `type=bind,source=${app},target=/app`, image, ...command]);
  run(['npm', 'ci']);
  run(['node', 'scripts/run.mjs', 'migrate']);
  run(['node', 'scripts/seed.mjs']);
} else if (action === 'start') {
  checked();
  docker(['start', dbName]);
  if (containerExists(appName)) docker(['start', appName]);
  else docker(['run', '-d', '--name', appName, '--network', `container:${dbName}`, '--mount', `type=bind,source=${app},target=/app`, image, 'node', 'scripts/isolated-test-server.mjs']);
  console.log('Browser: http://kongre-test.localhost:3102/admin (separate browser cookie host).');
} else if (action === 'sync') {
  checked(); sync(); console.log('Source copied; test DB, credentials and test outputs preserved.');
} else if (action === 'exec') {
  checked();
  const script = process.argv[3];
  if (!/^scripts\/[a-z0-9-]+\.mjs$/.test(script ?? '')) throw new Error('Choose one scripts/*.mjs file');
  docker(['exec', appName, 'node', script, ...process.argv.slice(4)]);
} else if (action === 'status') {
  checked(); docker(['ps', '--filter', 'name=kongre-acceptance-', '--format', '{{.Names}} {{.Status}}']);
} else if (action === 'stop') {
  checked(); docker(['stop', appName, dbName]);
} else throw new Error('Choose prepare, install, start, sync, exec, status or stop');
