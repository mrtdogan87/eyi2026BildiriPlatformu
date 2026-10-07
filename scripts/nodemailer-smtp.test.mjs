import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import nodemailer from 'nodemailer';
import { createEmailTransport } from '../src/modules/communication/transport.mjs';

// In-process loopback SMTP peer: it never forwards mail or uses production config.
async function smtpPeer(behavior = {}) {
  const connections = new Set();
  const observed = { commands: [], auth: null, mime: null };
  const server = net.createServer(socket => {
    connections.add(socket);
    socket.once('close', () => connections.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    let buffer = '', inData = false;
    const send = line => socket.write(`${line}\r\n`);
    send('220 loopback.invalid ESMTP compatibility test');
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.length) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          observed.mime = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          if (behavior.dropAfterData) return socket.destroy();
          send('250 2.0.0 Stored only in test memory');
          continue;
        }
        const end = buffer.indexOf('\r\n');
        if (end < 0) return;
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const verb = line.split(' ')[0].toUpperCase();
        observed.commands.push(verb);
        if (verb === 'EHLO') {
          send('250-loopback.invalid');
          send('250 AUTH PLAIN');
        } else if (verb === 'AUTH') {
          assert.match(line, /^AUTH PLAIN /);
          observed.auth = Buffer.from(line.slice(11), 'base64').toString('utf8');
          send(behavior.authFailure ? '535 5.7.8 Synthetic login failure' : '235 2.7.0 Authenticated');
        } else if (verb === 'MAIL') {
          assert.match(line, /^MAIL FROM:<sender@example.invalid>/);
          send('250 2.1.0 Sender accepted');
        } else if (verb === 'RCPT') {
          assert.match(line, /^RCPT TO:<recipient@example.invalid>/);
          send(behavior.recipientStatus === 550 ? '550 5.1.1 Synthetic recipient refusal' : behavior.recipientStatus === 451 ? '451 4.3.0 Synthetic temporary refusal' : '250 2.1.5 Recipient accepted');
        } else if (verb === 'DATA') {
          inData = true;
          send('354 End with CRLF dot CRLF');
        } else if (verb === 'QUIT') {
          socket.end('221 2.0.0 Closing\r\n');
        } else if (verb === 'RSET') {
          send('250 2.0.0 Reset');
        } else {
          send('502 5.5.1 Unsupported synthetic command');
        }
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    port: server.address().port, observed,
    async close() {
      for (const socket of connections) socket.destroy();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

const productionFixture = port => ({
  APP_ENV: 'production',
  APP_BASE_URL: 'https://compat.example.invalid',
  SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_production',
  DRAFT_SESSION_SECRET: 'synthetic-only-not-a-production-secret-0123456789',
  FILE_STORAGE: 'database', V2_DB_HOST: 'db.example.invalid',
  DATABASE_URL: 'postgresql://aibildiri_v2_production:synthetic@db.example.invalid/aibildiri_v2_production',
  DIRECT_URL: 'postgresql://aibildiri_v2_production:synthetic@db.example.invalid/aibildiri_v2_production',
  MAIL_MODE: 'delivery', EMAIL_DELIVERY_ENABLED: 'true', MAIL_PROVIDER: 'smtp',
  SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_SECURE: 'false',
  SMTP_USER: 'sender@example.invalid', SMTP_PASS: 'synthetic-smtp-password',
  SMTP_FROM: 'sender@example.invalid', SMTP_FROM_NAME: 'Synthetic Congress',
});

const message = {
  id: 'smtp-compat-1', recipient: 'recipient@example.invalid',
  subject: 'Compatibility notice', text: 'Synthetic plain text body.',
  html: '<p>Synthetic HTML body.</p>', replyTo: 'reply@example.invalid',
};

test('Nodemailer default ESM and CommonJS imports expose createTransport', () => {
  assert.equal(typeof nodemailer.createTransport, 'function');
  assert.equal(typeof createRequire(import.meta.url)('nodemailer').createTransport, 'function');
});

test('application SMTP transport authenticates, sends MIME, and returns accepted', { timeout: 5000 }, async t => {
  const peer = await smtpPeer(); t.after(() => peer.close());
  const transport = createEmailTransport({ env: productionFixture(peer.port) });
  assert.equal(transport.provider, 'smtp');
  assert.deepEqual(await transport.send(message), { kind: 'accepted', providerId: '<smtp-compat-1@aibildiri-v2.invalid>' });
  assert.equal(peer.observed.auth, '\0sender@example.invalid\0synthetic-smtp-password');
  assert.deepEqual(peer.observed.commands.slice(0, 5), ['EHLO', 'AUTH', 'MAIL', 'RCPT', 'DATA']);
  for (const pattern of [
    /^From: Synthetic Congress <sender@example\.invalid>\r?$/m,
    /^To: recipient@example\.invalid\r?$/m,
    /^Reply-To: reply@example\.invalid\r?$/m,
    /^Subject: Compatibility notice\r?$/m,
    /^Message-ID: <smtp-compat-1@aibildiri-v2\.invalid>\r?$/m,
    /^MIME-Version: 1\.0\r?$/m,
    /^Content-Type: multipart\/alternative;/m,
    /Content-Type: text\/plain; charset=utf-8/,
    /Content-Type: text\/html; charset=utf-8/,
    /Synthetic plain text body\./, /<p>Synthetic HTML body\.<\/p>/,
  ]) assert.match(peer.observed.mime, pattern);
});

for (const [name, behavior, outcome] of [
  ['permanent recipient refusal', {recipientStatus: 550}, {kind: 'permanent', errorCode: 'RECIPIENT_REJECTED'}],
  ['transient recipient refusal', {recipientStatus: 451}, {kind: 'retry', errorCode: 'TEMPORARY_FAILURE'}],
  ['authentication failure', {authFailure: true}, {kind: 'permanent', errorCode: 'PROVIDER_CONFIGURATION'}],
  ['ambiguous connection loss after DATA', {dropAfterData: true}, {kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN'}],
]) {
  test(`application SMTP transport preserves ${name}`, { timeout: 5000 }, async t => {
    const peer = await smtpPeer(behavior); t.after(() => peer.close());
    assert.deepEqual(await createEmailTransport({ env: productionFixture(peer.port) }).send(message), outcome);
    if (!behavior.dropAfterData) assert.equal(peer.observed.mime, null);
  });
}
