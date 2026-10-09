import { PrismaClient } from '@prisma/client';
import { setTimeout as pause } from 'node:timers/promises';
import { writeFile, rename } from 'node:fs/promises';
import { assertEnvironment } from './environment.mjs';
import { loadEnv, root } from './load-env.mjs';
import { createEmailTransport } from '../src/modules/communication/transport.mjs';
import { processEmailQueue } from '../src/modules/communication/queue.mjs';

loadEnv();
assertEnvironment();
const args = process.argv.slice(2);
if (args.some(arg => !['--once', '--watch'].includes(arg)) || args.length > 1) throw new Error('Usage: mail-worker.mjs [--once|--watch]');
const watch = args.includes('--watch');
const transport = createEmailTransport({ root });
const prisma = new PrismaClient();
const heartbeatFile = process.env.MAIL_WORKER_HEARTBEAT_FILE;
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
try {
  do {
    try {
      const result = await processEmailQueue({ prisma, transport });
      if (heartbeatFile) {
        const temporary = `${heartbeatFile}.${process.pid}.tmp`;
        await writeFile(temporary, new Date().toISOString() + '\n', { mode: 0o600 });
        await rename(temporary, heartbeatFile);
      }
      // Never log message bodies, recipient addresses, magic links or raw provider errors.
      if (result.results.length || !watch) console.log(JSON.stringify({ worker: 'email', provider: transport.provider, claimed: result.claimed,
        outcomes: result.results.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {}) }));
    } catch {
      console.error('Email worker could not finish a batch; pending records remain durable.');
      if (!watch) process.exitCode = 1;
    }
    if (watch && !stopping) await pause(2000);
  } while (watch && !stopping);
} finally { await prisma.$disconnect(); }
