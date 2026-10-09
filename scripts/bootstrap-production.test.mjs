import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/platform/password.mjs';
import { assertBootstrapTarget, bootstrapProductionAdmin, parseBootstrapAccount } from './bootstrap-production-lib.mjs';

const account = { name: 'Kongre Yöneticisi', email: 'owner@example.org', passwordHash: hashPassword('test-only-existing-password') };
const env = {
  APP_ENV: 'production', SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_production',
  APP_BASE_URL: 'https://kongre.stativera.store', V2_DB_HOST: 'db-v2-production',
  DATABASE_URL: 'postgresql://aibildiri_v2_production:test@db-v2-production:5432/aibildiri_v2_production',
  DIRECT_URL: 'postgresql://aibildiri_v2_production:test@db-v2-production:5432/aibildiri_v2_production',
  DRAFT_SESSION_SECRET: 'a'.repeat(64), FILE_STORAGE: 'database', MAIL_MODE: 'delivery',
  EMAIL_DELIVERY_ENABLED: 'true', V2_BOOTSTRAP_CONFIRM: 'aibildiri_v2_production',
};
function database(counts = [0, 0, 0, 0]) {
  const calls = [];
  const tx = {
    $executeRaw: async () => { calls.push('lock'); },
    platformUser: { count: async () => counts[0], create: async ({ data }) => { calls.push(data); return { id: 'new-owner', ...data }; } },
    organization: { count: async query => { assert.deepEqual(query, { where: { id: { not: 'legacy-unassigned' } } }); return counts[1]; } },
    congress: { count: async () => counts[2] }, emailMessage: { count: async () => counts[3] },
    auditLog: { create: async ({ data }) => { calls.push(data); } },
  };
  return { calls, prisma: { $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return fn(tx);
  } } };
}

test('bootstrap retains the existing password hash and creates one audited administrator', async () => {
  const { calls, prisma } = database();
  assert.deepEqual(await bootstrapProductionAdmin({ prisma, account, env }), { created: true });
  assert.equal(calls[0], 'lock');
  assert.deepEqual(calls[1], { ...account, platformAdmin: true, active: true });
  assert.ok(verifyPassword('test-only-existing-password', calls[1].passwordHash));
  assert.deepEqual(calls[2], { actorId: 'new-owner', targetId: 'new-owner', action: 'platform.bootstrap' });
});
for (const [index, kind] of ['accounts', 'organizations', 'congresses', 'queued mail'].entries()) {
  test(`bootstrap refuses existing ${kind} without writing`, async () => {
    const counts = [0, 0, 0, 0]; counts[index] = 1;
    const { calls, prisma } = database(counts);
    await assert.rejects(bootstrapProductionAdmin({ prisma, account, env }), /already exists/);
    assert.deepEqual(calls, ['lock']);
  });
}
test('bootstrap refuses missing confirmation, old production and nonproduction targets', () => {
  for (const overrides of [
    { V2_BOOTSTRAP_CONFIRM: '' }, { APP_ENV: 'local' }, { APP_ENV: 'preview' },
    { DATABASE_URL: 'postgresql://old:test@db-v2-production:5432/aibildiri' },
    { APP_BASE_URL: 'https://bildiriyonetim.stativera.store' },
  ]) assert.throws(() => assertBootstrapTarget({ ...env, ...overrides }));
});
test('account input rejects plaintext passwords, invalid hashes, synthetic email and extra privileges', () => {
  for (const input of [
    { ...account, passwordHash: 'plain-password' }, { ...account, passwordHash: null },
    { ...account, email: 'owner@example.invalid' }, { ...account, platformAdmin: true },
    { ...account, name: 'Owner\nInjected' }, { email: account.email, name: account.name, password: 'plaintext' },
  ]) assert.throws(() => parseBootstrapAccount(input), /Invalid bootstrap account/);
  assert.equal(parseBootstrapAccount({ ...account, email: ' OWNER@example.org ' }).email, 'owner@example.org');
});
