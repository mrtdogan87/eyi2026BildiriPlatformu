import { spawn } from 'node:child_process';
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { assertEnvironment, assertMigrationTarget, assertLocal } from './environment.mjs';
import { loadEnv, root } from './load-env.mjs';

loadEnv();
const config = assertEnvironment();
if (config.mode === 'local') process.env.V2_LOCAL_ROOT = root;
const action = process.argv[2];
let command;
let args;
switch (action) {
  case 'dev':
    assertLocal();
    command = 'node'; args = ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3100']; break;
  case 'build':
    command = 'node'; args = ['node_modules/next/dist/bin/next', 'build', '--webpack']; break;
  case 'start':
    process.env.HOSTNAME = config.mode === 'local' ? '127.0.0.1' : '0.0.0.0';
    process.env.PORT = config.mode === 'local' ? '3100' : '3000';
    command = 'node'; args = ['.next/standalone/server.js']; break;
  case 'migrate':
    assertMigrationTarget();
    command = 'node'; args = ['node_modules/prisma/build/index.js', 'migrate', 'deploy']; break;
  case 'seed':
    assertLocal(); command = 'node'; args = ['scripts/seed.mjs']; break;
  case 'smoke':
    assertLocal(); command = 'node'; args = ['scripts/smoke.mjs']; break;
  default: throw new Error('Unknown action');
}
const child = spawn(command, args, { stdio: 'inherit', env: process.env });
// Keep local capture processing available whenever the developer opens the app.
// Production/preview use an explicitly managed worker process.
const worker = config.mode === 'local' && ['dev', 'start'].includes(action) && process.env.MAIL_WORKER_AUTOSTART !== 'false'
  ? spawn(process.execPath, ['scripts/mail-worker.mjs', '--watch'], { stdio: 'inherit', env: process.env }) : null;
worker?.on('error', () => { console.error('Local mail worker could not start; queued messages remain stored.'); });
worker?.on('exit', code => { if (code) console.error('Local mail worker stopped; run npm run mail:worker to resume queued messages.'); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); worker?.kill(signal); });
child.on('error', () => { console.error(`Could not start ${action}`); process.exitCode = 1; });
child.on('exit', code => {
  worker?.kill('SIGTERM');
  if (action === 'build' && code === 0) {
    // Next automatically copies loaded .env files into standalone output.
    // Runtime settings come from the launcher/container; strip that copy.
    for (const name of readdirSync('.next/standalone')) {
      if (name.startsWith('.env')) rmSync(`.next/standalone/${name}`);
    }
    cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
    cpSync('public', '.next/standalone/public', { recursive: true });
  }
  process.exitCode = code ?? 1;
});
