import { mkdirSync, existsSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assertLocal } from './environment.mjs';
import { loadEnv, root } from './load-env.mjs';

const action = process.argv[2];
process.chdir(root);
const state = resolve(root, '.local');
mkdirSync(state, { recursive: true, mode: 0o700 }); chmodSync(state, 0o700);
function run(tool, args, options = {}) {
  const result = spawnSync(tool, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    // Never echo command args or environment, which may contain credentials.
    throw new Error(`${tool} failed: ${result.stderr || result.error?.message || 'check .local logs'}`);
  }
  return result.stdout;
}
if (action === 'setup') {
  if (!existsSync('.env')) {
    const secret = () => randomBytes(32).toString('hex');
    const dbPassword = secret();
    const content = [
      'APP_ENV=local',
      `DATABASE_URL=postgresql://aibildiri_v2:${dbPassword}@127.0.0.1:55432/aibildiri_v2`,
      `DIRECT_URL=postgresql://aibildiri_v2:${dbPassword}@127.0.0.1:55432/aibildiri_v2`,
      'APP_BASE_URL=http://127.0.0.1:3100',
      'SESSION_COOKIE_NAMESPACE=aibildiri_v2_local',
      `DRAFT_SESSION_SECRET=${secret()}`, `ADMIN_SESSION_SECRET=${secret()}`, `ADMIN_PASSWORD=${secret()}`,
      'FILE_STORAGE=database', 'MAIL_MODE=capture', 'MAIL_CAPTURE_DIR=.local/mail',
      'SMTP_HOST=', 'SMTP_USER=', 'SMTP_PASS=', 'SMTP_FROM=', 'RESEND_API_KEY=', 'RESEND_SENDER_EMAIL=',
    ].join('\n') + '\n';
    writeFileSync('.env', content, { mode: 0o600, flag: 'wx' });
  }
  loadEnv(); assertLocal();
  chmodSync('.env', 0o600);
  mkdirSync(resolve(state, 'mail'), { recursive: true, mode: 0o700 });
  console.log('Independent local configuration ready; credentials kept in v2/.env.');
} else {
  loadEnv(); assertLocal();
  const pgdata = resolve(state, 'postgres');
  // Short, private socket path avoids macOS Unix socket length limits.
  const socket = '/private/tmp/aibildiri-v2-local';
  mkdirSync(socket, { recursive: true, mode: 0o700 }); chmodSync(socket, 0o700);
  if (action === 'db:init') {
    if (existsSync(resolve(pgdata, 'PG_VERSION'))) throw new Error('Local cluster already initialized; use db:start');
    const passwordFile = resolve(state, 'pg-password.tmp');
    writeFileSync(passwordFile, decodeURIComponent(new URL(process.env.DATABASE_URL).password) + '\n', { mode: 0o600 });
    try {
      const output = run('initdb', ['-D', pgdata, '--username=aibildiri_v2', '--auth-local=trust', '--auth-host=scram-sha-256', `--pwfile=${passwordFile}`, '--encoding=UTF8', '--no-locale']);
      writeFileSync(resolve(state, 'postgres-init.log'), output, { mode: 0o600 });
    } finally { unlinkSync(passwordFile); }
    console.log('Local PostgreSQL cluster initialized.');
  } else if (action === 'db:start') {
    const options = `-h 127.0.0.1 -p 55432 -k ${socket} -c unix_socket_permissions=0700`;
    if (spawnSync('pg_ctl', ['-D', pgdata, 'status'], { stdio: 'ignore' }).status !== 0) run('pg_ctl', ['-D', pgdata, '-l', resolve(state, 'postgres.log'), '-o', options, 'start']);
    const env = { ...process.env, PGPASSWORD: decodeURIComponent(new URL(process.env.DATABASE_URL).password) };
    const args = ['-h', '127.0.0.1', '-p', '55432', '-U', 'aibildiri_v2', '-d', 'postgres', '-XAt', '-v', 'ON_ERROR_STOP=1'];
    const exists = run('psql', [...args, '-c', "SELECT 1 FROM pg_database WHERE datname='aibildiri_v2'"], { env }).trim();
    if (!exists) run('createdb', ['-h', '127.0.0.1', '-p', '55432', '-U', 'aibildiri_v2', 'aibildiri_v2'], { env });
    console.log('Local PostgreSQL ready on 127.0.0.1:55432 (aibildiri_v2).');
  } else if (action === 'db:stop') {
    run('pg_ctl', ['-D', pgdata, '-m', 'fast', 'stop']); console.log('Local PostgreSQL stopped.');
  } else if (action === 'mail:latest') {
    // Open mail files locally; no tokens or recipients are printed into logs.
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(resolve(state, 'mail')).filter(x => x.endsWith('.json')).sort();
    console.log(files.length ? resolve(state, 'mail', files.at(-1)) : 'No captured mail yet.');
  } else throw new Error('Unknown local action');
}
