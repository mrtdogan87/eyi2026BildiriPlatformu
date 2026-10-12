import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { hashPassword, hashToken } from '../src/platform/password.mjs';
import { recoveryClient, recoveryLimitKey } from '../src/modules/identity/recovery-policy.mjs';

loadEnv(); assertLocal();
if (process.env.ISOLATED_LOCAL_TEST !== 'synthetic-only') throw new Error('Run this check only through scripts/isolated-local.mjs exec');
if (recoveryClient(new Headers(), process.env.RECOVERY_TRUSTED_IP_HEADER) !== 'direct') throw new Error('This regression requires an unidentified local client');
const db = new PrismaClient(), suffix = randomUUID().slice(0, 8);
const password = 'Login-check-' + randomBytes(20).toString('hex');
const nextPassword = 'Login-next-' + randomBytes(20).toString('hex');
const addresses = [], users = [], checks = [];
const key = email => recoveryLimitKey('login', email.trim().toLowerCase());
const address = label => { const email = `login-check-${label}-${suffix}@example.invalid`; addresses.push(email); return email; };
const pass = message => { checks.push(message); console.log('PASS ' + message); };
async function user(label, patch = {}) {
  const row = await db.platformUser.create({ data: { email: address(label), name: 'Synthetic login check', passwordHash: hashPassword(password), ...patch } });
  users.push(row.id); return row;
}
async function request(path, body) {
  const response = await fetch(process.env.APP_BASE_URL + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { response, data: await response.json() };
}
const login = (email, secret = 'incorrect-synthetic-password') => request('/api/admin/login', { email, password: secret });
function waiting(result) {
  assert.equal(result.response.status, 429);
  assert.equal(result.data.code, 'LOGIN_COOLDOWN');
  const seconds = Number(result.response.headers.get('retry-after'));
  assert(seconds > 0 && seconds <= 600);
  assert.equal(result.data.retryAfterSeconds, seconds);
  assert(Number.isFinite(Date.parse(result.data.retryAt)));
  assert.equal(result.response.headers.getSetCookie().length, 0);
  assert.deepEqual(Object.keys(result.data).sort(), ['code', 'error', 'retryAfterSeconds', 'retryAt']);
}

try {
  const active = await user('active'), inactive = await user('inactive', { active: false });
  const directKey = recoveryLimitKey('login-client', 'direct');
  const directBefore = await db.recoveryRateLimit.findUnique({ where: { key: directKey } });
  for (let attempt = 1; attempt <= 101; attempt++) {
    assert.equal((await login(address('rotation-' + attempt))).response.status, 401);
  }
  assert.equal((await login(active.email, password)).response.status, 200);
  const directAfter = await db.recoveryRateLimit.findUnique({ where: { key: directKey } });
  // A legacy direct row may be pruned after 24 hours, but never created/updated.
  if (directAfter) {
    assert.equal(directAfter.attempts, directBefore?.attempts);
    assert.equal(directAfter.updatedAt.getTime(), directBefore?.updatedAt.getTime());
  }
  // Keep subsequent "no session during wait" checks independent of this success.
  await db.platformSession.deleteMany({ where: { userId: active.id } });
  pass('101 distinct unidentified-address failures do not impose a global wait or block a valid login');
  const missing = address('unknown');
  for (let attempt = 1; attempt <= 5; attempt++) {
    for (const email of [active.email, inactive.email, missing]) {
      const result = await login(email);
      if (attempt < 5) { assert.equal(result.response.status, 401); assert.deepEqual(result.data, { error: 'E-posta veya parola doğrulanamadı.' }); }
      else waiting(result);
    }
  }
  pass('Existing, inactive and unknown addresses have identical failure and fifth-attempt wait responses');
  const before = await db.recoveryRateLimit.findUniqueOrThrow({ where: { key: key(active.email) } });
  waiting(await login(active.email, password));
  waiting(await login(active.email.toUpperCase()));
  const after = await db.recoveryRateLimit.findUniqueOrThrow({ where: { key: key(active.email) } });
  assert.equal(after.windowStartedAt.getTime(), before.windowStartedAt.getTime());
  assert.equal(after.attempts, 5);
  assert.equal(await db.platformSession.count({ where: { userId: active.id } }), 0);
  pass('A valid password cannot bypass a wait; normalized retries neither extend it nor create sessions');

  const expired = new Date(Date.now() - 11 * 60000);
  await db.recoveryRateLimit.update({ where: { key: key(active.email) }, data: { windowStartedAt: expired } });
  await db.platformUser.update({ where: { id: active.id }, data: { lockedUntil: expired } });
  const resumed = await login(active.email, password);
  assert.equal(resumed.response.status, 200);
  assert.equal(await db.recoveryRateLimit.count({ where: { key: key(active.email) } }), 0);
  const recovered = await db.platformUser.findUniqueOrThrow({ where: { id: active.id } });
  assert.equal(recovered.failedLogins, 0); assert.equal(recovered.lockedUntil, null);
  await db.recoveryRateLimit.update({ where: { key: key(missing) }, data: { windowStartedAt: expired } });
  assert.equal((await login(missing)).response.status, 401);
  assert.equal((await db.recoveryRateLimit.findUniqueOrThrow({ where: { key: key(missing) } })).attempts, 1);
  pass('After expiry, valid login succeeds and failed login starts a fresh counter');

  const racing = address('parallel');
  const parallel = await Promise.all(Array.from({ length: 6 }, () => login(racing)));
  assert.equal(parallel.filter(result => result.response.status === 401).length, 4);
  const waits = parallel.filter(result => result.response.status === 429);
  assert.equal(waits.length, 2); waits.forEach(waiting);
  assert.equal(waits[0].data.retryAt, waits[1].data.retryAt);
  pass('Concurrent failures preserve one fifth-attempt threshold and one stable deadline');

  const now = new Date();
  await db.platformUser.update({ where: { id: active.id }, data: { failedLogins: 5, lockedUntil: new Date(now.getTime() + 600000) } });
  await db.recoveryRateLimit.create({ data: { key: key(active.email), attempts: 5, windowStartedAt: now } });
  const raw = randomBytes(32).toString('hex');
  await db.passwordRecoveryToken.create({ data: { userId: active.id, tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + 600000) } });
  const reset = await request('/api/platform/password-reset', { token: raw, password: nextPassword });
  assert.equal(reset.response.status, 200);
  assert.equal(await db.recoveryRateLimit.count({ where: { key: key(active.email) } }), 0);
  assert.equal(await db.platformSession.count({ where: { userId: active.id, revokedAt: null } }), 0);
  assert.equal((await login(active.email, password)).response.status, 401);
  assert.equal((await login(active.email, nextPassword)).response.status, 200);
  pass('Password recovery clears the temporary wait, revokes old sessions and accepts only the new password');
  console.log(`Login cooldown checks passed: ${checks.length} scenarios.`);
} finally {
  // Every deletion is restricted to fresh synthetic identities from this run.
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.platformSession.deleteMany({ where: { userId: { in: users } } });
  await db.passwordRecoveryToken.deleteMany({ where: { userId: { in: users } } });
  await db.platformUser.deleteMany({ where: { id: { in: users } } });
  await db.recoveryRateLimit.deleteMany({ where: { key: { in: addresses.map(key) } } });
  await db.$disconnect();
}
