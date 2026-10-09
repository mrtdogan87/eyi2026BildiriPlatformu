import { PrismaClient } from '@prisma/client';
import { mkdir, open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertLocal } from './environment.mjs';
import { loadEnv, root } from './load-env.mjs';
import { parseBootstrapAccount } from './bootstrap-production-lib.mjs';

let prisma;
try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--identity')) throw new Error('Usage: export-production-admin.mjs [--identity private-identity.json]');
  loadEnv();
  assertLocal();
  prisma = new PrismaClient({ log: [] });
  const owners = await prisma.platformUser.findMany({
    where: { platformAdmin: true, active: true },
    select: { name: true, email: true, passwordHash: true },
  });
  if (owners.length !== 1) throw new Error('Exactly one existing administrator is required.');
  let identity = {};
  if (args.length) {
    identity = JSON.parse(await readFile(resolve(root, args[1]), 'utf8'));
    if (!identity || Array.isArray(identity) || Object.keys(identity).sort().join(',') !== 'email,name') {
      throw new Error('Identity input must contain only name and email.');
    }
  }
  const account = parseBootstrapAccount({ ...owners[0], ...identity });
  const directory = resolve(root, '.local');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = await open(resolve(directory, 'production-admin.json'), 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(account) + '\n'); await file.sync(); }
  finally { await file.close(); }
  console.log('Existing administrator exported to .local/production-admin.json (0600). Database unchanged; no email sent.');
} catch {
  console.error('Export refused or failed. Require a local database, exactly one active administrator with a real email and password, and no existing export file.');
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
