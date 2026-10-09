import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertBootstrapTarget, bootstrapProductionAdmin, parseBootstrapAccount } from './bootstrap-production-lib.mjs';

let prisma;
try {
  if (process.argv.length !== 3 || process.argv[2] !== '--stdin' || process.stdin.isTTY) {
    throw new Error('Usage: bootstrap-production.mjs --stdin < private-admin.json');
  }
  loadEnv();
  assertBootstrapTarget();
  process.stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (Buffer.byteLength(input) > 8192) throw new Error('Account input is too large.');
  }
  const account = parseBootstrapAccount(JSON.parse(input));
  input = '';
  prisma = new PrismaClient({ log: [] });
  await bootstrapProductionAdmin({ prisma, account });
  console.log('Initial platform administrator created; no email was sent.');
} catch {
  // Prisma errors may embed account data. Do not forward raw errors to deployment logs.
  console.error('Bootstrap refused or failed. Check production target, explicit confirmation, private account input and empty database. No existing account is overwritten.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
