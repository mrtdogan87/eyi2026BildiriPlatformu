import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { processEmailQueue } from '../src/modules/communication/queue.mjs';
import { createEmailTransport } from '../src/modules/communication/transport.mjs';
import { defaultTemplate, renderTemplate } from '../src/modules/communication/templates.ts';

loadEnv();
assertLocal();
const db = new PrismaClient();
const checks = [], userIds = [], messageIds = [];
const captureRoot = mkdtempSync(join(tmpdir(), 'aibildiri-ui12-recovery-'));
const capture = createEmailTransport({ root: captureRoot });
const now = new Date('2037-01-01T10:00:00Z');
const noSend = { provider: 'capture', send: async () => assert.fail('invalid recovery message reached transport') };
function ok(condition, label) { assert.ok(condition, label); checks.push(label); }
async function fixture({ user: userPatch = {}, token: tokenPatch = {}, message: messagePatch = {} } = {}) {
  const user = await db.platformUser.create({ data: { email: `ui12-recovery-${randomUUID()}@example.invalid`, name: 'UI12 synthetic recovery transport', passwordHash: 'synthetic-existing-password', ...userPatch } });
  userIds.push(user.id);
  const raw = randomUUID();
  const token = await db.passwordRecoveryToken.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(raw).digest('hex'), expiresAt: new Date(now.getTime() + 30 * 60000), ...tokenPatch } });
  const rendered = renderTemplate({ key: 'ACCOUNT_PASSWORD_RECOVERY', locale: 'tr', ...defaultTemplate('ACCOUNT_PASSWORD_RECOVERY', 'tr'), values: {
    platformName: 'Synthetic Platform', recoveryLink: `${process.env.APP_BASE_URL}/hesap/parola-yenile#token=${raw}`,
  } });
  const data = { congressId: null, dedupeKey: `platform-password-recovery:${token.id}`, templateKey: 'ACCOUNT_PASSWORD_RECOVERY', templateVersion: 1, locale: 'tr', recipient: user.email,
    ...rendered, sourceType: 'platform-password-recovery', sourceId: token.id, expiresAt: token.expiresAt, nextAttemptAt: now, ...messagePatch };
  const message = await db.emailMessage.create({ data: { id: randomUUID(), ...data, payloadHash: createHash('sha256').update(JSON.stringify(data)).digest('hex') } });
  messageIds.push(message.id);
  return { user, token, message, raw };
}
const stored = id => db.emailMessage.findUniqueOrThrow({ where: { id }, include: { history: { orderBy: { number: 'asc' } }, deliveryIssue: true } });
const processMessage = (id, transport = capture, options = {}) => processEmailQueue({ prisma: db, transport, now, messageIds: [id], ...options });

try {
  const valid = await fixture();
  await Promise.all([processMessage(valid.message.id), processMessage(valid.message.id)]);
  const current = await stored(valid.message.id);
  const files = readdirSync(join(captureRoot, '.local/mail')).filter(file => file.endsWith('.json'));
  const captured = JSON.parse(readFileSync(join(captureRoot, '.local/mail', files[0]), 'utf8'));
  ok(current.status === 'CAPTURED' && current.attempts === 1 && current.history.length === 1 && files.length === 1 && captured.id === current.id, 'Competing workers capture one congressless personal recovery message once');
  ok(current.congressId === null && current.acceptedAt === null && current.deliveryIssue === null && captured.text.includes(`/hesap/parola-yenile#token=${valid.raw}`), 'An account without memberships receives only local capture; no congress or delivery claim is created');
  ok(!JSON.stringify(current.history).includes(valid.raw), 'Recovery worker history contains no raw token or message body');

  for (const [label, options, errorCode = 'SOURCE_INVALID'] of [
    ['used token', { token: { usedAt: now } }],
    ['superseded token', { token: { revokedAt: now } }],
    ['expired source with an unexpired message', { token: { expiresAt: now }, message: { expiresAt: new Date(now.getTime() + 60000) } }],
    ['closed personal account', { user: { active: false } }],
    ['account awaiting its first password', { user: { passwordHash: null } }],
    ['mismatched recipient', { message: { recipient: 'other@example.invalid' } }],
    ['wrong activation source', { message: { sourceType: 'platform-activation' } }],
    ['expired queued message', { message: { expiresAt: now } }, 'MESSAGE_EXPIRED'],
  ]) {
    const f = await fixture(options);
    await processMessage(f.message.id, noSend);
    const row = await stored(f.message.id);
    ok(row.status === 'CANCELLED' && row.history[0].errorCode === errorCode, `Transport is skipped for ${label}`);
  }

  const retryFixture = await fixture(); let calls = 0;
  const temporary = { provider: 'capture', send: async () => { calls += 1; return { kind: 'retry', errorCode: 'CAPTURE_IO' }; } };
  await processMessage(retryFixture.message.id, temporary);
  const retry = await stored(retryFixture.message.id);
  await db.passwordRecoveryToken.update({ where: { id: retryFixture.token.id }, data: { revokedAt: now } });
  await processMessage(retryFixture.message.id, temporary, { now: retry.nextAttemptAt });
  const cancelled = await stored(retryFixture.message.id);
  ok(calls === 1 && cancelled.status === 'CANCELLED' && cancelled.history[1].errorCode === 'SOURCE_INVALID', 'A token replaced after a transient failure cannot be sent by a later retry');

  const failedFixture = await fixture(); calls = 0;
  await processMessage(failedFixture.message.id, temporary, { maxAttempts: 2 });
  const firstFailure = await stored(failedFixture.message.id);
  await processMessage(failedFixture.message.id, temporary, { maxAttempts: 2, now: firstFailure.nextAttemptAt });
  await processMessage(failedFixture.message.id, temporary, { maxAttempts: 2, now: new Date(now.getTime() + 600000) });
  const terminal = await stored(failedFixture.message.id);
  ok(calls === 2 && terminal.status === 'PERMANENT_FAILURE' && terminal.history.at(-1).errorCode === 'RETRY_LIMIT' && terminal.deliveryIssue === null, 'Congressless retry exhaustion remains a durable terminal message without an invalid congress issue');

  const unknownFixture = await fixture(); let unknownCalls = 0;
  const uncertain = { provider: 'smtp', send: async () => { unknownCalls += 1; throw new Error(`synthetic provider detail ${unknownFixture.raw}`); } };
  await processMessage(unknownFixture.message.id, uncertain);
  await processMessage(unknownFixture.message.id, uncertain, { now: new Date(now.getTime() + 60000) });
  const unknown = await stored(unknownFixture.message.id);
  ok(unknownCalls === 1 && unknown.status === 'UNKNOWN' && !JSON.stringify(unknown.history).includes(unknownFixture.raw), 'Injected uncertain delivery is not retried and its raw exception is not retained');

  writeFileSync('.local/communication-recovery-check-result.json', JSON.stringify({ executedAt: new Date().toISOString(), environment: 'local', realEmailsSent: 0, checks }, null, 2) + '\n', { mode: 0o600 });
  console.log(`UI12 recovery communication checks passed: ${checks.length}; local capture and injected transports only.`);
} finally {
  try {
    // These fixtures have no audit, organization or congress relations. Delete
    // only exact IDs created by this run; ordinary local data is untouched.
    await db.$transaction(async tx => {
      await tx.emailAttempt.deleteMany({ where: { messageId: { in: messageIds } } });
      await tx.emailDeliveryIssue.deleteMany({ where: { messageId: { in: messageIds } } });
      await tx.emailMessage.deleteMany({ where: { id: { in: messageIds } } });
      await tx.passwordRecoveryToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.platformUser.deleteMany({ where: { id: { in: userIds } } });
    });
  } finally {
    await db.$disconnect();
    rmSync(captureRoot, { recursive: true, force: true });
  }
}
