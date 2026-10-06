import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipient, retryDelay, enqueueMessage, processEmailQueue } from '../src/modules/communication/queue.mjs';
import { classifySmtpFailure } from '../src/modules/communication/transport.mjs';
import { templateKeys, templatePlaceholders, defaultTemplate, templateProblems, templateInputSchema, renderTemplate, sampleTemplateValues, isSafeEmailUrl } from '../src/modules/communication/templates.ts';

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

for (const key of templateKeys) for (const locale of ['tr', 'en']) {
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
  for (const [key, field] of [['DRAFT_ACCESS', 'accessLink'], ['REGISTRATION_ACCESS', 'accessLink'], ['ACCOUNT_ACTIVATION', 'activationLink']]) {
    const content = defaultTemplate(key, 'en');
    assert.ok(templateProblems(key, { ...content, body: 'No link' }).length);
    assert.ok(templateProblems(key, { ...content, subject: `Subject {{${field}}}` }).length);
    assert.ok(templateProblems(key, { ...content, body: `https://foreign.example.invalid/?secret={{${field}}}` }).length);
  }
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

test('SMTP pre-connection failures can retry, DATA ambiguity cannot', () => {
  assert.deepEqual(classifySmtpFailure({ code: 'ETIMEDOUT', command: 'CONN' }), { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' });
  assert.deepEqual(classifySmtpFailure({ code: 'ETIMEDOUT', command: 'DATA' }), { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' });
  assert.deepEqual(classifySmtpFailure({ code: 'ECONNRESET' }), { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' });
});
