// A disposable PostgreSQL cluster proves a fresh deployment without opening the
// working .env or touching the user's local/remote application databases.
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { mkdtemp, cp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/platform/password.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pgBin = process.env.PG_BIN ?? '/opt/homebrew/opt/postgresql@16/bin';
const scratch = await mkdtemp(join(tmpdir(), 'kongre-db-check-'));
// PostgreSQL socket paths on macOS have a short maximum; use a private short path.
const socket = await mkdtemp('/private/tmp/kongre-pg-socket-');
const app = join(scratch, 'app');
const data = join(scratch, 'postgres');
let started = false, prisma, step = 'prepare', checks = 0;
function runPg(command, args, env) {
  return execFileSync(join(pgBin, command), args, { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function checkCli(script, args, env, expected = 0, input) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: app, env, input, encoding: 'utf8', timeout: 120000 });
  // Command output can contain connection details. Report only assertion failures.
  assert.equal(result.status, expected, `Unexpected exit at ${step}`);
  checks++;
  return result.stdout;
}
try {
  await mkdir(app, { mode: 0o700 });
  for (const directory of ['scripts', 'src', 'prisma']) await cp(resolve(root, directory), join(app, directory), { recursive: true });
  await symlink(resolve(root, 'node_modules'), join(app, 'node_modules'));
  await cp(resolve(root, 'package.json'), join(app, 'package.json'));
  const listener = createServer();
  await new Promise((accept, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', accept); });
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const password = randomBytes(32).toString('hex');
  const passwordFile = join(scratch, 'pg-password');
  await writeFile(passwordFile, password + '\n', { mode: 0o600 });
  const username = 'aibildiri_v2_production';
  step = 'initialize isolated cluster';
  runPg('initdb', ['-D', data, `--username=${username}`, '--auth-local=trust', '--auth-host=scram-sha-256', `--pwfile=${passwordFile}`, '--encoding=UTF8', '--no-locale']);
  runPg('pg_ctl', ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${socket} -c unix_socket_permissions=0700`, '-w', 'start']);
  started = true;
  const pgEnv = { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: username, PGPASSWORD: password };
  runPg('createdb', [username], pgEnv);
  const url = `postgresql://${username}:${password}@127.0.0.1:${port}/${username}`;
  // Deliberately do not inherit SMTP, DB or application settings from the host.
  const env = {
    PATH: process.env.PATH, APP_ENV: 'production', NODE_ENV: 'production',
    APP_BASE_URL: 'https://kongre.stativera.store', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_production',
    DATABASE_URL: url, DIRECT_URL: url, V2_DB_HOST: '127.0.0.1',
    DRAFT_SESSION_SECRET: randomBytes(32).toString('hex'), FILE_STORAGE: 'database',
    MAIL_MODE: 'delivery', EMAIL_DELIVERY_ENABLED: 'true', MAIL_PROVIDER: 'smtp',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: '9', SMTP_USER: 'never-used', SMTP_PASS: 'never-used',
    SMTP_SECURE: 'false', SMTP_FROM: 'test@example.invalid',
  };
  step = 'migration without confirmation';
  checkCli('scripts/run.mjs', ['migrate'], env, 1);
  step = 'fresh production migrations';
  checkCli('scripts/run.mjs', ['migrate'], { ...env, V2_PRODUCTION_MIGRATION_CONFIRM: username });
  prisma = new PrismaClient({ datasources: { db: { url } }, log: [] });
  assert.equal(await prisma.platformUser.count(), 0);
  const migrations = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  step = 'bootstrap without confirmation';
  const account = { name: 'Türkçe Şule İğdır', email: 'owner@integration.example.org', passwordHash: hashPassword(randomBytes(24).toString('hex')) };
  checkCli('scripts/bootstrap-production.mjs', ['--stdin'], env, 1, JSON.stringify(account));
  assert.equal(await prisma.platformUser.count(), 0);
  step = 'first administrator';
  checkCli('scripts/bootstrap-production.mjs', ['--stdin'], { ...env, V2_BOOTSTRAP_CONFIRM: username }, 0, JSON.stringify(account));
  const owner = await prisma.platformUser.findUnique({ where: { email: account.email } });
  assert.equal(owner.name, account.name);
  assert.equal(owner.passwordHash, account.passwordHash);
  assert.equal(owner.platformAdmin, true);
  assert.equal(await prisma.auditLog.count({ where: { action: 'platform.bootstrap' } }), 1);
  assert.equal(await prisma.emailMessage.count(), 0);
  checks++;
  step = 'repeat bootstrap cannot overwrite administrator';
  const replacement = { ...account, passwordHash: hashPassword('a-different-unused-password') };
  checkCli('scripts/bootstrap-production.mjs', ['--stdin'], { ...env, V2_BOOTSTRAP_CONFIRM: username }, 1, JSON.stringify(replacement));
  assert.equal(await prisma.platformUser.count(), 1);
  assert.equal((await prisma.platformUser.findUnique({ where: { id: owner.id } })).passwordHash, owner.passwordHash);
  step = 'empty mail worker and CMS worker';
  checkCli('scripts/mail-worker.mjs', ['--once'], { ...env, MAIL_WORKER_HEARTBEAT_FILE: join(scratch, 'mail-heartbeat') });
  checkCli('scripts/cms-worker.mjs', ['--once'], { ...env, CMS_WORKER_HEARTBEAT_FILE: join(scratch, 'cms-heartbeat') });
  step = 'backup and separate restore';
  runPg('pg_dump', ['-Fc', '-f', join(scratch, 'database.dump'), username], pgEnv);
  runPg('createdb', ['production_restore_check'], pgEnv);
  runPg('pg_restore', ['--exit-on-error', '-d', 'production_restore_check', join(scratch, 'database.dump')], pgEnv);
  const restored = new PrismaClient({ datasources: { db: { url: url.replace(/\/aibildiri_v2_production$/, '/production_restore_check') } }, log: [] });
  try {
    const restoredOwner = await restored.platformUser.findUnique({ where: { id: owner.id } });
    assert.deepEqual(restoredOwner, owner);
    assert.equal(verifyPassword('a-different-unused-password', restoredOwner.passwordHash), false);
    assert.equal(await restored.auditLog.count(), 1);
    checks++;
  } finally { await restored.$disconnect(); }
  const report = { passed: true, checks, appliedMigrations: migrations[0].count, realEmailSent: false, workingDatabaseOpened: false, createdAt: new Date().toISOString() };
  await mkdir(resolve(root, '.local'), { recursive: true, mode: 0o700 });
  await writeFile(resolve(root, '.local/production-database-result.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch {
  console.error(`Isolated production database verification failed at: ${step}`);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
  if (started) {
    try { runPg('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']); }
    catch { console.error('Temporary PostgreSQL did not stop; temporary files retained.'); process.exitCode = 1; }
  }
  // A running cluster must retain its data files even if shutdown fails.
  if (!started || spawnSync(join(pgBin, 'pg_ctl'), ['-D', data, 'status'], { stdio: 'ignore' }).status === 3) {
    await rm(scratch, { recursive: true, force: true });
    await rm(socket, { recursive: true, force: true });
  }
}
