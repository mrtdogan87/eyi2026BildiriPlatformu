import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRecoveryWindow, recoveryClient, recoveryLimitKey, recoveryLimits } from '../src/modules/identity/recovery-policy.mjs';

test('Untrusted forwarding headers cannot evade the shared client limit', () => {
  for (const value of ['192.0.2.1', '192.0.2.2', '127.0.0.1', '::1']) {
    const headers = new Headers({ 'x-forwarded-for': value, 'x-real-ip': value });
    assert.equal(recoveryClient(headers), 'direct');
    assert.equal(recoveryClient(headers, 'user-agent'), 'direct');
  }
});

test('A configured proxy must overwrite the header with exactly one IP', () => {
  assert.equal(recoveryClient(new Headers({ 'x-real-ip': '192.0.2.1' }), 'x-real-ip'), 'proxy:192.0.2.1');
  for (const value of ['192.0.2.1, 192.0.2.2', 'unknown', 'host.example', '']) {
    assert.equal(recoveryClient(new Headers({ 'x-forwarded-for': value }), 'x-forwarded-for'), 'direct');
  }
});

test('Equivalent IPv6 representations share a client limit', () => {
  const key = value => recoveryClient(new Headers({ 'x-real-ip': value }), 'x-real-ip');
  assert.equal(key('2001:db8::1'), key('2001:0db8:0000:0000:0000:0000:0000:0001'));
});

test('Address and client keys separate scopes without retaining raw addresses', () => {
  const address = 'someone@example.invalid';
  assert.notEqual(recoveryLimitKey('address', address), recoveryLimitKey('client', address));
  assert.ok(!recoveryLimitKey('address', address).includes(address));
});

test('Address requests stay bounded and rejected requests do not extend the window', () => {
  const start = new Date('2026-10-09T12:00:00Z');
  let record = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    const next = nextRecoveryWindow(record, new Date(start.getTime() + attempt * 1000), recoveryLimits.address);
    assert.equal(next.allowed, attempt <= 5);
    record = next;
  }
  assert.equal(record.windowStartedAt.getTime(), start.getTime() + 1000);
  assert.equal(record.attempts, 6);
  const restarted = nextRecoveryWindow(record, new Date(start.getTime() + 3601000), recoveryLimits.address);
  assert.equal(restarted.allowed, true);
  assert.equal(restarted.attempts, 1);
});

test('Client and reset limits remain separate with documented thresholds', () => {
  const now = new Date();
  for (const [kind, maximum] of [['client', 20], ['reset', 30]]) {
    assert.equal(nextRecoveryWindow({ windowStartedAt: now, attempts: maximum - 1 }, now, recoveryLimits[kind]).allowed, true);
    assert.equal(nextRecoveryWindow({ windowStartedAt: now, attempts: maximum }, now, recoveryLimits[kind]).allowed, false);
  }
});
