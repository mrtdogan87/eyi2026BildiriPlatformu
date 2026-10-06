import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { hashToken } from '../src/platform/password.mjs';
import { waitForCapturedMail } from './captured-mail.mjs';
loadEnv(); assertLocal();
const prisma = new PrismaClient(); const base = process.env.APP_BASE_URL;
const accounts = JSON.parse(readFileSync('.local/p03-accounts.json', 'utf8'));
const checks = [];
const jars = {};
async function req(path, { method = 'GET', body, jar, status = 200, origin } = {}) {
  const headers = {}; if (jar?.cookie) headers.cookie = jar.cookie;
  if (body !== undefined) headers['content-type'] = 'application/json'; if (origin) headers.origin = origin;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  if (jar) for (const cookie of response.headers.getSetCookie()) {
    const values = new Map((jar.cookie ?? '').split('; ').filter(Boolean).map(pair => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]));
    const pair = cookie.split(';')[0]; const index = pair.indexOf('='); const name = pair.slice(0, index); const value = pair.slice(index + 1);
    if (value) values.set(name, value); else values.delete(name);
    jar.cookie = [...values].map(([key, val]) => `${key}=${val}`).join('; ');
  }
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, received ${response.status}`);
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text();
  return { data, response };
}
function passed(text) { checks.push(text); console.log(`PASS ${text}`); }
async function login(key, congressId = 'local-eyi-2026') {
  const jar = {}; await req('/api/admin/login', { method: 'POST', body: accounts[key], jar });
  if (congressId) await req('/api/platform/context', { method: 'POST', body: { congressId }, jar });
  jars[key] = jar; return jar;
}
try {
  await req('/api/admin/submissions', { status: 401 });
  await req('/api/admin/submissions/local-paper-submitted/file', { status: 401 });
  await req('/api/admin/login', { method: 'POST', body: { password: 'retired-shared-password-probe' }, status: 400 });
  passed('Anonymous and shared-password access rejected');
  for (const key of ['platform', 'institution', 'organizer', 'secretary', 'editor', 'reviewer', 'chair', 'participant']) await login(key);
  const organizer = jars.organizer;
  const list = (await req('/api/admin/submissions', { jar: organizer })).data.submissions;
  assert(!list.some(p => p.id === 'local-paper-b'));
  const contexts = (await req('/api/platform/context', { jar: organizer })).data.contexts;
  assert(contexts.some(c => c.id === 'local-eyi-2026'));
  assert(!contexts.some(c => ['local-closed','local-congress-b'].includes(c.id)));
  for (const context of contexts.filter(c => c.id !== 'local-eyi-2026')) assert(context.name.startsWith('P04 '), 'Only explicitly created P04 fixtures may add organizer contexts');
  const orgContexts = (await req('/api/platform/context', { jar: jars.institution })).data.contexts;
  assert(orgContexts.some(c => c.id === 'local-closed')); assert(!orgContexts.some(c => c.id === 'local-congress-b'));
  await req('/api/platform/context', { method: 'POST', body: { congressId: 'local-congress-b' }, jar: organizer, status: 403 });
  const beforeB = await prisma.submission.findUniqueOrThrow({ where: { id: 'local-paper-b' } });
  for (const path of ['/api/admin/submissions/local-paper-b', '/api/admin/submissions/local-paper-b/file', '/api/admin/registrations/local-registration-b', '/api/admin/registrations/local-registration-b/receipt', '/api/admin/registrations/local-registration-b/student-document']) await req(path, { jar: organizer, status: 404 });
  await req('/api/admin/submissions/local-paper-b/status', { method: 'POST', body: { status: 'REJECTED' }, jar: organizer, status: 404 });
  await req('/api/admin/submissions/local-paper-b', { method: 'DELETE', body: { confirmation: 'Bu bildiriyi silmeyi onaylıyorum' }, jar: organizer, status: 404 });
  const afterB = await prisma.submission.findUniqueOrThrow({ where: { id: 'local-paper-b' } }); assert.equal(beforeB.status, afterB.status);
  const foreignPage = await req('/admin/bildiriler/local-paper-b', { jar: organizer, status: 404 }); assert(!foreignPage.data.includes('Yalnız B kurumunun bildirisi'));
  passed('A congress cannot list, read, change, delete or download B records; UI also returns 404');
  const b = await login('organizerB', 'local-congress-b');
  const bList = (await req('/api/admin/submissions', { jar: b })).data.submissions;
  assert(bList.every(p => p.id === 'local-paper-b'));
  await req('/api/admin/submissions/local-paper-submitted/file', { jar: b, status: 404 });
  await req('/api/admin/registrations/local-registration-a/receipt', { jar: b, status: 404 });
  await req('/api/admin/submissions/local-paper-b/file', { jar: b });
  passed('B congress has only B records and files');
  const platformContexts = (await req('/api/platform/context', { jar: jars.platform })).data.contexts;
  assert(platformContexts.some(c => c.id === 'local-congress-b'));
  await req('/api/platform/context', { method: 'POST', body: { congressId: 'local-congress-b' }, jar: jars.platform });
  await req('/api/admin/submissions/local-paper-b', { jar: jars.platform });
  await req('/api/admin/submissions/local-paper-submitted', { jar: jars.platform, status: 404 });
  passed('Platform admin explicitly selects context; institution organizer stays inside institution');
  const secretary = jars.secretary;
  await req('/api/admin/submissions', { jar: secretary }); await req('/api/admin/registrations', { jar: secretary }); await req('/api/admin/submissions/local-paper-submitted/file', { jar: secretary });
  for (const path of ['/api/platform/members', '/api/platform/modules', '/api/platform/audit']) await req(path, { jar: secretary, status: 403 });
  await req('/api/admin/congress', { method: 'PATCH', body: { bankName: 'Forbidden' }, jar: secretary, status: 403 });
  await req('/api/admin/submissions/local-paper-submitted', { method: 'DELETE', body: { confirmation: 'Bu bildiriyi silmeyi onaylıyorum' }, jar: secretary, status: 403 });
  await req('/api/admin/registrations/local-registration-a', { method: 'DELETE', body: { confirmation: 'Bu kaydı silmeyi onaylıyorum' }, jar: secretary, status: 403 });
  const secretaryPage = (await req('/admin/bildiriler/local-paper-submitted', { jar: secretary })).data;
  assert(!secretaryPage.includes('Bu bildiriyi silmeyi onaylıyorum'));
  passed('Secretary can read and download; cannot delete, manage accounts, settings, modules or audit');
  for (const key of ['editor', 'reviewer', 'chair', 'participant']) {
    await req('/admin/panel', { jar: jars[key] });
    await req('/api/admin/submissions', { jar: jars[key], status: 403 });
    await req('/api/admin/registrations', { jar: jars[key], status: 403 });
    await req('/api/admin/submissions/local-paper-submitted/file', { jar: jars[key], status: 403 });
    await req('/api/platform/modules', { jar: jars[key], status: 403 });
    await req('/admin/bildiriler', { jar: jars[key], status: 307 });
  }
  const own = (await req('/api/platform/own', { jar: jars.participant })).data;
  assert(own.submissions.some(p => p.id === 'local-paper-submitted')); assert(!own.submissions.some(p => p.id === 'local-paper-b'));
  assert(own.registrations.every(r => r.id !== 'local-registration-b'));
  passed('Editor, reviewer, chair and participant roles stay out of administrative records; participant sees own congress records');
  const statusRecord = await prisma.submission.findUniqueOrThrow({ where: { id: 'local-paper-submitted' } });
  const targetStatus = statusRecord.status === 'UNDER_REVIEW' ? 'SUBMITTED' : 'UNDER_REVIEW';
  await req('/api/admin/submissions/local-paper-submitted/status', { method: 'POST', body: { status: targetStatus, note: 'P03 isolation test' }, jar: secretary });
  const audit = await prisma.auditLog.findFirst({ where: { targetId: 'local-paper-submitted', action: 'submission.status' }, orderBy: { createdAt: 'desc' } });
  assert.equal(audit.actorId, 'local-user-secretary'); assert.equal(audit.congressId, 'local-eyi-2026'); assert.equal(audit.detail.after, targetStatus);
  await req('/api/admin/submissions/local-paper-submitted/status', { method: 'POST', body: { status: statusRecord.status }, jar: secretary });
  passed('Status mutation and history have actor/congress audit evidence');
  await req('/api/platform/modules', { method: 'PATCH', body: { key: 'REVIEWS', enabled: true }, jar: organizer, status: 400 });
  const publicEmail = `p03-owner-${Date.now()}@example.invalid`; const draftJar = {}; const regJar = {};
  const latestMail = (to, subject) => waitForCapturedMail(to, { subject });
  await req('/api/submissions/drafts', { method: 'POST', body: { congressSlug: 'eyi-2026', email: publicEmail } });
  const draftToken = /token=([a-f0-9]+)/.exec((await latestMail(publicEmail, 'Taslak')).text)[1];
  await req('/api/submissions/drafts/verify', { method: 'POST', body: { token: draftToken, congressSlug: 'kongre-b-2026' }, status: 400 });
  const draft = (await req('/api/submissions/drafts/verify', { method: 'POST', body: { token: draftToken, congressSlug: 'eyi-2026' }, jar: draftJar })).data.submission;
  const crossDraftPage = (await req(`/kongre-b-2026/bildiri-gonder?draft=${draft.id}`, { jar: draftJar })).data;
  assert(!crossDraftPage.includes(publicEmail));
  await req('/api/registrations/request', { method: 'POST', body: { congressSlug: 'eyi-2026', email: publicEmail } });
  const regToken = /token=([a-f0-9]+)/.exec((await latestMail(publicEmail, 'Kayıt')).text)[1];
  await req('/api/registrations/verify', { method: 'POST', body: { token: regToken, congressSlug: 'kongre-b-2026' }, status: 400 });
  await req('/api/registrations/verify', { method: 'POST', body: { token: regToken, congressSlug: 'eyi-2026' }, jar: regJar });
  await req('/api/registrations/context', { jar: regJar });
  passed('Magic links reject mismatched congress and a draft cookie cannot render its data under another congress URL');
  const preserved = await prisma.submission.count({ where: { congressId: 'local-eyi-2026' } });
  try {
    await req('/api/platform/modules', { method: 'PATCH', body: { key: 'SUBMISSIONS', enabled: false }, jar: organizer });
    await req('/api/admin/submissions', { jar: organizer, status: 403 });
    await req('/api/admin/submissions/local-paper-submitted/file', { jar: organizer, status: 403 });
    await req('/api/submissions/drafts', { method: 'POST', body: { congressSlug: 'eyi-2026', email: 'blocked@example.invalid' }, status: 403 });
    await req('/api/submissions/local-paper-submitted/details', { method: 'PATCH', body: {}, status: 403 });
    for (const [suffix, method] of [['details', 'PATCH'], ['authors', 'PATCH'], ['participation', 'PATCH'], ['file', 'PUT'], ['submit', 'POST']]) {
      await req(`/api/submissions/${draft.id}/${suffix}`, { method, body: {}, jar: draftJar, status: 403 });
    }
    await req('/api/submissions/drafts/verify', { method: 'POST', body: { token: draftToken }, jar: draftJar, status: 403 });
    const closed = (await req('/eyi-2026/bildiri-gonder')).data; assert(closed.includes('Bu modül kapalı'));
    await req('/api/admin/submissions', { jar: b });
    assert.equal(await prisma.submission.count({ where: { congressId: 'local-eyi-2026' } }), preserved);
  } finally { await req('/api/platform/modules', { method: 'PATCH', body: { key: 'SUBMISSIONS', enabled: true }, jar: organizer }); }
  passed('Disabled submissions stop admin/file/public API and UI, preserve data and do not affect B');
  try {
    await req('/api/platform/modules', { method: 'PATCH', body: { key: 'REGISTRATION', enabled: false }, jar: organizer });
    await req('/api/registrations/request', { method: 'POST', body: { congressSlug: 'eyi-2026', email: accounts.participant.email }, status: 403 });
    await req('/api/admin/registrations', { jar: organizer, status: 403 });
    await req('/api/admin/registrations/local-registration-a/receipt', { jar: organizer, status: 403 });
    await req('/api/registrations/context', { jar: regJar, status: 403 });
    await req('/api/registrations', { method: 'POST', body: {}, jar: regJar, status: 403 });
    await req('/api/registrations/verify', { method: 'POST', body: { token: regToken }, jar: regJar, status: 403 });
    assert((await req('/eyi-2026/kayit')).data.includes('Bu modül kapalı'));
    assert((await req('/eyi-2026/kayit/panel', { jar: regJar })).data.includes('Bu modül kapalı'));
  } finally { await req('/api/platform/modules', { method: 'PATCH', body: { key: 'REGISTRATION', enabled: true }, jar: organizer }); }
  passed('Disabled registration stops request, existing session, verify, create, receipt and UI');
  try {
    for (const key of ['SUBMISSIONS', 'REGISTRATION']) await req('/api/platform/modules', { method: 'PATCH', body: { key, enabled: false }, jar: organizer });
    await req('/api/platform/context', { jar: organizer }); await req('/api/platform/members', { jar: organizer }); await req('/admin/panel', { jar: organizer });
    assert.deepEqual((await req('/api/platform/own', { jar: jars.participant })).data, { submissions: [], registrations: [] });
  } finally { for (const key of ['SUBMISSIONS', 'REGISTRATION']) await req('/api/platform/modules', { method: 'PATCH', body: { key, enabled: true }, jar: organizer }); }
  passed('Platform context/accounts remain usable with both business modules disabled');
  await req('/api/platform/modules', { method: 'PATCH', body: { key: 'SUBMISSIONS', enabled: false }, jar: organizer, origin: 'https://foreign.example.invalid', status: 403 });
  await req('/api/admin/logout', { method: 'POST', jar: organizer, origin: 'https://foreign.example.invalid', status: 403 });
  await req('/api/admin/submissions', { jar: organizer });
  passed('Cross-origin session mutations rejected');
  const members = (await req('/api/platform/members', { jar: organizer })).data.members;
  const revoked = members.find(m => m.user.id === 'local-user-reviewer');
  const foreign = (await req('/api/platform/members', { jar: b })).data.members[0];
  await req(`/api/platform/members/${foreign.id}`, { method: 'PATCH', body: { active: false }, jar: organizer, status: 404 });
  await req(`/api/platform/members/${revoked.id}`, { method: 'PATCH', body: { active: false }, jar: organizer });
  try { await req('/api/platform/own', { jar: jars.reviewer, status: 403 }); } finally { await req(`/api/platform/members/${revoked.id}`, { method: 'PATCH', body: { active: true }, jar: organizer }); }
  await req(`/api/platform/members/${revoked.id}`, { method: 'PATCH', body: { role: 'SECRETARY' }, jar: organizer });
  try { await req('/api/admin/submissions', { jar: jars.reviewer }); } finally { await req(`/api/platform/members/${revoked.id}`, { method: 'PATCH', body: { role: 'REVIEWER' }, jar: organizer }); }
  await req('/api/admin/submissions', { jar: jars.reviewer, status: 403 });
  passed('Foreign membership IDs denied; revocations and role changes apply to existing sessions immediately');
  const orgMembership = await prisma.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: 'local-org-a', userId: 'local-user-secretary' } } });
  await prisma.organizationMembership.update({ where: { id: orgMembership.id }, data: { active: false } });
  try { await req('/api/admin/submissions', { jar: secretary, status: 403 }); assert.equal((await req('/api/platform/context', { jar: secretary })).data.contexts.length, 0); }
  finally { await prisma.organizationMembership.update({ where: { id: orgMembership.id }, data: { active: true } }); }
  await prisma.platformUser.update({ where: { id: 'local-user-secretary' }, data: { active: false } });
  try { await req('/api/admin/submissions', { jar: secretary, status: 401 }); }
  finally { await prisma.platformUser.update({ where: { id: 'local-user-secretary' }, data: { active: true } }); }
  passed('Inactive institution membership and inactive personal account revoke access immediately');

  const email = `invite-${Date.now()}@example.invalid`;
  await req('/api/platform/members', { method: 'POST', body: { email, name: 'P03 Davet Testi', role: 'CONTENT_EDITOR' }, jar: organizer });
  const mail = await waitForCapturedMail(email); assert(mail);
  const oldToken = /token=([a-f0-9]{64})/.exec(mail.text)[1];
  const member = (await req('/api/platform/members', { jar: organizer })).data.members.find(m => m.user.email === email);
  await req(`/api/platform/members/${member.id}`, { method: 'POST', body: {}, jar: organizer });
  const resent = await waitForCapturedMail(email, { predicate: message => !message.text.includes(oldToken) });
  const token = /token=([a-f0-9]{64})/.exec(resent.text)[1]; const password = accounts.editor.password;
  assert.notEqual(oldToken, token);
  await req('/api/platform/activate', { method: 'POST', body: { token: oldToken, password }, status: 400 });
  await req('/api/platform/activate', { method: 'POST', body: { token, password } });
  await req('/api/platform/activate', { method: 'POST', body: { token, password }, status: 400 });
  const invited = {}; await req('/api/admin/login', { method: 'POST', body: { email, password }, jar: invited });
  await req('/api/admin/submissions', { jar: invited, status: 403 });
  await req('/api/platform/members', { method: 'POST', body: { email, name: 'P03 Davet Testi', role: 'ORGANIZER' }, jar: organizer, status: 409 });
  passed('Personal invitation/resend captured, prior token invalidated, one-use activation and duplicate invite cannot escalate role');
  const raw = jars.chair.cookie.split('=')[1];
  const session = await prisma.platformSession.findUniqueOrThrow({ where: { tokenHash: hashToken(raw) } }); assert.notEqual(session.tokenHash, raw);
  await req('/api/admin/logout', { method: 'POST', jar: jars.chair });
  await req('/api/platform/context', { jar: { cookie: `aibildiri_v2_local_platform_session=${raw}` }, status: 401 });
  const participantRaw = jars.participant.cookie.split('=')[1];
  await prisma.platformSession.update({ where: { tokenHash: hashToken(participantRaw) }, data: { expiresAt: new Date(0) } });
  await req('/api/platform/own', { jar: jars.participant, status: 401 });
  passed('Session tokens stored hashed; revoked and expired sessions rejected');
  const beforeCount = await prisma.congress.count();
  for (const path of ['/unknown-congress-test', '/unknown-congress-test/bildiri-gonder', '/unknown-congress-test/kayit', '/unknown-congress-test/kayit/panel']) await req(path, { status: 404 });
  await req('/api/registrations/request', { method: 'POST', body: { congressSlug: 'unknown-congress-test', email: accounts.participant.email }, status: 404 });
  assert.equal(await prisma.congress.count(), beforeCount);
  passed('Unknown public slug cannot create a congress');
  const history = (await req('/api/platform/audit', { jar: organizer })).data.entries;
  assert(history.every(e => e.congressId === 'local-eyi-2026'));
  assert(!JSON.stringify(history).includes(accounts.organizer.password));
  assert(!JSON.stringify(history).includes(raw));
  passed('Audit API scoped to congress with no passwords or session tokens');
  const beforeSettings = await prisma.congress.findUniqueOrThrow({ where: { id: 'local-eyi-2026' } });
  await req('/api/admin/congress', { method: 'PATCH', body: { tripNote: 'P03 audited setting' }, jar: organizer });
  await req('/api/admin/congress', { method: 'PATCH', body: { tripNote: beforeSettings.tripNote ?? '' }, jar: organizer });
  const tier = await prisma.paymentTier.findFirstOrThrow({ where: { congressId: 'local-eyi-2026' } });
  await req(`/api/admin/payment-tiers/${tier.id}`, { method: 'PATCH', body: { amount: tier.amount + 1 }, jar: organizer });
  await req(`/api/admin/payment-tiers/${tier.id}`, { method: 'PATCH', body: { amount: tier.amount }, jar: organizer });
  const doomedPaper = await prisma.submission.create({ data: { congressId: 'local-eyi-2026', draftOwnerEmail: 'disposable@example.invalid' } });
  await req(`/api/admin/submissions/${doomedPaper.id}`, { method: 'DELETE', body: { confirmation: 'Bu bildiriyi silmeyi onaylıyorum' }, jar: organizer });
  const doomedReg = await prisma.registration.create({ data: { congressId: 'local-eyi-2026', email: 'disposable@example.invalid', kind: 'LISTENER', paymentPeriod: 'EARLY', totalAmount: 0, paymentDescription: 'Disposable P03 test' } });
  await req(`/api/admin/registrations/${doomedReg.id}`, { method: 'DELETE', body: { confirmation: 'Bu kaydı silmeyi onaylıyorum' }, jar: organizer });
  assert(await prisma.auditLog.findFirst({ where: { action: 'congress.settings.update', congressId: 'local-eyi-2026' } }));
  assert(await prisma.auditLog.findFirst({ where: { action: 'pricing.tier.update', targetId: tier.id } }));
  assert(await prisma.auditLog.findFirst({ where: { action: 'submission.delete', targetId: doomedPaper.id } }));
  assert(await prisma.auditLog.findFirst({ where: { action: 'registration.delete', targetId: doomedReg.id } }));
  assert.equal(await prisma.submission.findUnique({ where: { id: doomedPaper.id } }), null);
  assert.equal(await prisma.registration.findUnique({ where: { id: doomedReg.id } }), null);
  passed('Settings, pricing and authorized disposable deletes produce durable audit records');

  writeFileSync('.local/platform-check-result.json', JSON.stringify({ executedAt: new Date().toISOString(), checks }, null, 2) + '\n', { mode: 0o600 });
  console.log(`P03 complete: ${checks.length} integration scenarios passed.`);
} finally {
  for (const jar of Object.values(jars)) { try { await req('/api/admin/logout', { method: 'POST', jar }); } catch {} }
  await prisma.$disconnect();
}
