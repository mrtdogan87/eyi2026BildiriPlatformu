import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, link, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';
import { assertEnvironment } from '../../../scripts/environment.mjs';

function captureTransport(directory) {
  return {
    provider: 'capture',
    async send(message) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const identity = createHash('sha256').update(message.id).digest('hex');
      const filename = `${new Date(message.createdAt).toISOString().replaceAll(':', '-')}-${identity}.json`;
      const destination = resolve(directory, filename);
      const temporary = resolve(directory, `.${identity}-${randomUUID()}.tmp`);
      const payload = {
        id: message.id, capturedAt: new Date().toISOString(), payloadHash: message.payloadHash,
        congressId: message.congressId, to: message.recipient, subject: message.subject,
        text: message.text, html: message.html, replyTo: message.replyTo,
      };
      try {
        const file = await open(temporary, 'wx', 0o600);
        try { await file.writeFile(JSON.stringify(payload, null, 2)); await file.sync(); }
        finally { await file.close(); }
        try {
          // A fully written inode becomes visible in one operation; an existing capture wins.
          await link(temporary, destination);
        } catch (error) {
          if (error?.code !== 'EEXIST') throw error;
          const existing = JSON.parse(await readFile(destination, 'utf8'));
          if (existing.id !== message.id || existing.payloadHash !== message.payloadHash) throw new Error('CAPTURE_CONFLICT');
        }
        return { kind: 'captured', providerId: `capture:${message.id}` };
      } finally { await unlink(temporary).catch(() => {}); }
    },
  };
}

export function classifySmtpFailure(error) {
  const status = Number(error?.responseCode);
  if (status >= 400 && status <= 499) return { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' };
  if (error?.code === 'EAUTH') return { kind: 'permanent', errorCode: 'PROVIDER_CONFIGURATION' };
  if (status >= 500 && status <= 599) {
    return { kind: 'permanent', errorCode: String(error?.command ?? '').startsWith('RCPT') ? 'RECIPIENT_REJECTED' : 'PROVIDER_REJECTED' };
  }
  // DNS resolution fails before SMTP starts. Generic connection errors can be
  // labelled CONN even after DATA, so they cannot safely trigger another send.
  if (error?.code === 'EDNS') {
    return { kind: 'retry', errorCode: 'TEMPORARY_FAILURE' };
  }
  return { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' };
}

function smtpTransport(env) {
  const port = Number(env.SMTP_PORT ?? 465);
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('EMAIL_PROVIDER_CONFIGURATION');
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  return {
    provider: 'smtp',
    async send(message) {
      try {
        const info = await transport.sendMail({
          from: { name: env.SMTP_FROM_NAME ?? 'Congress Platform', address: env.SMTP_FROM ?? env.SMTP_USER },
          to: message.recipient, subject: message.subject, text: message.text, html: message.html,
          ...(message.replyTo ? { replyTo: message.replyTo } : {}),
          messageId: `<${message.id}@aibildiri-v2.invalid>`,
        });
        if (!info.accepted?.length) return { kind: 'permanent', errorCode: 'RECIPIENT_REJECTED' };
        return { kind: 'accepted', providerId: info.messageId };
      } catch (error) { return classifySmtpFailure(error); }
    },
  };
}

function resendTransport(env) {
  if (!env.RESEND_API_KEY || !env.RESEND_SENDER_EMAIL) throw new Error('EMAIL_PROVIDER_CONFIGURATION');
  return {
    provider: 'resend',
    async send(message) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(30000),
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
            // Stable for every attempt. Resend retains this key for 24 hours; an ambiguous
            // acceptance is still UNKNOWN, so it cannot be replayed after that window.
            'Idempotency-Key': `p09:${message.id}`,
          },
          body: JSON.stringify({
            from: `${env.RESEND_SENDER_NAME ?? 'Congress Platform'} <${env.RESEND_SENDER_EMAIL}>`,
            to: [message.recipient], subject: message.subject, text: message.text, html: message.html,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          }),
        });
        if (response.status === 429) return { kind: 'retry', errorCode: 'RATE_LIMITED' };
        if ([401, 403].includes(response.status)) return { kind: 'permanent', errorCode: 'PROVIDER_CONFIGURATION' };
        if (response.status >= 400 && response.status < 500 && response.status !== 408) return { kind: 'permanent', errorCode: 'PROVIDER_REJECTED' };
        if (!response.ok) return { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' };
        const result = await response.json();
        if (typeof result?.id !== 'string') return { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' };
        return { kind: 'accepted', providerId: result.id };
      } catch { return { kind: 'unknown', errorCode: 'DELIVERY_UNKNOWN' }; }
    },
  };
}

export function createEmailTransport({ env = process.env, root = env.V2_LOCAL_ROOT ?? process.cwd() } = {}) {
  const config = assertEnvironment(env);
  if (config.mode !== 'production') {
    const directory = config.mode === 'local' ? resolve(root, config.captureDir) : resolve(config.captureDir);
    return captureTransport(directory);
  }
  const smtp = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  const resend = Boolean(env.RESEND_API_KEY && env.RESEND_SENDER_EMAIL);
  const provider = env.MAIL_PROVIDER ?? env.EMAIL_PRIMARY ?? (smtp && !resend ? 'smtp' : resend && !smtp ? 'resend' : null);
  if (provider === 'smtp') return smtpTransport(env);
  if (provider === 'resend') return resendTransport(env);
  throw new Error('EMAIL_PROVIDER_SELECTION_REQUIRED');
}
