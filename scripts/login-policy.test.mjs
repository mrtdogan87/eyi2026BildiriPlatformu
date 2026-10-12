import test from 'node:test';
import assert from 'node:assert/strict';
import { failedLogin, loginRetryAt, loginCooldownDetails, loginCooldownMs, loginClientLimit, loginClientLimitFor } from '../src/modules/identity/login-policy.ts';
import { nextRecoveryWindow, recoveryClient } from '../src/modules/identity/recovery-policy.mjs';

test('The fifth failed attempt starts a ten-minute wait without an account-existence input', () => {
  let record = null;
  const now = new Date('2026-10-13T09:00:00Z');
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = failedLogin(record, now);
    assert.equal(result.attempts, attempt);
    assert.equal(result.retryAt?.getTime() ?? null, attempt === 5 ? now.getTime() + loginCooldownMs : null);
    record = result;
  }
});

test('Retries during a wait do not extend its deadline or increment failures', () => {
  const started = new Date('2026-10-13T09:00:00Z');
  const record = { attempts: 5, windowStartedAt: started };
  const expected = new Date(started.getTime() + loginCooldownMs);
  for (const elapsed of [0, 1, 300_000, 599_999]) {
    const now = new Date(started.getTime() + elapsed);
    assert.equal(loginRetryAt(record, now).getTime(), expected.getTime());
    assert.equal(failedLogin(record, now).attempts, 5);
    assert.equal(failedLogin(record, now).retryAt.getTime(), expected.getTime());
  }
});

test('A completed wait allows a fresh attempt instead of immediately locking again', () => {
  const started = new Date('2026-10-13T09:00:00Z');
  const now = new Date(started.getTime() + loginCooldownMs);
  const record = { attempts: 5, windowStartedAt: started };
  assert.equal(loginRetryAt(record, now), null);
  assert.deepEqual(failedLogin(record, now), { attempts: 1, windowStartedAt: now, retryAt: null });
});

test('Failure history below the threshold is retained until a successful login or completed wait', () => {
  const started = new Date('2026-10-13T09:00:00Z');
  const result = failedLogin({ attempts: 4, windowStartedAt: started }, new Date('2026-10-14T09:00:00Z'));
  assert.equal(result.attempts, 5);
  assert.equal(result.retryAt.toISOString(), '2026-10-14T09:10:00.000Z');
});

test('Cooldown response contains only generic guidance and a rounded remaining duration', () => {
  const until = new Date('2026-10-13T09:10:00Z');
  const details = loginCooldownDetails(until, new Date('2026-10-13T09:00:00.500Z'));
  assert.deepEqual(Object.keys(details).sort(), ['code', 'error', 'retryAfterSeconds', 'retryAt']);
  assert.equal(details.code, 'LOGIN_COOLDOWN');
  assert.equal(details.retryAfterSeconds, 600);
  assert.equal(details.retryAt, until.toISOString());
  assert.equal(loginCooldownDetails(until, until).retryAfterSeconds, 1);
});

test('Unidentified clients and untrusted or ambiguous IP headers never share a login quota', () => {
  const clients = [
    recoveryClient(new Headers()),
    recoveryClient(new Headers({ 'x-forwarded-for': '192.0.2.1' })),
    recoveryClient(new Headers({ 'x-forwarded-for': '192.0.2.1, 192.0.2.2' }), 'x-forwarded-for'),
    recoveryClient(new Headers({ 'x-real-ip': 'invalid' }), 'x-real-ip'),
  ];
  for (const client of clients) assert.equal(loginClientLimitFor(client), null);
});

test('A trusted client quota bounds address rotation and does not extend its window on rejection', () => {
  const client = recoveryClient(new Headers({ 'x-real-ip': '192.0.2.1' }), 'x-real-ip');
  const rule = loginClientLimitFor(client);
  assert.deepEqual(rule, loginClientLimit);
  const now = new Date('2026-10-13T09:00:00Z');
  let record = null;
  for (let attempt = 1; attempt <= rule.maximum; attempt++) {
    record = nextRecoveryWindow(record, now, rule);
    assert.equal(record.allowed, true);
  }
  const rejected = nextRecoveryWindow(record, new Date(now.getTime() + 1000), rule);
  assert.equal(rejected.allowed, false);
  assert.equal(rejected.windowStartedAt.getTime(), now.getTime());
  assert.equal(nextRecoveryWindow(rejected, new Date(now.getTime() + rule.windowMs), rule).allowed, true);
});
