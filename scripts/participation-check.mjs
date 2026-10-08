import {contextRequestBody} from './intervention-test-requests.mjs';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from './load-env.mjs';
import { assertLocal } from './environment.mjs';
import { waitForCapturedMail } from './captured-mail.mjs';
import { effectiveConfiguration, profileConfiguration } from '../src/modules/congress/configuration.ts';
import { processEmailQueue } from '../src/modules/communication/queue.mjs';
import { createEmailTransport } from '../src/modules/communication/transport.mjs';
import { declarationDocument } from '../src/modules/participation/declarations.ts';
import { emptyStructuredAbstract } from '../src/modules/participation/abstract.ts';

loadEnv();
assertLocal();
const db = new PrismaClient();
const base = process.env.APP_BASE_URL;
const suffix = randomUUID().slice(0, 8);
const checks = [];
const accounts = JSON.parse(readFileSync('.local/p03-accounts.json', 'utf8'));
const staff = Object.fromEntries(['platform', 'secretary', 'editor', 'organizerB', 'participant'].map(key => [key, new Map()]));
const ownerEmail = `p10-owner-${suffix}@example.invalid`;
const coauthorEmail = `p10-coauthor-${suffix}@example.invalid`;
const strangerEmail = `p10-stranger-${suffix}@example.invalid`;
const owner = new Map(), coauthor = new Map(), stranger = new Map();
const capture = createEmailTransport();
const sha = raw => createHash('sha256').update(raw).digest('hex');
let demo, foreign;
const ok = (condition, label) => { assert.ok(condition, label); checks.push(label); };

async function request(path, { method = 'GET', body, jar = new Map(), status = 200, origin } = {}) {
  const response = await fetch(base + path, { method, redirect: 'manual', headers: {
    cookie: [...jar].map(([key, value]) => `${key}=${value}`).join(';'),
    ...(body !== undefined && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
    ...(origin ? { origin } : {}),
  }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(contextRequestBody(path,body)) });
  const expectedStatus = (Array.isArray(status) ? status : [status]).includes(response.status);
  let diagnostic = '';
  if (!expectedStatus) {
    const failure = await response.clone().json().catch(() => null);
    if (typeof failure?.error === 'string') diagnostic = failure.error
      .replace(/https?:\/\/\S+/gi, '[url]')
      .replace(/\b[^\s@]+@[^\s@]+\b/g, '[email]')
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]')
      .replace(/[\r\n\t]/g, ' ').slice(0, 600);
  }
  assert.ok(expectedStatus, `${method} ${path}: expected ${status}, received ${response.status}${diagnostic ? `; error: ${diagnostic}` : ''}`);
  for (const cookie of response.headers.getSetCookie()) {
    const [key, ...parts] = cookie.split(';')[0].split('=');
    const value = parts.join('='); if (value) jar.set(key, value); else jar.delete(key);
  }
  return response;
}
const json = async (path, options) => (await request(path, options)).json();
const post = (path, body, jar = new Map(), status = 200) => json(path, { method: 'POST', body, jar, status });
const overview = (jar = owner, slug = demo.slug) => json('/api/participant/overview?congressSlug=' + slug, { jar });
const select = (jar, id = demo.id) => post('/api/platform/context', { congressId: id }, jar);
async function access(email, jar = new Map(), locale = 'tr') {
  const before = await db.participantAccessToken.findMany({ where: { congressId: demo.id, email }, select: { id: true } });
  const response = await post('/api/participant/access', { congressSlug: demo.slug, email, locale }, jar, 202);
  assert.deepEqual(response, { queued: true });
  const token = await db.participantAccessToken.findFirstOrThrow({ where: { congressId: demo.id, email, id: { notIn: before.map(row => row.id) } }, orderBy: { createdAt: 'desc' } });
  await processEmailQueue({ prisma: db, transport: capture, congressId: demo.id, batchSize: 100 });
  const mail = await waitForCapturedMail(email, { predicate: mail => mail.text.includes('/katilimci/devam?token=') && sha(new URL(mail.text.split('\n').find(line => line.startsWith(base) && line.includes('/katilimci/devam?token='))).searchParams.get('token')) === token.tokenHash });
  const raw = new URL(mail.text.split('\n').find(line => line.startsWith(base) && line.includes('/katilimci/devam?token='))).searchParams.get('token');
  return { raw, token, mail };
}
async function loginParticipant(email, jar, locale = 'tr') {
  const accessLink = await access(email, new Map(), locale);
  await post('/api/participant/verify', { congressSlug: demo.slug, token: accessLink.raw }, jar);
  return accessLink;
}
const workInput = (patch = {}) => ({ congressSlug: demo.slug, requestKey: randomUUID(), kind: 'QUESTION', subject: 'Synthetic participant question', description: 'This is a synthetic local participant request.', ...patch });
const consent = (configuration, entityType, locale = 'tr') => { const doc = declarationDocument(effectiveConfiguration(configuration), entityType, locale); return { declarations: Object.fromEntries(doc.items.map(item => [item.key, true])), declarationVersion: doc.version, declarationLocale: locale }; };
const addConsent = (form, input) => { for (const [key, value] of Object.entries(input)) form.set(key, typeof value === 'string' ? value : JSON.stringify(value)); return form; };

try {
  for (const key of Object.keys(staff)) await post('/api/admin/login', accounts[key], staff[key]);
  const config = profileConfiguration('ABSTRACT_ONLY'); config.modules.REGISTRATION = true;
  demo = await db.congress.create({ data: { organizationId: 'local-org-a', slug: `p10-participation-${suffix}`, name: `P10 Katılımcı ${suffix}`, configuration: config, configVersion: 1,
    memberships: { create: [{ userId: 'local-user-secretary', role: 'SECRETARY' }, { userId: 'local-user-editor', role: 'CONTENT_EDITOR' }, { userId: 'local-user-participant', role: 'PARTICIPANT' }] },
    modules: { create: [{ key: 'SUBMISSIONS', enabled: true }, { key: 'REGISTRATION', enabled: true }, { key: 'CMS', enabled: false }] },
  } });
  foreign = await db.congress.create({ data: { organizationId: 'local-org-b', slug: `p10-foreign-${suffix}`, name: `P10 Foreign ${suffix}`, configuration: config, modules: { create: [{ key: 'SUBMISSIONS', enabled: true }, { key: 'REGISTRATION', enabled: true }] } } });
  for (const key of ['platform', 'secretary', 'editor', 'participant']) await select(staff[key]);
  await select(staff.organizerB, 'local-congress-b');
  const paper = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: ownerEmail, status: 'SUBMITTED', submittedAt: new Date(), submissionLanguage: 'TR', titleTr: 'P10 synthetic owned paper', abstractTr: 'Synthetic abstract.', authors: { create: [{ fullName: 'Synthetic owner', email: ownerEmail, isPresenter: true, sortOrder: 0 }, { fullName: 'Synthetic coauthor', email: coauthorEmail, sortOrder: 1 }] } } });
  const draft = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: ownerEmail, titleTr: 'P10 private draft', authors: { create: [{ fullName: 'Synthetic draft coauthor', email: coauthorEmail, sortOrder: 0 }] } } });
  const privatePaper = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: strangerEmail, status: 'ACCEPTED', submittedAt: new Date(), titleTr: 'PRIVATE OTHER PARTICIPANT' } });
  const foreignPaper = await db.submission.create({ data: { congressId: foreign.id, draftOwnerEmail: ownerEmail, status: 'SUBMITTED', titleTr: 'PRIVATE FOREIGN CONGRESS' } });
  const receiptBytes = readFileSync('scripts/fixtures/synthetic-receipt.pdf');
  const registration = await db.registration.create({ data: { congressId: demo.id, email: ownerEmail, kind: 'LISTENER', paymentPeriod: 'EARLY', totalAmount: 100, currency: 'TRY', paymentDescription: 'Synthetic legacy receipt record', paidAt: new Date(), receipt: { create: { originalName: 'synthetic.pdf', mimeType: 'application/pdf', fileSize: receiptBytes.length, storageKey: `database:p10:${suffix}`, content: receiptBytes } } } });
  const freeRegistration = await db.registration.create({ data: { congressId: demo.id, email: ownerEmail, kind: 'LISTENER', paymentPeriod: 'EARLY', totalAmount: 0, currency: 'TRY', paymentDescription: 'Synthetic free record' } });
  const foreignRegistration = await db.registration.create({ data: { congressId: foreign.id, email: ownerEmail, kind: 'LISTENER', paymentPeriod: 'EARLY', totalAmount: 0, paymentDescription: 'PRIVATE FOREIGN REGISTRATION' } });

  await request('/api/participant/overview?congressSlug=' + demo.slug, { status: 401 });
  await post('/api/participant/access', { congressSlug: demo.slug, email: ownerEmail, locale: 'de' }, new Map(), 400);
  await post('/api/participant/access', { congressSlug: demo.slug, email: ownerEmail, locale: 'tr', role: 'ORGANIZER' }, new Map(), 400);
  await request('/api/participant/access', { method: 'POST', body: { congressSlug: demo.slug, email: ownerEmail, locale: 'tr' }, origin: 'https://foreign.example.invalid', status: 403 });
  const usersBefore = await db.platformUser.count();
  const initialJar = new Map();
  const initial = await access(ownerEmail, initialJar);
  ok(initialJar.size === 0 && await db.platformUser.count() === usersBefore, 'Requesting participant email reveals no records, grants no cookie and creates no platform account');
  await post('/api/participant/verify', { congressSlug: foreign.slug, token: initial.raw }, new Map(), 400);
  await post('/api/participant/verify', { congressSlug: demo.slug, token: initial.raw }, owner);
  await post('/api/participant/verify', { congressSlug: demo.slug, token: initial.raw }, new Map(), 400);
  const sessionCookie = [...owner].find(([key]) => key.includes('participant'));
  assert.ok(sessionCookie);
  const sessionRow = await db.participantSession.findUniqueOrThrow({ where: { tokenHash: sha(sessionCookie[1]) } });
  ok(initial.token.tokenHash !== initial.raw && sessionRow.tokenHash !== sessionCookie[1] && sessionRow.expiresAt > new Date() && !owner.has('aibildiri_v2_local_draft_access') && !owner.has('aibildiri_v2_local_registration_access'), 'Participant verification uses one-use scoped token and a separate opaque, expiring, hashed session');
  await request('/api/participant/overview?congressSlug=' + foreign.slug, { jar: owner, status: [401, 403] });
  await request('/api/admin/submissions', { jar: owner, status: 401 });
  await request(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: owner, body: {}, status: 403 });
  ok(true, 'Verified participant identity grants neither administrative access nor draft editing and cannot cross congresses');
  const signed = payload => createHmac('sha256', process.env.DRAFT_SESSION_SECRET).update(payload).digest('hex');
  for (const expiry of [null, String(Date.now() - 1000), String(Date.now() + 9 * 3600000)]) {
    const draftPayload = expiry ? `${draft.id}.${expiry}` : draft.id;
    const registrationPayload = expiry ? `${ownerEmail}|${demo.id}|${expiry}` : `${ownerEmail}|${demo.id}`;
    await request(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: new Map([['aibildiri_v2_local_draft_access', `${draftPayload}.${signed(draftPayload)}`]]), body: {}, status: 403 });
    await request('/api/registrations/context', { jar: new Map([['aibildiri_v2_local_registration_access', `${registrationPayload}|${signed(registrationPayload)}`]]), status: 401 });
  }
  ok(true, 'Legacy draft/registration cookies without expiry, expired signatures and excessive lifetimes fail server-side');

  const view = await overview();
  ok(view.email === ownerEmail && view.submissions.some(item => item.id === paper.id) && view.submissions.some(item => item.id === draft.id) && !view.submissions.some(item => [privatePaper.id, foreignPaper.id].includes(item.id)) && !view.registrations.some(item => item.id === foreignRegistration.id), 'Participant panel lists only the verified email identity in the selected congress');
  const receiptStatus = view.registrations.find(item => item.id === registration.id);
  const freeStatus = view.registrations.find(item => item.id === freeRegistration.id);
  ok(receiptStatus.receiptReceived === true && !['PAID', 'VERIFIED', 'CONFIRMED'].includes(receiptStatus.paymentState) && freeStatus.totalAmount === 0, 'Legacy paidAt plus uploaded receipt never invents payment verification; free registration remains zero');
  ok(['reviews', 'program', 'tasks', 'certificates'].every(key => view.unavailable.includes(key)), 'Unimplemented review/program/task/certificate modules are explicitly unavailable');
  ok(await db.declarationAcceptance.count({ where: { congressId: demo.id } }) === 0, 'Reading legacy participant records fabricates no historical declaration acceptance');
  assert.ok(!JSON.stringify(view).includes('storageKey') && !JSON.stringify(view).includes('tokenHash') && !JSON.stringify(view).includes('PRIVATE OTHER'));

  await loginParticipant(coauthorEmail, coauthor, 'en');
  const coauthorView = await overview(coauthor);
  ok(coauthorView.submissions.some(item => item.id === paper.id && item.canWithdraw === false) && !coauthorView.submissions.some(item => item.id === draft.id) && coauthorView.registrations.length === 0, 'Coauthor may see a submitted related paper but gains neither private draft access, withdrawal authority nor another person’s registration');
  await loginParticipant(strangerEmail, stranger);
  await post('/api/participant/requests', workInput({ kind: 'WITHDRAWAL_REQUEST', sourceType: 'SUBMISSION', sourceId: paper.id }), coauthor, 403);
  await post('/api/participant/requests', workInput({ sourceType: 'SUBMISSION', sourceId: draft.id }), coauthor, 404);
  await post('/api/participant/requests', workInput({ kind: 'WITHDRAWAL_REQUEST', sourceType: 'SUBMISSION', sourceId: draft.id }), owner, 403);
  await post('/api/participant/requests', workInput({ sourceType: 'SUBMISSION', sourceId: privatePaper.id }), owner, 404);
  await post('/api/participant/requests', workInput({ sourceType: 'SUBMISSION', sourceId: foreignPaper.id }), owner, 404);
  await post('/api/participant/requests', workInput({ kind: 'MANUAL_EMAIL' }), owner, 400);
  await post('/api/participant/requests', workInput({ requesterEmail: strangerEmail, status: 'RESOLVED' }), owner, 400);
  ok(true, 'Participant requests enforce ownership, eligible source state and server-controlled requester/status fields');

  const withdrawalInput = workInput({ kind: 'WITHDRAWAL_REQUEST', sourceType: 'SUBMISSION', sourceId: paper.id });
  const withdrawals = await Promise.all([post('/api/participant/requests', withdrawalInput, owner), post('/api/participant/requests', withdrawalInput, owner)]);
  assert.equal(withdrawals[0].id, withdrawals[1].id);
  const withdrawal = withdrawals[0];
  await post('/api/participant/requests', { ...withdrawalInput, description: 'Conflicting retry content' }, owner, 409);
  ok(await db.workRequest.count({ where: { congressId: demo.id, requestKey: withdrawalInput.requestKey } }) === 1 && await db.workRequestEvent.count({ where: { requestId: withdrawal.id } }) === 1, 'Concurrent participant requests are idempotent; changed payload conflicts without duplicate request or audit event');
  const cancellation = await post('/api/participant/requests', workInput({ kind: 'CANCELLATION_REQUEST', sourceType: 'REGISTRATION', sourceId: registration.id }), owner);
  ok((await db.submission.findUniqueOrThrow({ where: { id: paper.id } })).status === 'SUBMITTED' && (await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).paidAt !== null && await db.registrationReceipt.count({ where: { registrationId: registration.id } }) === 1, 'Withdrawal and cancellation create requests without changing submission, payment or receipt records');
  ok((await overview()).requests.some(item => item.id === withdrawal.id) && !(await overview(stranger)).requests.some(item => item.id === withdrawal.id), 'Participant request lists use verified requester identity, not possession of a record ID');

  const workApi = '/api/platform/worklist';
  const workView = jar => json(workApi, { jar: jar ?? staff.secretary });
  await request(workApi, { status: 401 });
  for (const key of ['editor', 'participant']) await request(workApi, { jar: staff[key], status: 403 });
  await request(workApi + '/' + withdrawal.id, { jar: staff.organizerB, status: 404 });
  const initialWorklist = await workView();
  ok(initialWorklist.requests.some(item => item.id === withdrawal.id) && initialWorklist.sources.missing.some(item => item.sourceId === draft.id) && !initialWorklist.sources.missing.some(item => item.sourceId === foreignPaper.id), 'Secretariat lists scoped participant requests and missing draft work; unauthorized roles and foreign congresses cannot read them');
  assert.ok(initialWorklist.assignees.some(person => person.id === 'local-user-secretary'));
  assert.ok(!initialWorklist.assignees.some(person => person.id === 'local-user-editor'));
  const foreignActor = await db.platformUser.findUniqueOrThrow({ where: { email: accounts.organizerB.email } });
  const inactiveAssignee = await db.platformUser.create({ data: { email: `inactive-staff-${suffix}@example.invalid`, name: 'Inactive synthetic secretary', active: false, organizations: { create: { organizationId: demo.organizationId } }, congresses: { create: { congressId: demo.id, role: 'SECRETARY' } } } });
  const detail = await json(workApi + '/' + withdrawal.id, { jar: staff.secretary });
  for (const assigneeId of ['local-user-editor', foreignActor.id, inactiveAssignee.id]) await json(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: detail.request.version, status: 'IN_PROGRESS', assigneeId }, status: 400 });
  await json(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: detail.request.version, status: 'RESOLVED' }, status: 400 });
  const internalNote = `PRIVATE_INTERNAL_NOTE_${suffix}`;
  const updated = await json(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: detail.request.version, status: 'IN_PROGRESS', assigneeId: 'local-user-secretary', internalNote } });
  await json(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: detail.request.version, status: 'WAITING' }, status: 409 });
  ok(updated.request.assigneeId === 'local-user-secretary' && !JSON.stringify(await overview()).includes(internalNote), 'Only current authorized staff may be assigned; version conflicts prevent overwrites and internal notes remain private');
  const racingUpdates = await Promise.all(['WAITING', 'RESOLVED'].map(status => request(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: updated.request.version, status, publicResult: 'Synthetic request reviewed by secretariat' }, status: [200, 409] })));
  ok(racingUpdates.filter(response => response.status === 200).length === 1 && racingUpdates.filter(response => response.status === 409).length === 1, 'Concurrent secretariat edits preserve exactly one next version');
  let latest = await json(workApi + '/' + withdrawal.id, { jar: staff.secretary });
  if (latest.request.status !== 'RESOLVED') await json(workApi + '/' + withdrawal.id, { method: 'PATCH', jar: staff.secretary, body: { version: latest.request.version, status: 'RESOLVED', publicResult: 'Synthetic request reviewed by secretariat' } });
  latest = await json(workApi + '/' + withdrawal.id, { jar: staff.secretary });
  ok(latest.events.length === latest.request.version && (await overview()).requests.find(item => item.id === withdrawal.id).publicResult === 'Synthetic request reviewed by secretariat' && (await db.submission.findUniqueOrThrow({ where: { id: paper.id } })).status === 'SUBMITTED', 'Resolving a request records its public result and immutable event sequence without performing an implicit withdrawal');

  const manualInput = { requestKey: randomUUID(), kind: 'MANUAL_EMAIL', requesterEmail: ownerEmail, requesterName: 'Claimed sender', subject: 'Synthetic manually received email', description: 'Staff transcribed a synthetic email into the worklist.', sourceType: 'SUBMISSION', sourceId: paper.id, assigneeId: 'local-user-secretary' };
  const manual = await post(workApi, manualInput, staff.secretary);
  await post(workApi, { ...manualInput, requestKey: randomUUID(), sourceId: foreignPaper.id }, staff.secretary, 404);
  ok(manual.request.origin === 'STAFF_EMAIL' && !(await overview()).requests.some(item => item.id === manual.request.id), 'Manually recorded email can link to an authorized source but a claimed sender address does not grant participant request visibility');
  const feedback = await db.feedbackRequest.create({ data: { congressId: demo.id, requestKey: randomUUID(), payloadHash: sha('synthetic feedback'), senderName: 'Synthetic claimed sender', email: ownerEmail, subject: 'P10 linked feedback', message: 'Local synthetic feedback copied to the work list.', noticeVersion: 'local-fixture', locale: 'tr' } });
  await post(workApi, { ...manualInput, requestKey: randomUUID(), sourceType: 'FEEDBACK', sourceId: feedback.id }, staff.secretary, 403);
  await db.congressModule.update({ where: { congressId_key: { congressId: demo.id, key: 'CMS' } }, data: { enabled: true } });
  const linkedFeedback = await post(workApi, { ...manualInput, requestKey: randomUUID(), sourceType: 'FEEDBACK', sourceId: feedback.id }, staff.secretary);
  const sourceMessage = await db.emailMessage.findFirstOrThrow({ where: { congressId: demo.id, recipient: ownerEmail, templateKey: 'PARTICIPANT_ACCESS' } });
  const emailIssue = await db.emailDeliveryIssue.create({ data: { congressId: demo.id, messageId: sourceMessage.id } });
  const linkedIssue = await post(workApi, { ...manualInput, requestKey: randomUUID(), sourceType: 'EMAIL_ISSUE', sourceId: emailIssue.id }, staff.secretary);
  const linkedSources = await workView();
  ok(linkedFeedback.request.sourceId === feedback.id && linkedIssue.request.sourceId === emailIssue.id && linkedSources.sources.feedback.some(item => item.id === feedback.id) && linkedSources.sources.deliveryIssues.some(item => item.id === emailIssue.id) && !JSON.stringify(linkedSources).includes(initial.raw), 'Secretariat links CMS feedback and email-delivery issues without exposing access-token message bodies');
  await db.congressModule.update({ where: { congressId_key: { congressId: demo.id, key: 'CMS' } }, data: { enabled: false } });
  const sourceCounts = await db.workRequest.count({ where: { congressId: demo.id } });
  await db.congressModule.updateMany({ where: { congressId: demo.id, key: { in: ['SUBMISSIONS', 'REGISTRATION'] } }, data: { enabled: false } });
  const closed = await overview();
  ok(closed.submissions.length === 0 && closed.registrations.length === 0 && !(await workView()).sources.missing.length, 'Closed business modules hide participant records and generated missing-work lists while preserving stored data');
  await post('/api/participant/requests', workInput({ kind: 'WITHDRAWAL_REQUEST', sourceType: 'SUBMISSION', sourceId: paper.id }), owner, 403);
  await post('/api/participant/requests', workInput({ kind: 'CANCELLATION_REQUEST', sourceType: 'REGISTRATION', sourceId: registration.id }), owner, 403);
  await post('/api/participant/requests', workInput(), owner, 403);
  await post('/api/participant/access', { congressSlug: demo.slug, email: `closed-${suffix}@example.invalid`, locale: 'tr' }, new Map(), 403);
  const cancelDetail = await json(workApi + '/' + cancellation.id, { jar: staff.secretary });
  await json(workApi + '/' + cancellation.id, { method: 'PATCH', jar: staff.secretary, body: { version: cancelDetail.request.version, status: 'WAITING', publicResult: 'Waiting for the module to reopen' } });
  ok(await db.workRequest.count({ where: { congressId: demo.id } }) === sourceCounts, 'Closed modules reject new source actions; existing secretariat requests remain trackable without changing source records');
  await db.congressModule.updateMany({ where: { congressId: demo.id, key: { in: ['SUBMISSIONS', 'REGISTRATION'] } }, data: { enabled: true } });

  const openInput = (sourceType, sourceId) => ({ congressSlug: demo.slug, sourceType, ...(sourceId ? { sourceId } : {}) });
  await post('/api/participant/open', openInput('SUBMISSION', draft.id), coauthor, 404);
  await post('/api/participant/open', openInput('SUBMISSION', foreignPaper.id), owner, 404);
  const opened = await post('/api/participant/open', openInput('SUBMISSION', draft.id), owner);
  ok(opened.url.includes(draft.id) && owner.has('aibildiri_v2_local_draft_access'), 'A separate explicit action opens only an existing draft owned by the verified participant');

  config.structuredAbstract.enabled = true;
  for (const locale of ['TR', 'EN']) for (const key of ['purpose', 'method', 'findings', 'conclusion']) config.structuredAbstract.sections[locale][key].maxWords = 2;
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  const sections = emptyStructuredAbstract();
  for (const key of ['purpose', 'method', 'findings', 'conclusion']) sections.TR[key] = 'Bir iki';
  const detailsInput = { submissionLanguage: 'TR', titleTr: 'P10 yapılandırılmış bildiri', titleEn: '', abstractTr: '', abstractEn: '', keywordsTr: '', keywordsEn: '', structuredAbstract: sections };
  const missingSections = structuredClone(detailsInput); missingSections.structuredAbstract.TR.purpose = '';
  await request(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: owner, body: missingSections, status: 400 });
  const excessiveSections = structuredClone(detailsInput); excessiveSections.structuredAbstract.TR.method = 'Bir iki üç';
  await request(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: owner, body: excessiveSections, status: 400 });
  const savedDetails = await json(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: owner, body: detailsInput });
  await request(`/api/submissions/${draft.id}/authors`, { method: 'PATCH', jar: owner, body: { authors: [{ fullName: 'P10 synthetic owner', email: ownerEmail, title: '', institution: '', country: '', isPresenter: true }] } });
  ok(savedDetails.submission.structuredAbstract.TR.method === 'Bir iki' && savedDetails.submission.abstractTr.includes('Amaç'), 'Structured TR sections enforce required fields and word limits on the server and retain readable legacy abstract text');
  const currentConsent = consent(config, 'SUBMISSION');
  await post(`/api/submissions/${draft.id}/submit`, { ...currentConsent, declarations: { ...currentConsent.declarations, accuracy: 'true' } }, owner, 400);
  await post(`/api/submissions/${draft.id}/submit`, { declarations: currentConsent.declarations }, owner, 400);
  config.declarationTexts.TR.accuracy += ' P10 güncellenmiş beyan metni.';
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  await post(`/api/submissions/${draft.id}/submit`, currentConsent, owner, 409);
  ok((await db.submission.findUniqueOrThrow({ where: { id: draft.id } })).status === 'DRAFT' && await db.declarationAcceptance.count({ where: { entityType: 'SUBMISSION', entityId: draft.id } }) === 0, 'Invalid or stale declaration requests cannot submit a draft or fabricate acceptance');
  const beforeRuleChange = consent(config, 'SUBMISSION');
  config.structuredAbstract.sections.TR.method.maxWords = 1;
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  await post(`/api/submissions/${draft.id}/submit`, beforeRuleChange, owner, 409);
  await post(`/api/submissions/${draft.id}/submit`, consent(config, 'SUBMISSION'), owner, 400);
  detailsInput.structuredAbstract.TR.method = 'Bir';
  await request(`/api/submissions/${draft.id}/details`, { method: 'PATCH', jar: owner, body: detailsInput });
  const confirmedConsent = consent(config, 'SUBMISSION');
  await post(`/api/submissions/${draft.id}/submit`, confirmedConsent, owner);
  const acceptance = await db.declarationAcceptance.findUniqueOrThrow({ where: { entityType_entityId: { entityType: 'SUBMISSION', entityId: draft.id } } });
  const originalEvidence = JSON.stringify(acceptance);
  ok(acceptance.email === ownerEmail && acceptance.locale === 'tr' && acceptance.version === confirmedConsent.declarationVersion && JSON.stringify(acceptance.texts).includes('P10 güncellenmiş') && acceptance.rules.configuration.structuredAbstract.sections.TR.method.maxWords === 1, 'Submission commits exact declaration text, locale and effective rules together with accepted business state');
  ok(await db.emailMessage.count({ where: { congressId: demo.id, sourceType: 'submission', sourceId: draft.id, templateKey: 'SUBMISSION_RECEIVED' } }) === 1, 'Accepted submission enqueues one durable notification in the same transaction');
  config.declarationTexts.TR.accuracy += ' Sonraki değişiklik.';
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  ok(JSON.stringify(await db.declarationAcceptance.findUniqueOrThrow({ where: { id: acceptance.id } })) === originalEvidence && (await overview()).submissions.find(item => item.id === draft.id).declaration.recorded === true && (await overview()).submissions.find(item => item.id === paper.id).declaration.recorded === false, 'Later policy edits preserve historical evidence and the panel distinguishes recorded acceptance from legacy unknowns');
  await post('/api/participant/open', openInput('SUBMISSION', draft.id), owner);
  await post(`/api/submissions/${draft.id}/submit`, consent(config, 'SUBMISSION'), owner, 409);
  ok(await db.declarationAcceptance.count({ where: { entityType: 'SUBMISSION', entityId: draft.id } }) === 1, 'Repeated final submission cannot create a second declaration record');

  const englishDraft = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: coauthorEmail, submissionLanguage: 'EN' } });
  await post('/api/participant/open', openInput('SUBMISSION', englishDraft.id), coauthor);
  const englishSections = emptyStructuredAbstract();
  for (const key of ['purpose', 'method', 'findings', 'conclusion']) englishSections.EN[key] = 'One two';
  await request(`/api/submissions/${englishDraft.id}/details`, { method: 'PATCH', jar: coauthor, body: { ...detailsInput, submissionLanguage: 'EN', titleTr: '', titleEn: 'P10 English structured paper', structuredAbstract: englishSections } });
  await request(`/api/submissions/${englishDraft.id}/authors`, { method: 'PATCH', jar: coauthor, body: { authors: [{ fullName: 'P10 synthetic coauthor', email: coauthorEmail, title: '', institution: '', country: '', isPresenter: true }] } });
  await post(`/api/submissions/${englishDraft.id}/submit`, consent(config, 'SUBMISSION', 'en'), coauthor);
  const englishAcceptance = await db.declarationAcceptance.findUniqueOrThrow({ where: { entityType_entityId: { entityType: 'SUBMISSION', entityId: englishDraft.id } } });
  ok(englishAcceptance.locale === 'en' && englishAcceptance.texts.some(item => item.text.startsWith('I declare')), 'English structured submission records English declaration evidence');

  await db.paymentTier.createMany({ data: ['EARLY', 'LATE'].map(period => ({ congressId: demo.id, presentationMode: 'IN_PERSON', role: 'LISTENER', audience: 'ACADEMIC', period, amount: 100, currency: 'TRY', active: true })) });
  await post('/api/participant/open', openInput('REGISTRATION'), owner);
  const registrationForm = new FormData();
  for (const [key, value] of Object.entries({ presenterName: 'P10 synthetic listener', paperSubmissionIds: '[]', listenerEnabled: 'true', listenerPresentationMode: 'IN_PERSON', listenerAudience: 'ACADEMIC', listenerDayOne: 'true', listenerDayTwo: 'false' })) registrationForm.set(key, value);
  await request('/api/registrations', { method: 'POST', jar: owner, body: registrationForm, status: 400 });
  const registrationConsent = consent(config, 'REGISTRATION');
  addConsent(registrationForm, { ...registrationConsent, declarations: { ...registrationConsent.declarations, accuracy: 'false' } });
  await request('/api/registrations', { method: 'POST', jar: owner, body: registrationForm, status: 400 });
  addConsent(registrationForm, registrationConsent);
  config.declarationTexts.TR.personalDataConsent += ' Yeni kayıt koşulu.';
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  await request('/api/registrations', { method: 'POST', jar: owner, body: registrationForm, status: 409 });
  addConsent(registrationForm, consent(config, 'REGISTRATION'));
  const registered = await json('/api/registrations', { method: 'POST', jar: owner, body: registrationForm });
  const registrationEvidence = await db.declarationAcceptance.findUniqueOrThrow({ where: { entityType_entityId: { entityType: 'REGISTRATION', entityId: registered.registrationId } } });
  ok(registrationEvidence.email === ownerEmail && registrationEvidence.texts.length === 3 && !registrationEvidence.texts.some(item => item.key === 'coauthorApproval') && registrationEvidence.rules.quote.totalAmount === 0, 'Registration requires current literal consent and stores the applicable listener statements and actual free quote');

  const raceEmail = `submission-limit-${suffix}@example.invalid`, raceSession = new Map();
  await loginParticipant(raceEmail, raceSession);
  await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: raceEmail, status: 'SUBMITTED', submittedAt: new Date(), titleTr: 'Prior synthetic submitted paper', authors: { create: { fullName: 'Synthetic limit author', email: raceEmail, isPresenter: true, sortOrder: 0 } } } });
  const racePapers = [];
  for (let index = 0; index < 2; index += 1) {
    const sections = emptyStructuredAbstract(); for (const key of ['purpose', 'method', 'findings', 'conclusion']) sections.TR[key] = 'Bir';
    const record = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: raceEmail, submissionLanguage: 'TR', titleTr: `Concurrent synthetic paper ${index}`, structuredAbstract: sections, authors: { create: { fullName: 'Synthetic limit author', email: raceEmail, isPresenter: true, sortOrder: 0 } } } });
    const jar = new Map(raceSession);
    await post('/api/participant/open', openInput('SUBMISSION', record.id), jar);
    racePapers.push({ record, jar });
  }
  const racedSubmissions = await Promise.all(racePapers.map(({ record, jar }) => request(`/api/submissions/${record.id}/submit`, { method: 'POST', jar, body: consent(config, 'SUBMISSION'), status: [200, 400] })));
  ok(racedSubmissions.filter(result => result.status === 200).length === 1 && racedSubmissions.filter(result => result.status === 400).length === 1 && await db.submission.count({ where: { congressId: demo.id, submittedAt: { not: null }, authors: { some: { email: raceEmail } } } }) === 2, 'Concurrent final submissions cannot exceed the per-author two-paper limit');
  ok(await db.declarationAcceptance.count({ where: { entityType: 'SUBMISSION', entityId: { in: racePapers.map(item => item.record.id) } } }) === 1 && await db.emailMessage.count({ where: { congressId: demo.id, templateKey: 'SUBMISSION_RECEIVED', sourceId: { in: racePapers.map(item => item.record.id) } } }) === 1, 'Only the winning concurrent submission commits its declaration and durable notification');

  config.stages.FULL_TEXT.enabled = true; config.fields.file = 'OPTIONAL';
  config.stages.ABSTRACT.deadline = '2020-01-01T00:00:00Z'; config.structuredAbstract.stage = 'FULL_TEXT';
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  const stagedStructure = emptyStructuredAbstract(); for (const key of ['purpose', 'method', 'findings', 'conclusion']) stagedStructure.TR[key] = 'Bir';
  const stagedPaper = await db.submission.create({ data: { congressId: demo.id, draftOwnerEmail: strangerEmail, submissionLanguage: 'TR', titleTr: 'Frozen title', structuredAbstract: stagedStructure } });
  await post('/api/participant/open', openInput('SUBMISSION', stagedPaper.id), stranger);
  const stagedDetails = { submissionLanguage: 'TR', titleTr: 'Frozen title', titleEn: '', abstractTr: '', abstractEn: '', keywordsTr: '', keywordsEn: '', structuredAbstract: stagedStructure };
  stagedDetails.structuredAbstract.TR.method = 'Yeni';
  await request(`/api/submissions/${stagedPaper.id}/details`, { method: 'PATCH', jar: stranger, body: { ...stagedDetails, titleTr: 'Unauthorized title edit' }, status: 403 });
  await request(`/api/submissions/${stagedPaper.id}/details`, { method: 'PATCH', jar: stranger, body: stagedDetails });
  ok((await db.submission.findUniqueOrThrow({ where: { id: stagedPaper.id } })).titleTr === 'Frozen title', 'FULL_TEXT structured stage can update its own sections after abstract metadata closes while title and language stay frozen');
  config.stages.FULL_TEXT.deadline = '2020-01-01T00:00:00Z';
  await db.congress.update({ where: { id: demo.id }, data: { configuration: config, configVersion: { increment: 1 } } });
  await request(`/api/submissions/${stagedPaper.id}/details`, { method: 'PATCH', jar: stranger, body: stagedDetails, status: 403 });
  await post('/api/platform/delivery-exceptions', { email: strangerEmail, submissionId: stagedPaper.id, stage: 'FULL_TEXT', reason: 'Synthetic structured stage extension', expiresAt: '2099-01-01T00:00:00Z' }, staff.platform, 201);
  await request(`/api/submissions/${stagedPaper.id}/details`, { method: 'PATCH', jar: stranger, body: stagedDetails });
  await request(`/api/submissions/${stagedPaper.id}/details`, { method: 'PATCH', jar: stranger, body: { ...stagedDetails, titleTr: 'Still forbidden title' }, status: 403 });
  ok(true, 'Structured-stage deadline and individual extension remain independent of frozen metadata permissions');

  const rotationEmail = `rotation-${suffix}@example.invalid`;
  const oldLink = await access(rotationEmail), newLink = await access(rotationEmail);
  await post('/api/participant/verify', { congressSlug: demo.slug, token: oldLink.raw }, new Map(), 400);
  const rotationJar = new Map(); await post('/api/participant/verify', { congressSlug: demo.slug, token: newLink.raw }, rotationJar);
  await access(rotationEmail);
  await post('/api/participant/access', { congressSlug: demo.slug, email: rotationEmail, locale: 'tr' }, new Map(), 429);
  ok(true, 'Replacement access links invalidate older unused links and access requests have a persistent per-email rate limit');

  const expiring = await access(`expiry-${suffix}@example.invalid`);
  await db.participantAccessToken.update({ where: { id: expiring.token.id }, data: { expiresAt: new Date(0) } });
  await post('/api/participant/verify', { congressSlug: demo.slug, token: expiring.raw }, new Map(), 400);
  const originalExpiry = sessionRow.expiresAt;
  await db.participantSession.update({ where: { id: sessionRow.id }, data: { expiresAt: new Date(0) } });
  await request('/api/participant/overview?congressSlug=' + demo.slug, { jar: owner, status: 401 });
  await db.participantSession.update({ where: { id: sessionRow.id }, data: { expiresAt: originalExpiry, revokedAt: new Date() } });
  await request('/api/participant/overview?congressSlug=' + demo.slug, { jar: owner, status: 401 });
  ok(true, 'Expired links, expired sessions and revoked sessions fail server-side even when the cookie is replayed');
  const logoutCookie = new Map(coauthor);
  await post('/api/participant/logout', {}, coauthor);
  await request('/api/participant/overview?congressSlug=' + demo.slug, { jar: logoutCookie, status: 401 });
  ok(true, 'Participant logout revokes the server session rather than relying on browser cookie deletion');

  writeFileSync('.local/participation-check-result.json', JSON.stringify({
    executedAt: new Date().toISOString(), realEmailsSent: 0, checks,
    fixtures: {
      congressId: demo.id, congressSlug: demo.slug,
      foreignCongressId: foreign.id, foreignCongressSlug: foreign.slug,
      emails: { owner: ownerEmail, coauthor: coauthorEmail, stranger: strangerEmail },
      submissions: { owned: paper.id, draft: draft.id, unrelated: privatePaper.id, foreign: foreignPaper.id },
      registrations: { receipt: registration.id, free: freeRegistration.id, foreign: foreignRegistration.id },
      captureDirectory: resolve(process.env.V2_LOCAL_ROOT ?? process.cwd(), '.local/mail'),
    },
  }, null, 2) + '\n', { mode: 0o600 });
  console.log(`P10 participation checks passed: ${checks.length} scenarios; synthetic identities and local capture only.`);
} finally {
  try {
    const ids = [demo?.id, foreign?.id].filter(Boolean);
    if (ids.length) await db.emailMessage.updateMany({ where: { congressId: { in: ids }, status: { in: ['PENDING', 'RETRY', 'PROCESSING'] } }, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null, version: { increment: 1 } } });
  } finally { await db.$disconnect(); }
}
