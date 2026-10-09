import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipient, retryDelay, enqueueMessage, processEmailQueue } from '../src/modules/communication/queue.mjs';
import { classifySmtpFailure } from '../src/modules/communication/transport.mjs';
import { templateKeys, platformTemplateKeys, templatePlaceholders, defaultTemplate, templateProblems, templateInputSchema, renderTemplate, sampleTemplateValues, isSafeEmailUrl } from '../src/modules/communication/templates.ts';

test('one normalized mailbox is required; headers, lists and display names are rejected', () => {
  assert.equal(normalizeRecipient(' Synthetic@Example.Invalid '), 'synthetic@example.invalid');
  for (const value of ['', 'missing-at', 'a@example.invalid,b@example.invalid', 'Name <a@example.invalid>', 'a@example.invalid\r\nBcc:b@example.invalid', 'a@example.invalid;b@example.invalid']) {
    assert.throws(() => normalizeRecipient(value));
  }
});

test('automatic retry delay increases exponentially with a one hour cap', () => {
  assert.deepEqual([1, 2, 3, 4].map(retryDelay), [60000, 120000, 240000, 480000]);
  assert.equal(retryDelay(7), 3600000);
  assert.equal(retryDelay(50), 3600000);
});

test('invalid queue input is rejected before a database write', async () => {
  const tx = { emailMessage: { upsert() { assert.fail('invalid payload reached storage'); } } };
  const input = { congressId: 'standalone', dedupeKey: 'event:1', templateKey: 'EXTERNAL_NOTICE', locale: 'en', recipient: 'a@example.invalid', subject: 'Subject', text: 'Text', html: '<p>Text</p>' };
  for (const patch of [{ locale: 'de' }, { module: 'ARBITRARY' }, { subject: 'Subject\r\nBcc: injected@example.invalid' }, { expiresAt: 'not-a-date' }, { templateVersion: 0 }, { recipient: 'missing-at' }]) {
    await assert.rejects(enqueueMessage(tx, { ...input, ...patch }));
  }
});

test('invalid transport and worker bounds are rejected before storage is accessed', async () => {
  const prisma = {};
  const transport = { provider: 'capture', send: async () => ({ kind: 'captured' }) };
  for (const options of [{ transport: undefined }, { transport: { ...transport, provider: 'arbitrary' } }, { batchSize: 0 }, { batchSize: 101 }, { maxAttempts: 0 }, { maxAttempts: 21 }, { leaseMs: 999 }, { now: new Date('invalid') }]) {
    const code = Object.hasOwn(options, 'transport') ? 'INVALID_EMAIL_TRANSPORT' : 'INVALID_EMAIL_WORKER_OPTIONS';
    await assert.rejects(processEmailQueue({ prisma, transport, ...options }), { code });
  }
});

// The worker's state changes are exercised without a database or transport.
// Model fixtures contain only the fields it uses; failed checks cannot send.
function recoveryQueueFixture({ message: messagePatch = {}, token: tokenPatch = {}, user: userPatch = {}, missingToken = false } = {}) {
  const now = new Date('2037-01-01T10:00:00Z');
  const recipient = 'recovery@example.invalid';
  const message = {
    id: 'recovery-message', congressId: null, module: null, templateKey: 'ACCOUNT_PASSWORD_RECOVERY', sourceType: 'platform-password-recovery',
    sourceId: 'recovery-token', recipient, subject: 'Personal account password reset', text: 'PRIVATE_BODY', html: '<p>PRIVATE_BODY</p>',
    expiresAt: new Date(now.getTime() + 30 * 60000), nextAttemptAt: now, createdAt: now,
    status: 'PENDING', provider: null, attempts: 0, version: 1, leaseToken: null, leaseUntil: null, ...messagePatch,
  };
  const token = missingToken ? null : { id: 'recovery-token', expiresAt: new Date(now.getTime() + 30 * 60000), usedAt: null, revokedAt: null,
    ...tokenPatch, user: { active: true, passwordHash: 'synthetic-hash', email: recipient, ...userPatch } };
  const history = [];
  let deliveryIssues = 0, recoveryReads = 0;
  function matches(where) {
    for (const [key, expected] of Object.entries(where)) {
      if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
        if (expected.in && !expected.in.includes(message[key])) return false;
        if (expected.lte && (!message[key] || message[key] > expected.lte)) return false;
      } else if (message[key] !== expected) return false;
    }
    return true;
  }
  const db = {
    $transaction: async callback => callback(db), $queryRaw: async () => [],
    congress: { findUnique: async () => ({ closedAt: null }) },
    emailMessage: {
      findMany: async ({ where }) => matches(where) ? [{ ...message }] : [],
      updateMany: async ({ where, data }) => {
        if (!matches(where)) return { count: 0 };
        for (const [key, value] of Object.entries(data)) message[key] = value?.increment ? message[key] + value.increment : value;
        return { count: 1 };
      },
    },
    passwordRecoveryToken: { findUnique: async ({ where }) => { recoveryReads += 1; return where.id === token?.id ? token : null; } },
    emailAttempt: { create: async ({ data }) => { history.push(data); return data; } },
    emailDeliveryIssue: { upsert: async () => { deliveryIssues += 1; } },
  };
  return { db, now, message, token, history, get deliveryIssues() { return deliveryIssues; }, get recoveryReads() { return recoveryReads; } };
}

test('a valid personal recovery message is captured without a congress or delivery claim', async () => {
  const f = recoveryQueueFixture(); let sent = 0;
  const result = await processEmailQueue({ prisma: f.db, now: f.now, transport: { provider: 'capture', send: async message => {
    sent += 1; assert.equal(message.congressId, null); return { kind: 'captured', providerId: message.id };
  } } });
  assert.equal(sent, 1);
  assert.equal(f.message.status, 'CAPTURED');
  assert.equal(f.message.acceptedAt, undefined);
  assert.equal(f.history[0].outcome, 'CAPTURED');
  assert.equal(f.deliveryIssues, 0);
  assert.deepEqual(result.results, [{ id: f.message.id, status: 'CAPTURED' }]);
  assert.ok(!JSON.stringify([f.history, result]).includes('PRIVATE_BODY'));
});

for (const [label, options, code = 'SOURCE_INVALID'] of [
  ['used token', { token: { usedAt: new Date('2037-01-01T09:59:00Z') } }],
  ['superseded or revoked token', { token: { revokedAt: new Date('2037-01-01T09:59:00Z') } }],
  ['expired token despite an unexpired message', { token: { expiresAt: new Date('2037-01-01T10:00:00Z') } }],
  ['removed token', { missingToken: true }],
  ['closed account', { user: { active: false } }],
  ['unactivated account', { user: { passwordHash: null } }],
  ['changed account address', { user: { email: 'different@example.invalid' } }],
  ['wrong source type', { message: { sourceType: 'platform-activation' } }],
  ['wrong template', { message: { templateKey: 'ACCOUNT_ACTIVATION' } }],
  ['congress-scoped recovery', { message: { congressId: 'foreign-congress' } }],
  ['module-scoped recovery', { message: { module: 'CMS' } }],
  ['missing source id', { message: { sourceId: null } }],
  ['expired message', { message: { expiresAt: new Date('2037-01-01T10:00:00Z') } }, 'MESSAGE_EXPIRED'],
]) test(`personal recovery cancels ${label} before reaching the transport`, async () => {
  const f = recoveryQueueFixture(options);
  await processEmailQueue({ prisma: f.db, now: f.now, transport: { provider: 'capture', send: async () => assert.fail('invalid recovery reached transport') } });
  assert.equal(f.message.status, 'CANCELLED');
  assert.equal(f.history.length, 1);
  assert.equal(f.history[0].errorCode, code);
  assert.equal(f.deliveryIssues, 0);
});

for (const [label, revoke] of [
  ['new request invalidates the token', f => { f.token.revokedAt = f.now; }],
  ['account is closed', f => { f.token.user.active = false; }],
  ['password has been reset', f => { f.token.usedAt = f.now; }],
]) test(`a recovery retry rechecks its source when ${label}`, async () => {
  const f = recoveryQueueFixture(); let calls = 0;
  const transport = { provider: 'capture', send: async () => { calls += 1; return { kind: 'retry', errorCode: 'CAPTURE_IO' }; } };
  await processEmailQueue({ prisma: f.db, now: f.now, transport });
  assert.equal(f.message.status, 'RETRY');
  revoke(f);
  await processEmailQueue({ prisma: f.db, now: f.message.nextAttemptAt, transport });
  assert.equal(calls, 1);
  assert.equal(f.message.status, 'CANCELLED');
  assert.equal(f.history[1].errorCode, 'SOURCE_INVALID');
});

test('congressless recovery retries terminate durably without inventing a congress delivery issue', async () => {
  const f = recoveryQueueFixture(); let calls = 0;
  const transport = { provider: 'capture', send: async () => { calls += 1; return { kind: 'retry', errorCode: 'CAPTURE_IO' }; } };
  await processEmailQueue({ prisma: f.db, now: f.now, maxAttempts: 2, transport });
  assert.equal(f.message.status, 'RETRY');
  await processEmailQueue({ prisma: f.db, now: f.message.nextAttemptAt, maxAttempts: 2, transport });
  assert.equal(f.message.status, 'PERMANENT_FAILURE');
  assert.equal(f.history.length, 2);
  assert.equal(f.history[1].errorCode, 'RETRY_LIMIT');
  assert.equal(f.deliveryIssues, 0);
  await processEmailQueue({ prisma: f.db, now: new Date(f.now.getTime() + 10 * 60000), maxAttempts: 2, transport });
  assert.equal(calls, 2);
});

test('unknown congressless provider outcome remains terminal and cannot automatically resend a recovery link', async () => {
  const f = recoveryQueueFixture(); let calls = 0;
  const transport = { provider: 'smtp', send: async () => { calls += 1; throw new Error('provider response with PRIVATE_BODY'); } };
  await processEmailQueue({ prisma: f.db, now: f.now, transport });
  assert.equal(f.message.status, 'UNKNOWN');
  assert.equal(f.history[0].errorCode, 'DELIVERY_UNKNOWN');
  assert.ok(!JSON.stringify(f.history).includes('PRIVATE_BODY'));
  await processEmailQueue({ prisma: f.db, now: new Date(f.now.getTime() + 60000), transport });
  assert.equal(calls, 1);
});

for (const key of [...templateKeys, ...platformTemplateKeys]) for (const locale of ['tr', 'en']) {
  test(`${key} has a valid ${locale} default and self-contained sample preview`, () => {
    const content = defaultTemplate(key, locale);
    const values = sampleTemplateValues(key, locale);
    assert.deepEqual(templateProblems(key, content), []);
    assert.deepEqual(Object.keys(values).sort(), [...templatePlaceholders(key)].sort());
    const rendered = renderTemplate({ key, locale, ...content, values, replyTo: 'monitored@example.invalid', replyUrl: 'https://example.invalid/contact' });
    assert.ok(rendered.subject && rendered.text && rendered.html);
    assert.match(rendered.html, new RegExp(`<html lang="${locale}">`));
    assert.ok(rendered.text.includes('monitored@example.invalid'));
    assert.ok(!rendered.subject.includes('{{'));
    assert.ok(!rendered.text.includes('{{'));
    assert.ok(!rendered.html.includes('{{'));
  });
}

test('template input accepts only supported languages, keys, variables and exact fields', () => {
  const base = { key: 'SUBMISSION_RECEIVED', locale: 'tr', ...defaultTemplate('SUBMISSION_RECEIVED', 'tr') };
  assert.ok(templateInputSchema.safeParse(base).success);
  for (const patch of [{ locale: 'de' }, { key: 'ARBITRARY' }, { subject: '{{password}}' }, { body: '{{unknown}}' }, { body: '{congressName}' }, { body: '{{congress_name}}' }, { subject: 'Header\r\nBcc: a@example.invalid' }, { subject: 'x'.repeat(201) }, { body: 'x'.repeat(12001) }, { congressId: 'foreign' }, { simulatedFailure: 'permanent' }]) {
    assert.equal(templateInputSchema.safeParse({ ...base, ...patch }).success, false);
  }
});

test('access link remains mandatory in auth bodies and forbidden in email subjects', () => {
  for (const [key, field] of [['DRAFT_ACCESS', 'accessLink'], ['REGISTRATION_ACCESS', 'accessLink'], ['ACCOUNT_ACTIVATION', 'activationLink'], ['ACCOUNT_PASSWORD_RECOVERY', 'recoveryLink']]) {
    const content = defaultTemplate(key, 'en');
    assert.ok(templateProblems(key, { ...content, body: 'No link' }).length);
    assert.ok(templateProblems(key, { ...content, subject: `Subject {{${field}}}` }).length);
    assert.ok(templateProblems(key, { ...content, body: `https://foreign.example.invalid/?secret={{${field}}}` }).length);
  }
});

test('personal recovery template cannot be edited or sampled through congress template input', () => {
  const key = 'ACCOUNT_PASSWORD_RECOVERY';
  assert.equal(templateKeys.includes(key), false);
  assert.equal(templateInputSchema.safeParse({ key, locale: 'tr', ...defaultTemplate(key, 'tr') }).success, false);
  const values = sampleTemplateValues(key, 'tr');
  const rendered = renderTemplate({ key, locale: 'tr', ...defaultTemplate(key, 'tr'), values });
  assert.ok(rendered.text.includes('30 dakika') && rendered.text.includes('bir kez'));
  assert.ok(rendered.text.includes(values.recoveryLink));
  assert.ok(!rendered.subject.includes('token='));
  assert.throws(() => renderTemplate({ key, locale: 'tr', ...defaultTemplate(key, 'tr'), values: { ...values, recoveryLink: 'javascript:alert(1)' } }));
});

test('HTML previews escape literal markup and values while retaining plain text', () => {
  const rendered = renderTemplate({ key: 'GENERAL', locale: 'en', subject: '{{congressName}}', body: '<strong>{{message}}</strong>\n{{recipientName}}', values: { congressName: '<Title & "quote">', recipientName: "O'Example", message: '<img src=x onerror=alert(1)> & test' }, replyTo: 'monitored@example.invalid' });
  assert.ok(rendered.text.includes('<img src=x onerror=alert(1)> & test'));
  assert.ok(rendered.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; test'));
  assert.ok(rendered.html.includes('&lt;strong&gt;'));
  assert.ok(rendered.html.includes('O&#39;Example'));
  assert.ok(!rendered.html.includes('<img'));
  assert.ok(!rendered.html.includes('<strong>'));
});

test('values are substituted once and cannot introduce additional template variables', () => {
  const rendered = renderTemplate({ key: 'GENERAL', locale: 'en', subject: '{{congressName}}', body: '{{message}}', values: { congressName: 'Test', message: '{{recipientName}}', recipientName: 'MUST NOT EXPAND' }, replyTo: 'monitored@example.invalid' });
  assert.ok(rendered.text.includes('{{recipientName}}'));
  assert.ok(!rendered.text.includes('MUST NOT EXPAND'));
});

test('missing variables and invalid runtime values fail closed', () => {
  const key = 'SUBMISSION_RECEIVED';
  const base = { key, locale: 'en', ...defaultTemplate(key, 'en'), values: sampleTemplateValues(key, 'en') };
  for (const values of [{ congressName: 'Test' }, { ...base.values, privateToken: 'secret' }, { ...base.values, paperTitle: 12 }, { ...base.values, paperTitle: 'x'.repeat(50001) }, { ...base.values, congressName: 'x'.repeat(181) }]) {
    assert.throws(() => renderTemplate({ ...base, values }));
  }
});

test('multiline title variables become a safe single-line subject while the body keeps the original', () => {
  const paperTitle = 'Alpha\nBeta\tGamma\rDelta\u2028Epsilon\u2029Zeta';
  const rendered = renderTemplate({ key: 'SUBMISSION_RECEIVED', locale: 'en', subject: '{{paperTitle}}', body: '{{paperTitle}}', values: { paperTitle, congressName: 'Test Congress' } });
  assert.equal(rendered.subject, 'Alpha Beta Gamma Delta Epsilon Zeta');
  assert.ok(rendered.text.includes(paperTitle));
  assert.ok(!/[\r\n\t\u2028\u2029]/.test(rendered.subject));
});

test('long expanded subjects remain deliverable without truncating full body values', () => {
  const congressName = 'Ö'.repeat(180);
  const rendered = renderTemplate({ key: 'SUBMISSION_RECEIVED', locale: 'tr', subject: '{{congressName}}'.repeat(12), body: '{{congressName}}', values: { congressName } });
  assert.equal([...rendered.subject].length, 240);
  assert.ok(rendered.subject.endsWith('…'));
  assert.ok(rendered.text.includes(congressName));
});

test('subject truncation counts Unicode code points and never splits an astral character', () => {
  const rendered = renderTemplate({ key: 'SUBMISSION_RECEIVED', locale: 'en', subject: '{{paperTitle}}', body: '{{paperTitle}}', values: { paperTitle: '📬'.repeat(300) } });
  assert.equal(rendered.subject, '📬'.repeat(239) + '…');
  assert.ok(rendered.text.includes('📬'.repeat(300)));
});

test('a maximum-length paper title remains complete in plain text and escaped HTML while its subject is bounded', () => {
  const paperTitle = '"'.repeat(50000);
  const rendered = renderTemplate({ key: 'SUBMISSION_RECEIVED', locale: 'en', ...defaultTemplate('SUBMISSION_RECEIVED', 'en'), subject: '{{paperTitle}}', values: { congressName: 'Synthetic Congress', paperTitle } });
  assert.equal(rendered.subject, '"'.repeat(239) + '…');
  assert.ok(rendered.text.includes(paperTitle));
  assert.ok(rendered.html.includes('&quot;'.repeat(50000)));
  assert.ok(rendered.text.length <= 64000 && rendered.html.length <= 400000);
});

test('template save rejects repeated fields whose worst-case expansion exceeds a message budget', () => {
  const base = { key: 'SUBMISSION_RECEIVED', locale: 'en', subject: 'Synthetic notice' };
  for (const body of ['{{paperTitle}}\n{{paperTitle}}', '{{congressName}}'.repeat(400)]) {
    assert.equal(templateInputSchema.safeParse({ ...base, body }).success, false);
    assert.throws(() => renderTemplate({ ...base, body, values: { congressName: 'Small actual value', paperTitle: 'Small actual value' } }));
  }
});

test('literal dollar replacement tokens in contact footers remain intact', () => {
  const replyUrl = 'https://example.invalid/contact/$&';
  const rendered = renderTemplate({ key: 'GENERAL', locale: 'en', subject: 'Synthetic notice', body: '{{message}}', values: { message: 'Literal $& remains unchanged.' }, replyTo: 'monitored@example.invalid', replyUrl });
  assert.ok(rendered.text.includes(replyUrl));
  assert.ok(rendered.text.includes('Literal $& remains unchanged.'));
  assert.ok(rendered.html.includes('<a href="https://example.invalid/contact/$&amp;">https://example.invalid/contact/$&amp;</a>'));
});

test('reply-expected messages require a monitored address and validate contact URL', () => {
  const base = { key: 'GENERAL', locale: 'en', ...defaultTemplate('GENERAL', 'en'), values: sampleTemplateValues('GENERAL', 'en') };
  assert.throws(() => renderTemplate(base));
  assert.throws(() => renderTemplate({ ...base, replyTo: 'bad-address' }));
  assert.throws(() => renderTemplate({ ...base, replyTo: 'a@example.invalid\r\nBcc: b@example.invalid' }));
  assert.throws(() => renderTemplate({ ...base, replyTo: 'a@example.invalid', replyUrl: 'javascript:alert(1)' }));
});

test('URLs allow HTTPS and local loopback previews but reject executable or credential-bearing links', () => {
  for (const url of ['https://example.invalid/contact', 'http://127.0.0.1:3100/example']) assert.ok(isSafeEmailUrl(url));
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://example.invalid/access', 'https://user:password@example.invalid', 'https://example.invalid/\npath', 'not a URL']) assert.equal(isSafeEmailUrl(url), false);
  const key = 'DRAFT_ACCESS';
  const base = { key, locale: 'en', ...defaultTemplate(key, 'en'), values: sampleTemplateValues(key, 'en') };
  assert.throws(() => renderTemplate({ ...base, values: { ...base.values, accessLink: 'javascript:alert(1)' } }));
  assert.throws(() => renderTemplate({ ...base, values: { ...base.values, accessLink: '' } }));
});

test('SMTP retryable refusal differs from permanent recipient rejection', () => {
  assert.deepEqual(classifySmtpFailure({ responseCode: 451, command: 'RCPT TO' }), { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' });
  assert.deepEqual(classifySmtpFailure({ responseCode: 550, command: 'RCPT TO', response: '550 5.1.1 no such recipient' }), { kind: 'permanent', errorCode: 'RECIPIENT_REJECTED' });
  assert.deepEqual(classifySmtpFailure({ code: 'EAUTH' }), { kind: 'permanent', errorCode: 'PROVIDER_CONFIGURATION' });
});

test('SMTP DNS failures can retry; generic connection metadata cannot rule out accepted DATA', () => {
  assert.deepEqual(classifySmtpFailure({ code: 'EDNS', command: 'CONN' }), { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' });
  for (const failure of [
    { code: 'ECONNECTION', command: 'CONN' },
    { code: 'ETIMEDOUT', command: 'CONN' },
    { code: 'ESOCKET', command: 'CONN' },
    { code: 'ETIMEDOUT', command: 'DATA' },
    { code: 'ECONNRESET' },
  ]) assert.deepEqual(classifySmtpFailure(failure), { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' });
});
