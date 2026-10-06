import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { waitForCapturedMail } from './captured-mail.mjs';

loadEnv(); assertLocal();
const base = process.env.APP_BASE_URL;
const runId = randomUUID();
const email = `p02-${runId}@example.invalid`;
const coauthorEmail = `coauthor-${runId}@example.invalid`;
const presenterName = `P02 Test Sunucu ${runId.slice(0, 8)}`;
const checks = [];
const prisma = new PrismaClient();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function ok(condition, label) { assert.ok(condition, label); checks.push(label); }
function jar() { return new Map(); }
const participant = jar(); const admin = jar(); const registration = jar();
async function request(path, { method = 'GET', body, cookies = jar(), status = 200 } = {}) {
  const headers = { cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join(';') };
  if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  assert.equal(response.status, status, `${method} ${path} HTTP status`);
  for (const cookie of response.headers.getSetCookie()) {
    const part = cookie.split(';')[0]; const i = part.indexOf('=');
    const name = part.slice(0, i); const value = part.slice(i+1);
    if (value) cookies.set(name, value); else cookies.delete(name);
  }
  return response;
}
const captured = (to, subject) => waitForCapturedMail(to, { subject });
function tokenFrom(mail) {
  const link = mail.text.split('\n').find(x => x.startsWith(base) && x.includes('?token='));
  assert.ok(link, 'Captured access email contains a local link');
  const url = new URL(link);
  assert.equal(url.origin, base);
  return url.searchParams.get('token');
}
try {
  await request('/eyi-2026'); await request('/eyi-2026/bildiri-gonder'); await request('/eyi-2026/kayit');
  checks.push('Hub, submission and registration pages respond');
  await request('/api/submissions/drafts', { method: 'POST', body: { congressSlug: 'eyi-2026-kapali-test', email }, status: 403 });
  checks.push('Closed congress rejects new submissions');
  const draft = await (await request('/api/submissions/drafts', { method: 'POST', cookies: participant, body: { congressSlug: 'eyi-2026', email, submissionLanguage: 'TR' } })).json();
  ok(!draft.submissionId && !draft.submission && !draft.magicLinkPreview && participant.size === 0, 'Draft request exposes no draft data or authenticated cookie');
  const verified = await (await request('/api/submissions/drafts/verify', { method: 'POST', cookies: participant, body: { token: tokenFrom(await captured(email, 'Taslak')) } })).json();
  const id = verified.submission.id;
  ok(participant.has('aibildiri_v2_local_draft_access') && !participant.has('draft_access'), 'Verified draft cookie uses independent namespace');
  checks.push('Captured draft link can be verified');
  const details = { submissionLanguage: 'TR', titleTr: `P02 uçtan uca sentetik bildiri ${runId.slice(0,8)}`, titleEn: '', abstractTr: 'Yalnız bağımsız yerel geliştirme için sentetik başvuru.', abstractEn: '', keywordsTr: 'test, yerel', keywordsEn: '' };
  await request(`/api/submissions/${id}/details`, { method: 'PATCH', body: details, status: 403 });
  await request(`/api/submissions/${id}/details`, { method: 'PATCH', body: details, cookies: new Map([['aibildiri_v2_local_draft_access', `${id}.short`]]), status: 403 });
  await request(`/api/submissions/${id}/details`, { method: 'PATCH', cookies: participant, body: details });
  await request(`/api/submissions/${id}/authors`, { method: 'PATCH', cookies: participant, body: { authors: [
    { fullName: presenterName, title: 'Dr.', email, institution: 'Test Üniversitesi', country: 'Türkiye', isPresenter: true },
    { fullName: 'P02 Ortak Yazar', title: 'Dr.', email: coauthorEmail, institution: 'Test Üniversitesi', country: 'Türkiye', isPresenter: false },
  ] } });
  await request(`/api/submissions/${id}/participation`, { method: 'PATCH', cookies: participant, body: { presentationMode: 'IN_PERSON', audience: 'ACADEMIC' } });
  const docx = readFileSync(new URL('./fixtures/synthetic.docx', import.meta.url));
  const fileForm = new FormData();
  fileForm.set('file', new File([docx], 'synthetic.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  await request(`/api/submissions/${id}/file`, { method: 'PUT', cookies: participant, body: fileForm });
  const submit = await (await request(`/api/submissions/${id}/submit`, { method: 'POST', cookies: participant, body: { declarations: { accuracy: true, submissionLimit: true, coauthorApproval: true, personalDataConsent: true, registrationPresentationConsent: true } } })).json();
  ok(submit.submission.status === 'SUBMITTED', 'Draft, details, authors, participation, DOCX and final submission complete');
  ok(Boolean(await captured(email, 'Alındı')) && Boolean(await captured(coauthorEmail, 'Alındı')), 'Submission notifications captured for both synthetic authors');
  await request('/api/admin/submissions', { status: 401 });
  const legacySignature = createHmac('sha256', 'retired-legacy-test-signing-secret').update('eyi-2026').digest('hex');
  await request('/api/admin/submissions', { cookies: new Map([['admin_session', `eyi-2026.${legacySignature}`]]), status: 401 });
  await request('/api/admin/login', { method: 'POST', cookies: admin, body: JSON.parse(readFileSync('.local/p03-accounts.json', 'utf8')).organizer });
  await request('/api/platform/context', { method: 'POST', cookies: admin, body: { congressId: 'local-eyi-2026' } });
  ok(admin.has('aibildiri_v2_local_platform_session'), 'Admin rejects legacy cookie and accepts personal platform session');
  await request(`/api/admin/submissions/${id}/file`, { status: 401 });
  const downloaded = Buffer.from(await (await request(`/api/admin/submissions/${id}/file`, { cookies: admin })).arrayBuffer());
  ok(digest(downloaded) === digest(docx), 'Admin DOCX download matches uploaded bytes');
  await request(`/api/admin/submissions/${id}/status`, { method: 'POST', cookies: admin, body: { status: 'ACCEPTED', note: 'P02 sentetik test kabulü' } });
  ok(Boolean(await captured(email, 'Durum')) && Boolean(await captured(coauthorEmail, 'Durum')), 'Acceptance emails captured without delivery');
  await request('/api/registrations/request', { method: 'POST', body: { congressSlug: 'eyi-2026', email } });
  await request('/api/registrations/verify', { method: 'POST', cookies: registration, body: { token: tokenFrom(await captured(email, 'Kayıt')) } });
  ok(registration.has('aibildiri_v2_local_registration_access'), 'Registration access link and separate cookie work');
  await request('/api/registrations/context', { cookies: registration });
  const receipt = readFileSync(new URL('./fixtures/synthetic-receipt.pdf', import.meta.url));
  const registrationForm = new FormData();
  registrationForm.set('presenterName', presenterName);
  registrationForm.set('paperSubmissionIds', JSON.stringify([id]));
  registrationForm.set('listenerEnabled', 'false');
  registrationForm.set('receipt', new File([receipt], 'synthetic-receipt.pdf', { type: 'application/pdf' }));
  registrationForm.set('studentDocument', new File([receipt], 'synthetic-student-document.pdf', { type: 'application/pdf' }));
  const result = await (await request('/api/registrations', { method: 'POST', cookies: registration, body: registrationForm })).json();
  const saved = await prisma.registration.findUniqueOrThrow({ where: { id: result.registrationId }, include: { receipt: true, studentDocument: true, paperItems: true } });
  ok(saved.totalAmount === 100 && saved.paperItems[0].submissionId === id, 'Accepted paper registration uses synthetic 100 TRY fee');
  ok(digest(saved.receipt.content) === digest(receipt) && digest(saved.studentDocument.content) === digest(receipt), 'Receipt and optional student document stored in local DB');
  await request(`/api/admin/registrations/${saved.id}/receipt`, { status: 401 });
  const receiptDownload = Buffer.from(await (await request(`/api/admin/registrations/${saved.id}/receipt`, { cookies: admin })).arrayBuffer());
  ok(digest(receiptDownload) === digest(receipt), 'Authorized receipt download matches; anonymous access denied');
  await request('/api/admin/logout', { method: 'POST', cookies: admin });
  await request('/api/admin/submissions', { cookies: admin, status: 401 });
  checks.push('Admin logout revokes this session');
  const report = { executedAt: new Date().toISOString(), environment: 'local', database: 'aibildiri_v2@127.0.0.1:55432', realEmailsSent: 0, checks };
  writeFileSync('.local/smoke-result.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`P02 smoke passed: ${checks.length} checks; only synthetic data and captured email.`);
} finally { await prisma.$disconnect(); }
