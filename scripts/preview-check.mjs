// Prove the built preview gate locally without connecting to a preview/live DB.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { assertEnvironment } from './environment.mjs';
import { root } from './load-env.mjs';

process.chdir(root);
const secret = () => randomBytes(32).toString('hex');
const env = { ...process.env, APP_ENV: 'preview', APP_BASE_URL: 'https://v2-preview.example.invalid',
  V2_DB_HOST: '127.0.0.1', DATABASE_URL: 'postgresql://aibildiri_v2_preview:ephemeral@127.0.0.1:55434/aibildiri_v2_preview',
  DIRECT_URL: 'postgresql://aibildiri_v2_preview:ephemeral@127.0.0.1:55434/aibildiri_v2_preview',
  SESSION_COOKIE_NAMESPACE: 'aibildiri_v2_preview', DRAFT_SESSION_SECRET: secret(), ADMIN_SESSION_SECRET: secret(), ADMIN_PASSWORD: secret(),
  PREVIEW_ACCESS_USER: 'p02-preview-probe', PREVIEW_ACCESS_PASSWORD: secret(),
  FILE_STORAGE: 'database', MAIL_MODE: 'capture', MAIL_CAPTURE_DIR: '/app/.preview/mail',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '', RESEND_API_KEY: '', RESEND_SENDER_EMAIL: '',
  HOSTNAME: '127.0.0.1', PORT: '3102', NODE_ENV: 'production',
};
assertEnvironment(env);
const child = spawn('node', ['.next/standalone/server.js'], { env, stdio: 'ignore' });
const base = 'http://127.0.0.1:3102';
let ready = false;
try {
  for (let i = 0; i < 40; i++) {
    try { await fetch(`${base}/admin`); ready = true; break; } catch { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!ready) throw new Error('Preview probe server did not start');
  const checks = [];
  for (const path of ['/api/admin/submissions/test/revisions', '/api/admin/submissions/test/revisions/test', '/api/participant/revisions/test', '/api/platform/own/revisions/test', '/eyi-2026/katilimci/duzeltme/test', '/admin/kayitlarim/duzeltme/test', '/admin/is-listesi', '/api/platform/worklist', '/api/platform/worklist/test', '/api/platform/own/requests', '/api/platform/own/open', '/api/participant/access', '/api/participant/verify', '/api/participant/logout', '/api/participant/overview', '/api/participant/requests', '/api/participant/open', '/eyi-2026/katilimci', '/eyi-2026/katilimci/devam', '/eyi-2026/katilimci/panel', '/admin/iletisim', '/api/platform/communication', '/api/platform/communication/settings', '/api/platform/communication/templates', '/api/platform/communication/preview', '/api/platform/communication/test', '/api/platform/communication/messages/test', '/api/platform/communication/messages/test/retry', '/api/platform/communication/messages/test/cancel', '/api/platform/communication/issues/test']) {
    const r = await fetch(base + path);
    if (r.status !== 401 || !r.headers.get('www-authenticate') || r.headers.get('x-robots-tag') !== 'noindex, nofollow') throw new Error('Communication preview access was not blocked');
    checks.push(`Anonymous ${path}: 401`);
  }
  for (const path of ['/admin/icerik', '/admin/talepler', '/api/platform/content', '/api/platform/content/test/publication', '/api/platform/feedback', '/api/public/congresses/eyi-2026/feedback', '/admin', '/eyi-2026', '/api/admin/submissions', '/api/registrations/request', '/api/admin/submissions/test/file', '/api/platform/site', '/api/public/congresses/eyi-2026/assets/logo', '/admin/cms', '/admin/cms/test/onizleme', '/api/platform/cms/pages', '/api/platform/cms/templates', '/api/platform/cms/eyi-import', '/api/platform/cms/pages/test/manage', '/admin/cms/aktarim', '/api/platform/cms/media/test/file', '/eyi-2026/sayfalar/rehber', '/api/public/congresses/eyi-2026/media/test']) {
    const r = await fetch(base + path);
    if (r.status !== 401 || !r.headers.get('www-authenticate') || r.headers.get('x-robots-tag') !== 'noindex, nofollow') throw new Error('Preview anonymous request was not blocked');
    checks.push(`Anonymous ${path}: 401`);
  }
  const css = /href="([^\"]+\.css[^\"]*)"/.exec(await (await fetch(`${base}/admin`, { headers: { authorization: `Basic ${Buffer.from(`${env.PREVIEW_ACCESS_USER}:${env.PREVIEW_ACCESS_PASSWORD}`).toString('base64')}` } })).text())?.[1];
  if (!css) throw new Error('Authorized preview admin page failed to render');
  const unauthorizedAsset = await fetch(base + css);
  if (unauthorizedAsset.status !== 401) throw new Error('Preview static asset leaked without auth');
  const authorization = `Basic ${Buffer.from(`${env.PREVIEW_ACCESS_USER}:${env.PREVIEW_ACCESS_PASSWORD}`).toString('base64')}`;
  const r = await fetch(`${base}/admin`, { headers: { authorization } });
  if (r.status !== 200 || r.headers.get('x-robots-tag') !== 'noindex, nofollow') throw new Error('Authorized preview failed');
  const asset = await fetch(base + css, { headers: { authorization } });
  if (asset.status !== 200) throw new Error('Authorized preview asset failed');
  checks.push('Anonymous CSS: 401; authorized admin and CSS: 200');
  for (const headers of [{rsc:'1', 'next-router-prefetch':'1'}, {'x-middleware-subrequest':'proxy:proxy:proxy:proxy:proxy'}]) {
    const probe = await fetch(`${base}/admin/cms/test/onizleme`, {headers});
    if (probe.status !== 401) throw new Error('Preview protection failed for a special request');
  }
  checks.push('CMS preview prefetch and subrequest probes: 401');
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) });
  if (login.status !== 400 || login.headers.getSetCookie().length) throw new Error('Legacy shared-password login unexpectedly accepted');
  checks.push('Shared-password-only login rejected before a database connection');
  writeFileSync('.local/preview-check-result.json', JSON.stringify({ executedAt: new Date().toISOString(), databaseConnected: false, checks }, null, 2) + '\n', { mode: 0o600 });
  console.log('Preview gate passed: pages, APIs, files and CSS protected; valid credentials accepted. No DB connection used.');
} finally { child.kill('SIGTERM'); }
