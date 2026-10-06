import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { enqueueMessage, processEmailQueue } from '../src/modules/communication/queue.mjs';
import { createEmailTransport } from '../src/modules/communication/transport.mjs';

loadEnv();
assertLocal();
const db = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const checks = [];
const base = process.env.APP_BASE_URL;
const accounts = JSON.parse(readFileSync('.local/p03-accounts.json', 'utf8'));
const jars = Object.fromEntries(['platform', 'secretary', 'editor', 'organizerB'].map(key => [key, new Map()]));
const future = new Date('2037-01-01T10:00:00.000Z');
const captureRoot = mkdtempSync(join(tmpdir(), 'aibildiri-p09-capture-'));
const realCapture = createEmailTransport({ root: captureRoot });
let demo;
let foreign;

function ok(condition, label) { assert.ok(condition, label); checks.push(label); }
async function request(path, { method = 'GET', body, jar = new Map(), status = 200 } = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual', headers: {
      cookie: [...jar].map(([key, value]) => `${key}=${value}`).join(';'),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, received ${response.status}`);
  for (const cookie of response.headers.getSetCookie()) {
    const [key, ...parts] = cookie.split(';')[0].split('=');
    if (parts.join('=')) jar.set(key, parts.join('=')); else jar.delete(key);
  }
  return response;
}
const json = async (path, options) => (await request(path, options)).json();
const api = '/api/platform/communication';
const post = (path, body, jar = jars.platform, status = 200) => json(path, { method: 'POST', body, jar, status });
const snapshot = (jar = jars.platform) => json(api, { jar });
const getMessage = id => db.emailMessage.findUniqueOrThrow({ where: { id }, include: { history: { orderBy: { number: 'asc' } }, deliveryIssue: true } });
const payload = (patch = {}) => ({ congressId: demo.id, dedupeKey: `p09:${randomUUID()}`, templateKey: 'EXTERNAL_NOTICE', locale: 'en', recipient: `p09-${suffix}@example.invalid`, subject: 'Independent synthetic notice', text: 'Independent host application notification.', html: '<p>Independent host application notification.</p>', ...patch });
async function enqueue(patch = {}) {
  const message = await enqueueMessage(db, payload(patch));
  await db.emailMessage.update({ where: { id: message.id }, data: { nextAttemptAt: future } });
  return message;
}
async function processMessages(ids, transport, extra = {}) {
  return processEmailQueue({ prisma: db, transport, congressId: demo.id, messageIds: ids, now: future, ...extra });
}
const permanent = { provider: 'smtp', send: async () => ({ kind: 'permanent', errorCode: 'RECIPIENT_REJECTED' }) };

try {
  for (const key of Object.keys(jars)) await post('/api/admin/login', accounts[key], jars[key]);
  demo = await db.congress.create({ data: { organizationId: 'local-org-a', slug: `p09-communication-${suffix}`, name: `P09 İletişim ${suffix}`, memberships: { create: [{ userId: 'local-user-secretary', role: 'SECRETARY' }, { userId: 'local-user-editor', role: 'CONTENT_EDITOR' }] }, modules: { create: [{ key: 'SUBMISSIONS', enabled: true }, { key: 'REGISTRATION', enabled: true }, { key: 'CMS', enabled: true }] } } });
  foreign = await db.congress.create({ data: { organizationId: 'local-org-b', slug: `p09-foreign-${suffix}`, name: `P09 Foreign ${suffix}` } });
  for (const key of ['platform', 'secretary', 'editor']) await post('/api/platform/context', { congressId: demo.id }, jars[key]);
  await post('/api/platform/context', { congressId: 'local-congress-b' }, jars.organizerB);

  const stable = payload({ dedupeKey: `stable:${suffix}` });
  const copies = await Promise.all([enqueueMessage(db, stable), enqueueMessage(db, stable)]);
  ok(copies[0].id === copies[1].id && await db.emailMessage.count({ where: { congressId: demo.id, dedupeKey: stable.dedupeKey } }) === 1, 'Concurrent enqueue of one event stores one immutable message');
  await assert.rejects(enqueueMessage(db, { ...stable, text: 'A conflicting payload' }), { code: 'EMAIL_DEDUPE_CONFLICT' });
  ok((await getMessage(copies[0].id)).text === stable.text, 'An idempotency key cannot silently replace its payload');
  const rolledBackKey = `rollback:${suffix}`;
  await assert.rejects(db.$transaction(async tx => {
    const submission = await tx.submission.create({ data: { congressId: demo.id, draftOwnerEmail: `rollback-${suffix}@example.invalid` } });
    await enqueueMessage(tx, payload({ dedupeKey: rolledBackKey, sourceType: 'SUBMISSION', sourceId: submission.id }));
    throw new Error('Intentional local rollback');
  }), /Intentional local rollback/);
  ok(await db.emailMessage.count({ where: { congressId: demo.id, dedupeKey: rolledBackKey } }) === 0 && await db.submission.count({ where: { congressId: demo.id, draftOwnerEmail: `rollback-${suffix}@example.invalid` } }) === 0, 'Business state and its outbox message roll back together');
  await assert.rejects(db.$transaction(async tx => {
    await tx.submission.create({ data: { congressId: demo.id, draftOwnerEmail: `queue-failure-${suffix}@example.invalid` } });
    await enqueueMessage(tx, { ...stable, text: 'Conflicting transaction cannot commit' });
  }), { code: 'EMAIL_DEDUPE_CONFLICT' });
  ok(await db.submission.count({ where: { congressId: demo.id, draftOwnerEmail: `queue-failure-${suffix}@example.invalid` } }) === 0, 'Queue failure aborts its business transaction rather than silently losing a notification');

  const competing = await enqueue();
  let captures = 0;
  const contestedTransport = { provider: 'capture', send: async message => { captures += 1; await new Promise(resolve => setTimeout(resolve, 40)); return { kind: 'captured', providerId: message.id }; } };
  await Promise.all([processMessages([competing.id], contestedTransport), processMessages([competing.id], contestedTransport)]);
  const raced = await getMessage(competing.id);
  ok(captures === 1 && raced.status === 'CAPTURED' && raced.history.length === 1, 'Concurrent workers claim and capture one queued message only once');
  ok(raced.module === null && raced.sourceId === null && raced.acceptedAt === null, 'Independent host application can queue without submission/registration modules; capture is not delivery acceptance');

  const interruptedCapture = await enqueue();
  await realCapture.send(interruptedCapture);
  await db.emailMessage.update({ where: { id: interruptedCapture.id }, data: { status: 'PROCESSING', provider: 'capture', attempts: 1, leaseToken: randomUUID(), leaseUntil: new Date(future.getTime() - 1), lastAttemptAt: new Date(future.getTime() - 120000) } });
  await processMessages([interruptedCapture.id], realCapture);
  const recoverable = await getMessage(interruptedCapture.id);
  ok(recoverable.status === 'RETRY' && recoverable.history[0].errorCode === 'LEASE_EXPIRED', 'Interrupted capture worker recovers a durable bounded retry');
  await processMessages([interruptedCapture.id], realCapture, { now: recoverable.nextAttemptAt });
  const captureFiles = readdirSync(join(captureRoot, '.local/mail')).filter(file => file.endsWith('.json'));
  const recovered = await getMessage(interruptedCapture.id);
  ok(recovered.status === 'CAPTURED' && recovered.history.length === 2 && captureFiles.length === 1 && JSON.parse(readFileSync(join(captureRoot, '.local/mail', captureFiles[0]), 'utf8')).id === interruptedCapture.id, 'Restart after capture write reuses one atomic capture file without duplicate email');

  const retry = await enqueue();
  let retryCalls = 0;
  const failing = { provider: 'smtp', send: async () => { retryCalls += 1; return { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' }; } };
  await processMessages([retry.id], failing, { maxAttempts: 3 });
  let retried = await getMessage(retry.id);
  ok(retried.status === 'RETRY' && retried.nextAttemptAt.getTime() === future.getTime() + 60000, 'Transient refusal schedules a durable one-minute retry');
  const tooEarly = await processMessages([retry.id], failing, { maxAttempts: 3, now: new Date(future.getTime() + 59999) });
  ok(tooEarly.claimed === 0 && retryCalls === 1, 'A future retry cannot be processed prematurely');
  await processMessages([retry.id], failing, { maxAttempts: 3, now: retried.nextAttemptAt });
  retried = await getMessage(retry.id);
  ok(retried.nextAttemptAt.getTime() === future.getTime() + 180000, 'Second transient refusal doubles the retry delay');
  await processMessages([retry.id], failing, { maxAttempts: 3, now: retried.nextAttemptAt });
  retried = await getMessage(retry.id);
  await processMessages([retry.id], failing, { maxAttempts: 3, now: new Date(future.getTime() + 86400000) });
  ok(retried.status === 'PERMANENT_FAILURE' && retried.history.length === 3 && retried.history[2].errorCode === 'RETRY_LIMIT' && retried.deliveryIssue.status === 'OPEN' && retryCalls === 3, 'Exhausted retries open a persistent task and stop automatic attempts');

  const invalid = await enqueue({ sourceType: 'EXTERNAL_DOCUMENT', sourceId: `document-${suffix}` });
  let permanentCalls = 0;
  const rejected = { ...permanent, send: async () => { permanentCalls += 1; return permanent.send(); } };
  await processMessages([invalid.id], rejected);
  await processMessages([invalid.id], rejected, { now: new Date(future.getTime() + 86400000) });
  const invalidRow = await getMessage(invalid.id);
  ok(invalidRow.status === 'PERMANENT_FAILURE' && invalidRow.deliveryIssue.status === 'OPEN' && permanentCalls === 1 && invalidRow.history[0].errorCode === 'RECIPIENT_REJECTED', 'Permanent recipient rejection opens one issue without retrying that address');

  const uncertain = await enqueue({ text: `Private link ${base}/${demo.slug}/devam?token=SECRET_${suffix}` });
  await processMessages([uncertain.id], { provider: 'smtp', send: async () => { throw new Error(`SMTP DATA timeout SECRET_${suffix}`); } });
  const unknown = await getMessage(uncertain.id);
  ok(unknown.status === 'UNKNOWN' && unknown.deliveryIssue.status === 'OPEN' && !JSON.stringify(unknown.history).includes(`SECRET_${suffix}`), 'Ambiguous SMTP result becomes UNKNOWN; provider exceptions and access payload never enter attempt history');
  let unknownResends = 0;
  await processMessages([uncertain.id], { provider: 'smtp', send: async () => { unknownResends += 1; return { kind: 'accepted' }; } });
  ok(unknownResends === 0, 'Unknown provider acceptance is never retried automatically');

  const accepted = await enqueue();
  await processMessages([accepted.id], { provider: 'smtp', send: async () => ({ kind: 'accepted', providerId: '<synthetic-accepted@example.invalid>' }) });
  const acceptedRow = await getMessage(accepted.id);
  ok(acceptedRow.status === 'ACCEPTED' && acceptedRow.acceptedAt && !('deliveredAt' in acceptedRow) && !('readAt' in acceptedRow), 'Provider acceptance records no invented delivery or read receipt');

  const expired = await enqueue({ templateKey: 'DRAFT_ACCESS', expiresAt: new Date(future.getTime() - 1) });
  const disabled = await enqueue({ module: 'CMS' });
  await db.congressModule.update({ where: { congressId_key: { congressId: demo.id, key: 'CMS' } }, data: { enabled: false } });
  let suppressedSends = 0;
  await processMessages([expired.id, disabled.id], { provider: 'capture', send: async () => { suppressedSends += 1; return { kind: 'captured' }; } });
  const expiredRow = await getMessage(expired.id);
  const disabledRow = await getMessage(disabled.id);
  ok(suppressedSends === 0 && expiredRow.status === 'CANCELLED' && expiredRow.history[0].errorCode === 'MESSAGE_EXPIRED', 'Expired authentication email is cancelled before any transport call');
  ok(disabledRow.status === 'CANCELLED' && disabledRow.history[0].errorCode === 'MODULE_DISABLED', 'Closing a source module suppresses already-queued automatic email');

  const abandoned = await enqueue();
  await db.emailMessage.update({ where: { id: abandoned.id }, data: { status: 'PROCESSING', provider: 'smtp', attempts: 1, leaseToken: randomUUID(), leaseUntil: new Date(future.getTime() - 1), lastAttemptAt: new Date(future.getTime() - 120000) } });
  await processMessages([abandoned.id], { provider: 'smtp', send: async () => assert.fail('expired SMTP lease must not resend') });
  const abandonedRow = await getMessage(abandoned.id);
  ok(abandonedRow.status === 'UNKNOWN' && abandonedRow.history.length === 1 && abandonedRow.history[0].errorCode === 'LEASE_EXPIRED', 'Interrupted SMTP worker recovers a durable unknown outcome without duplicate sending');

  const wrongProvider = await enqueue();
  await db.emailMessage.update({ where: { id: wrongProvider.id }, data: { provider: 'smtp' } });
  await processMessages([wrongProvider.id], { provider: 'resend', send: async () => assert.fail('provider fallback must not duplicate a message') });
  ok((await getMessage(wrongProvider.id)).status === 'UNKNOWN', 'Retry cannot silently switch providers and risk duplicate acceptance');

  // HTTP administration checks are below; all SMTP responses above are injected
  // in process and never reach a real mail server or an HTTP simulation route.
  await request(api, { status: 401 });
  await request(api, { jar: jars.editor, status: 403 });
  const secretaryView = await snapshot(jars.secretary);
  ok(secretaryView.canManage === false && (await snapshot()).canManage === true, 'Secretary can manage communication tasks; content editor and anonymous callers cannot read them');
  await json(api + '/settings', { method: 'PUT', jar: jars.secretary, body: { version: 0, replyTo: 'reply@example.invalid', replyUrl: '' }, status: 403 });
  await request(api + '/messages/' + invalid.id, { jar: jars.organizerB, status: 404 });
  const foreignMessage = await enqueueMessage(db, payload({ congressId: foreign.id }));
  await request(api + '/messages/' + foreignMessage.id, { jar: jars.platform, status: 404 });
  const outOfScope = await processMessages([foreignMessage.id], { provider: 'capture', send: async () => assert.fail('worker scope must not cross congresses') });
  assert.equal(outOfScope.claimed, 0);
  ok(true, 'Settings require organizer permission and message IDs remain congress-scoped');

  const authRecipient = `auth-${suffix}@example.invalid`;
  const accessToken = await db.registrationAccessToken.create({ data: { congressId: demo.id, email: authRecipient, tokenHash: createHash('sha256').update(`AUTH_SECRET_${suffix}`).digest('hex'), expiresAt: new Date(future.getTime() + 86400000) } });
  const auth = await enqueue({ recipient: authRecipient, templateKey: 'REGISTRATION_ACCESS', sourceType: 'registration-access-token', sourceId: accessToken.id, expiresAt: accessToken.expiresAt, text: `${base}/${demo.slug}/devam?token=AUTH_SECRET_${suffix}`, html: `<a href="${base}/${demo.slug}/devam?token=AUTH_SECRET_${suffix}">Access</a>` });
  await processMessages([auth.id], permanent);
  const authRow = await getMessage(auth.id);
  const detail = await json(api + '/messages/' + auth.id, { jar: jars.secretary });
  const listing = await snapshot();
  ok(!JSON.stringify(detail).includes(`AUTH_SECRET_${suffix}`) && !JSON.stringify(listing).includes(`AUTH_SECRET_${suffix}`) && !Object.hasOwn(detail.message, 'text') && !Object.hasOwn(detail.message, 'html'), 'Communication listing/detail APIs omit actual authentication message bodies and tokens');

  const staleAuth = await enqueue({ templateKey: 'REGISTRATION_ACCESS', recipient: authRecipient, sourceType: 'registration-access-token', sourceId: accessToken.id, expiresAt: accessToken.expiresAt });
  await db.registrationAccessToken.update({ where: { id: accessToken.id }, data: { usedAt: new Date() } });
  await processMessages([staleAuth.id], { provider: 'capture', send: async () => assert.fail('used token must not be sent') });
  ok((await getMessage(staleAuth.id)).history[0].errorCode === 'SOURCE_INVALID', 'Replacing or consuming an authentication token suppresses its delayed queued message');

  const activationCases = [
    { label: 'inactive user', active: false },
    { label: 'already activated account', passwordHash: 'synthetic-already-activated-account' },
    { label: 'revoked congress membership', memberActive: false },
    { label: 'revoked organization membership', organizationActive: false },
    { label: 'valid unactivated team member', valid: true },
  ];
  for (const [index, example] of activationCases.entries()) {
    const user = await db.platformUser.create({ data: { email: `activation-${index}-${suffix}@example.invalid`, name: 'P09 synthetic activation fixture', active: example.active ?? true, passwordHash: example.passwordHash ?? null,
      organizations: { create: { organizationId: demo.organizationId, active: example.organizationActive ?? true } },
      congresses: { create: { congressId: demo.id, role: 'CONTENT_EDITOR', active: example.memberActive ?? true } },
    } });
    const token = await db.activationToken.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(randomUUID()).digest('hex'), expiresAt: new Date(future.getTime() + 86400000) } });
    const invitation = await enqueue({ templateKey: 'ACCOUNT_ACTIVATION', recipient: user.email, sourceType: 'activation-token', sourceId: token.id, expiresAt: token.expiresAt });
    await processMessages([invitation.id], example.valid ? realCapture : { provider: 'capture', send: async () => assert.fail('invalid invitation must not enter the transport') });
    const result = await getMessage(invitation.id);
    ok(example.valid ? result.status === 'CAPTURED' : result.status === 'CANCELLED' && result.history[0].errorCode === 'SOURCE_INVALID', `Queued activation validates current account and access: ${example.label}`);
  }

  const settings = (await snapshot()).settings;
  const generalDefault = (await snapshot()).templates.find(template => template.key === 'GENERAL' && template.locale === 'tr');
  await post(api + '/preview', { key: generalDefault.key, locale: generalDefault.locale, subject: generalDefault.subject, body: generalDefault.body }, jars.secretary, 400);
  ok(true, 'A message expecting a reply cannot be previewed for sending until a monitored reply address is configured');
  const nextSettings = { version: settings.version, replyTo: 'monitored@example.invalid', replyUrl: `${base}/${demo.slug}/sayfalar/iletisim` };
  await json(api + '/settings', { method: 'PUT', body: nextSettings, jar: jars.platform });
  await json(api + '/settings', { method: 'PUT', body: nextSettings, jar: jars.platform, status: 409 });
  const currentSettings = (await snapshot()).settings;
  for (const replyUrl of ['https://foreign.example.invalid/support', `${base}/kongre-b-2026/sayfalar/iletisim`, `${base}/${demo.slug}/?token=secret`, `${base}/${demo.slug}/sayfalar/ile\ntisim`, `${base}/${demo.slug}/sayfalar/ile\ttisim`]) {
    await json(api + '/settings', { method: 'PUT', body: { ...nextSettings, version: currentSettings.version, replyUrl }, jar: jars.platform, status: 400 });
  }
  ok(true, 'Monitored reply settings reject stale writes, foreign congress URLs and query-string access tokens');

  const sampleIds = [];
  for (const locale of ['tr', 'en']) {
    const originalTemplate = (await snapshot()).templates.find(template => template.key === 'GENERAL' && template.locale === locale);
    const input = { ...originalTemplate, subject: `${locale.toUpperCase()} saved v1 {{congressName}}`, body: '<script>inert preview text</script>\n{{recipientName}}\n{{message}}' };
    await json(api + '/templates', { method: 'PUT', jar: jars.secretary, body: input, status: 403 });
    const saved = await json(api + '/templates', { method: 'PUT', jar: jars.platform, body: input });
    await json(api + '/templates', { method: 'PUT', jar: jars.platform, body: input, status: 409 });
    const previewInput = { key: input.key, locale, subject: input.subject, body: input.body };
    const preview = await post(api + '/preview', previewInput, jars.secretary);
    ok(preview.subject.startsWith(locale.toUpperCase()) && preview.text.includes('monitored@example.invalid') && preview.text.includes(nextSettings.replyUrl) && preview.html.includes('&lt;script&gt;') && !preview.html.includes('<script>'), `${locale.toUpperCase()} preview preserves monitored reply details and escapes administrator markup`);
    await post(api + '/preview', { ...previewInput, body: '{{unknownVariable}}' }, jars.secretary, 400);
    await post(api + '/preview', { ...previewInput, congressId: foreign.id }, jars.secretary, 400);
    const testInput = { key: 'GENERAL', locale, recipient: `sample-${locale}-${suffix}@example.invalid`, requestKey: randomUUID() };
    await post(api + '/test', { ...testInput, recipient: 'person@example.com' }, jars.secretary, 400);
    await post(api + '/test', { ...testInput, simulatedFailure: 'permanent' }, jars.secretary, 400);
    const sample = await post(api + '/test', testInput, jars.secretary);
    const repeated = await post(api + '/test', testInput, jars.secretary);
    assert.equal(sample.id, repeated.id);
    await post(api + '/test', { ...testInput, recipient: `other-sample-${suffix}@example.invalid` }, jars.secretary, 409);
    await json(api + '/templates', { method: 'PUT', jar: jars.platform, body: { ...input, version: saved.version, subject: `${locale.toUpperCase()} saved v2 {{congressName}}` } });
    const stored = await getMessage(sample.id);
    ok(stored.subject.startsWith(`${locale.toUpperCase()} saved v1`) && stored.templateVersion === saved.version && stored.replyTo === nextSettings.replyTo, `${locale.toUpperCase()} test queues the saved template snapshot once; later template edits cannot alter it`);
    sampleIds.push(sample.id);
  }
  ok(true, 'Template saves reject stale or unauthorized changes; previews reject unsupported variables; test endpoint has no failure-simulation input and permits only synthetic recipients');
  const authSample = await post(api + '/test', { key: 'DRAFT_ACCESS', locale: 'en', recipient: `auth-sample-${suffix}@example.invalid`, requestKey: randomUUID() }, jars.secretary);
  await processMessages([...sampleIds, authSample.id], realCapture);
  const samples = await db.emailMessage.findMany({ where: { id: { in: [...sampleIds, authSample.id] } } });
  ok(samples.length === 3 && samples.every(message => message.status === 'CAPTURED'), 'TR/EN saved samples and a sample-only access-link template are actually captured without external delivery');

  const realProviderSample = await enqueue({ templateKey: 'GENERAL', sourceType: 'TEMPLATE_TEST', sourceId: randomUUID() });
  const realRecipientSample = await enqueue({ templateKey: 'DRAFT_ACCESS', sourceType: 'TEMPLATE_TEST', sourceId: randomUUID(), recipient: 'person@example.com' });
  await processMessages([realProviderSample.id], { provider: 'smtp', send: async () => assert.fail('sample must never enter an external provider') });
  await processMessages([realRecipientSample.id], { provider: 'capture', send: async () => assert.fail('real-looking recipient must not bypass auth validity') });
  ok((await getMessage(realProviderSample.id)).history[0].errorCode === 'SOURCE_INVALID' && (await getMessage(realRecipientSample.id)).history[0].errorCode === 'SOURCE_INVALID', 'Sample-only token exemption cannot cross into a delivery provider or a real-looking recipient address');

  await post(api + '/messages/' + invalid.id + '/retry', { version: invalidRow.version }, jars.secretary, 400);
  await post(api + '/messages/' + uncertain.id + '/retry', { version: unknown.version }, jars.secretary, 400);
  await json(api + '/issues/' + authRow.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: authRow.deliveryIssue.version, action: 'CORRECT_ADDRESS', note: 'Verified local correction request', recipient: `new-identity-${suffix}@example.invalid` }, status: 400 });
  ok(true, 'Permanent/unknown outcomes cannot be blindly retried; authentication links cannot be retargeted to another identity');

  await json(api + '/issues/' + invalidRow.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: invalidRow.deliveryIssue.version, action: 'CORRECT_ADDRESS', note: 'Verified address in synthetic source record', recipient: invalidRow.recipient }, status: 400 });
  const correctedRecipient = `corrected-${suffix}@example.invalid`;
  await json(api + '/issues/' + invalidRow.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: invalidRow.deliveryIssue.version, action: 'CORRECT_ADDRESS', note: 'Verified address in synthetic source record', recipient: correctedRecipient } });
  const corrected = await db.emailMessage.findFirstOrThrow({ where: { congressId: demo.id, recipient: correctedRecipient } });
  const original = await getMessage(invalid.id);
  ok(corrected.id !== original.id && original.recipient === invalidRow.recipient && original.deliveryIssue.status === 'RESOLVED' && corrected.sourceId === original.sourceId && corrected.text === original.text, 'Verified non-auth address correction creates a new message, preserves source/document identity and resolves the original issue');
  await processMessages([corrected.id], realCapture);
  ok((await getMessage(corrected.id)).status === 'CAPTURED', 'Corrected document notification is captured using the new message and recipient');
  await json(api + '/issues/' + invalidRow.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: invalidRow.deliveryIssue.version, action: 'RESOLVE', note: 'stale local update' }, status: 409 });
  await json(api + '/issues/' + authRow.deliveryIssue.id, { method: 'PATCH', jar: jars.organizerB, body: { version: authRow.deliveryIssue.version, action: 'RESOLVE', note: 'foreign local update' }, status: 404 });
  ok(true, 'Delivery issues enforce optimistic versioning and congress isolation');

  await json(api + '/issues/' + unknown.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: unknown.deliveryIssue.version, action: 'CORRECT_ADDRESS', note: 'Unconfirmed provider outcome cannot be replayed', recipient: `unknown-correction-${suffix}@example.invalid` }, status: 400 });
  await json(api + '/issues/' + unknown.deliveryIssue.id, { method: 'PATCH', jar: jars.secretary, body: { version: unknown.deliveryIssue.version, action: 'RESOLVE', note: 'Synthetic provider outcome reviewed; no resend' } });
  const reviewedUnknown = await getMessage(uncertain.id);
  ok(reviewedUnknown.status === 'UNKNOWN' && reviewedUnknown.deliveryIssue.status === 'RESOLVED' && reviewedUnknown.attempts === unknown.attempts, 'Manual review can close an uncertainty task without claiming delivery or resending it');

  const manualRetry = await enqueue();
  await processMessages([manualRetry.id], { provider: 'smtp', send: async () => ({ kind: 'retry', errorCode: 'TEMPORARY_FAILURE' }) });
  const manualRow = await getMessage(manualRetry.id);
  await post(api + '/messages/' + manualRetry.id + '/retry', { version: manualRow.version - 1 }, jars.secretary, 409);
  await post(api + '/messages/' + manualRetry.id + '/retry', { version: manualRow.version }, jars.secretary);
  const expedited = await getMessage(manualRetry.id);
  ok(expedited.status === 'RETRY' && expedited.nextAttemptAt < future && expedited.version > manualRow.version, 'Authorized retry expedites a definite transient failure and rejects stale versions');
  await processMessages([manualRetry.id], { provider: 'smtp', send: async () => ({ kind: 'accepted' }) });
  const cancellable = await enqueue();
  await post(api + '/messages/' + cancellable.id + '/cancel', { version: cancellable.version + 1, reason: 'Synthetic duplicate request removed' }, jars.secretary, 409);
  await post(api + '/messages/' + cancellable.id + '/cancel', { version: cancellable.version, reason: 'Synthetic duplicate request removed' }, jars.secretary);
  await processMessages([cancellable.id], { provider: 'capture', send: async () => assert.fail('cancelled message must not be sent') });
  ok((await getMessage(cancellable.id)).status === 'CANCELLED' && (await getMessage(cancellable.id)).attempts === 0, 'Cancellation is versioned, audited and prevents later transport calls');
  const audits = await db.auditLog.findMany({ where: { congressId: demo.id, action: { startsWith: 'communication.' } }, select: { action: true, detail: true } });
  ok(['communication.settings', 'communication.template', 'communication.test', 'communication.issue.resolve', 'communication.retry', 'communication.cancel'].every(action => audits.some(audit => audit.action === action)) && !JSON.stringify(audits).includes(`AUTH_SECRET_${suffix}`), 'Communication administration leaves scoped audit evidence without authentication payloads');

  writeFileSync('.local/communication-check-result.json', JSON.stringify({ executedAt: new Date().toISOString(), environment: 'local', realEmailsSent: 0, checks, fixtures: { congressId: demo.id, foreignCongressId: foreign.id } }, null, 2) + '\n', { mode: 0o600 });
  console.log(`P09 communication checks passed: ${checks.length} scenarios; only injected transports and local capture.`);
} finally {
  try {
    const fixtureIds = [demo?.id, foreign?.id].filter(Boolean);
    if (fixtureIds.length) await db.emailMessage.updateMany({ where: { congressId: { in: fixtureIds }, status: { in: ['PENDING', 'RETRY', 'PROCESSING'] } }, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null, version: { increment: 1 } } });
  } finally {
    await db.$disconnect();
    rmSync(captureRoot, { recursive: true, force: true });
  }
}
