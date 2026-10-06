import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { profileConfiguration, configurationSchema, effectiveConfiguration } from '../src/modules/congress/configuration.ts';
import { emptyStructuredAbstract, validateStructuredAbstract, wordCount, structuredAbstractText } from '../src/modules/participation/abstract.ts';
import { defaultStructuredAbstractRules } from '../src/modules/participation/rules.ts';
import { declarationDocument, validateDeclarationAcceptance, declarationMetadata } from '../src/modules/participation/declarations.ts';
import { participantRequestSchema, staffRequestSchema, requestUpdateSchema } from '../src/modules/worklist/configuration.ts';
import { createRequest, updateRequest, publicRequest } from '../src/modules/worklist/core.ts';
import { paymentState, submissionTasks } from '../src/modules/participation/status.ts';

function configured() { const config = profileConfiguration('ABSTRACT_ONLY'); config.structuredAbstract = defaultStructuredAbstractRules(); config.structuredAbstract.enabled = true; return config; }
function complete(language = 'TR') { const value = emptyStructuredAbstract(); for (const key of ['purpose', 'method', 'findings', 'conclusion']) value[language][key] = 'Bir iki'; return value; }
const accepted = document => ({ declarations: Object.fromEntries(document.items.map(item => [item.key, true])), declarationVersion: document.version, declarationLocale: document.locale });
const requestInput = patch => ({ requestKey: randomUUID(), kind: 'QUESTION', subject: 'Synthetic question', description: 'Synthetic host application question.', ...patch });

test('legacy congress profiles gain disabled structured abstracts without changing old workflows', () => {
  for (const profile of ['CLASSIC', 'ABSTRACT_ONLY', 'REGISTRATION_ONLY']) {
    const config = profileConfiguration(profile);
    assert.ok(configurationSchema.safeParse(config).success);
    assert.equal(config.structuredAbstract.enabled, false);
    const legacy = structuredClone(config); delete legacy.structuredAbstract; delete legacy.declarationTexts;
    const parsed = configurationSchema.parse(legacy);
    assert.equal(parsed.structuredAbstract.enabled, false);
    assert.ok(parsed.declarationTexts.TR.accuracy && parsed.declarationTexts.EN.accuracy);
  }
});

test('word counting handles Turkish, Unicode spacing, numbers and punctuation-only tokens', () => {
  assert.equal(wordCount('  Amaç\nYöntem\tBulgular\u00a0Sonuç  '), 4);
  assert.equal(wordCount('... — 2026 e-posta O’Connor'), 3);
  assert.equal(wordCount(' \n\t… -- '), 0);
});

test('structured abstract validates required sections only in the selected enabled language', () => {
  const config = configured();
  for (const language of ['TR', 'EN']) assert.deepEqual(validateStructuredAbstract(complete(language), config, language), complete(language));
  const missing = complete(); missing.TR.purpose = ' \n ';
  assert.throws(() => validateStructuredAbstract(missing, config, 'TR'), { status: 400 });
  config.structuredAbstract.sections.TR.purpose.required = false;
  assert.equal(validateStructuredAbstract(missing, config, 'TR').TR.purpose, '');
});

test('each locale and section has an inclusive word limit; optional fields still respect their limit', () => {
  const config = configured(); config.structuredAbstract.sections.TR.method.maxWords = 2;
  assert.equal(validateStructuredAbstract(complete(), config, 'TR').TR.method, 'Bir iki');
  const excessive = complete(); excessive.TR.method = 'Bir iki üç';
  assert.throws(() => validateStructuredAbstract(excessive, config, 'TR'), { status: 400 });
  config.structuredAbstract.sections.TR.method.required = false;
  assert.throws(() => validateStructuredAbstract(excessive, config, 'TR'), { status: 400 });
  config.structuredAbstract.sections.EN.method.maxWords = 1;
  assert.throws(() => validateStructuredAbstract(complete('EN'), config, 'EN'), { status: 400 });
});

test('closed structured mode or language rejects submitted section text and unknown sections', () => {
  const config = configured(); config.structuredAbstract.enabled = false;
  assert.throws(() => validateStructuredAbstract(complete(), config, 'TR'), { status: 400 });
  assert.deepEqual(validateStructuredAbstract(null, config, 'TR'), emptyStructuredAbstract());
  config.structuredAbstract.enabled = true; config.languages = ['TR'];
  const foreign = complete(); foreign.EN.purpose = 'Unexpected English text';
  assert.throws(() => validateStructuredAbstract(foreign, config, 'TR'), { status: 400 });
  const injected = complete(); injected.TR.privateNote = 'Unrecognized section';
  assert.throws(() => validateStructuredAbstract(injected, config, 'TR'), { status: 400 });
});

test('structured rule configuration rejects closed target stage and unsafe bounds', () => {
  const config = configured();
  assert.ok(configurationSchema.safeParse(config).success);
  for (const maxWords of [0, -1, 1.5, 5001]) { const value = structuredClone(config); value.structuredAbstract.sections.TR.purpose.maxWords = maxWords; assert.equal(configurationSchema.safeParse(value).success, false); }
  const wrongStage = structuredClone(config); wrongStage.structuredAbstract.stage = 'FULL_TEXT';
  assert.equal(configurationSchema.safeParse(wrongStage).success, false);
});

test('structured summary preserves section order and localized headings', () => {
  assert.equal(structuredAbstractText(complete(), 'TR'), 'Amaç\nBir iki\n\nYöntem\nBir iki\n\nBulgular\nBir iki\n\nSonuç\nBir iki');
  assert.ok(structuredAbstractText(complete('EN'), 'EN').startsWith('Purpose\n'));
});

test('aggregate structured abstract limit includes all section text and headings', () => {
  const config = configured(), values = complete();
  const baseLength = structuredAbstractText(values, 'TR').length;
  values.TR.purpose = 'x'.repeat(50000 - baseLength + values.TR.purpose.length);
  assert.equal(structuredAbstractText(validateStructuredAbstract(values, config, 'TR'), 'TR').length, 50000);
  values.TR.purpose += 'x';
  assert.throws(() => validateStructuredAbstract(values, config, 'TR'), { status: 400 });
});

test('declaration documents are scoped to entity, locale and effective rules', () => {
  const config = profileConfiguration('CLASSIC');
  const doc = declarationDocument(config, 'SUBMISSION', 'tr');
  assert.match(doc.version, /^[a-f0-9]{64}$/);
  assert.equal(doc.version, declarationDocument(config, 'SUBMISSION', 'tr').version);
  assert.notEqual(doc.version, declarationDocument(config, 'SUBMISSION', 'en').version);
  assert.notEqual(doc.version, declarationDocument(config, 'REGISTRATION', 'tr').version);
  const changed = structuredClone(config); changed.declarationTexts.TR.accuracy += ' Güncel metin.';
  assert.notEqual(doc.version, declarationDocument(changed, 'SUBMISSION', 'tr').version);
  const changedRules = structuredClone(config); changedRules.fields.keywords = 'OPTIONAL';
  assert.notEqual(doc.version, declarationDocument(changedRules, 'SUBMISSION', 'tr').version);
});

test('declaration version survives equivalent legacy normalization and recursive JSON key reordering', () => {
  const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])])) : value;
  const legacy = effectiveConfiguration(null);
  const normalized = effectiveConfiguration(legacy);
  const version = declarationDocument(legacy, 'SUBMISSION', 'tr').version;
  assert.equal(version, declarationDocument(normalized, 'SUBMISSION', 'tr').version);
  assert.equal(version, declarationDocument(reverseKeys(normalized), 'SUBMISSION', 'tr').version);
  const changed = reverseKeys(normalized); changed.structuredAbstract.sections.TR.purpose.maxWords += 1;
  assert.notEqual(version, declarationDocument(changed, 'SUBMISSION', 'tr').version);
});

test('declaration sets omit inapplicable submission or participation statements', () => {
  const abstractOnly = declarationDocument(profileConfiguration('ABSTRACT_ONLY'), 'SUBMISSION', 'tr');
  assert.ok(!abstractOnly.items.some(item => item.key === 'registrationPresentationConsent'));
  const registration = declarationDocument(profileConfiguration('REGISTRATION_ONLY'), 'REGISTRATION', 'en');
  assert.ok(!registration.items.some(item => ['submissionLimit', 'coauthorApproval'].includes(item.key)));
});

test('declaration acceptance demands literal true and rejects missing or injected fields', () => {
  const doc = declarationDocument(profileConfiguration(), 'SUBMISSION', 'tr');
  const valid = accepted(doc); assert.deepEqual(validateDeclarationAcceptance(valid, doc), valid);
  for (const value of [false, 'true', 'false', 1, {}, null]) assert.throws(() => validateDeclarationAcceptance({ ...valid, declarations: { ...valid.declarations, accuracy: value } }, doc), { status: 400 });
  const missing = { ...valid.declarations }; delete missing.accuracy;
  assert.throws(() => validateDeclarationAcceptance({ ...valid, declarations: missing }, doc), { status: 400 });
  assert.throws(() => validateDeclarationAcceptance({ ...valid, actorId: 'foreign' }, doc), { status: 400 });
  assert.throws(() => validateDeclarationAcceptance({ ...valid, declarations: { ...valid.declarations, fabricatedConsent: true } }, doc), { status: 400 });
});

test('valid old declaration version or wrong document language produces an explicit conflict', () => {
  const config = profileConfiguration(); const doc = declarationDocument(config, 'SUBMISSION', 'tr');
  const old = accepted(doc); config.declarationTexts.TR.accuracy += ' Changed.';
  assert.throws(() => validateDeclarationAcceptance(old, declarationDocument(config, 'SUBMISSION', 'tr')), { status: 409 });
  assert.throws(() => validateDeclarationAcceptance({ ...old, declarationLocale: 'en' }, doc), { status: 409 });
});

test('legacy declarations are unknown and stored metadata never invents text or a timestamp', () => {
  assert.deepEqual(declarationMetadata(null), { recorded: false });
  assert.deepEqual(declarationMetadata({ version: 'saved-version', locale: 'tr', acceptedAt: '2026-10-06T10:00:00Z' }), { recorded: true, version: 'saved-version', locale: 'tr', acceptedAt: '2026-10-06T10:00:00.000Z' });
});

test('payment display distinguishes no charge, receipt evidence and missing receipt without inventing verification', () => {
  assert.equal(paymentState({ totalAmount: 0, receiptReceived: false }), 'NO_CHARGE');
  assert.equal(paymentState({ totalAmount: 100, receiptReceived: true }), 'RECEIPT_RECEIVED_UNVERIFIED');
  assert.equal(paymentState({ totalAmount: 100, receiptReceived: false, legacyReceiptAt: new Date(0) }), 'RECEIPT_RECEIVED_UNVERIFIED');
  assert.equal(paymentState({ totalAmount: 100, receiptReceived: false }), 'AWAITING_RECEIPT');
});

test('participant tasks respect ownership, presenter identity and whether registration is enabled', () => {
  const base = { status: 'DRAFT', owner: true, fileRequired: true, fileReceived: false, registrationEnabled: false, registered: false, presenter: true };
  assert.deepEqual(submissionTasks(base), ['COMPLETE_DRAFT', 'UPLOAD_SUBMISSION_FILE']);
  assert.deepEqual(submissionTasks({ ...base, owner: false }), []);
  assert.deepEqual(submissionTasks({ ...base, status: 'ACCEPTED' }), []);
  assert.deepEqual(submissionTasks({ ...base, status: 'ACCEPTED', registrationEnabled: true }), ['REGISTER_ACCEPTED_PAPER']);
  assert.deepEqual(submissionTasks({ ...base, status: 'ACCEPTED', registrationEnabled: true, presenter: false }), []);
  assert.deepEqual(submissionTasks({ ...base, status: 'ACCEPTED', registrationEnabled: true, registered: true }), []);
});

test('request source pairs and withdrawal/cancellation target kinds are validated before storage', () => {
  assert.ok(participantRequestSchema.safeParse(requestInput()).success);
  for (const patch of [{ sourceId: 'paper' }, { sourceType: 'SUBMISSION' }, { kind: 'WITHDRAWAL_REQUEST' }, { kind: 'WITHDRAWAL_REQUEST', sourceType: 'REGISTRATION', sourceId: 'registration' }, { kind: 'CANCELLATION_REQUEST', sourceType: 'SUBMISSION', sourceId: 'paper' }]) assert.equal(participantRequestSchema.safeParse(requestInput(patch)).success, false);
  assert.ok(participantRequestSchema.safeParse(requestInput({ kind: 'WITHDRAWAL_REQUEST', sourceType: 'SUBMISSION', sourceId: 'paper' })).success);
});

test('participant request schema cannot impersonate email, assign staff, change state or create staff mail records', () => {
  for (const patch of [{ requesterEmail: 'other@example.invalid' }, { assigneeId: 'staff' }, { status: 'RESOLVED' }, { internalNote: 'hidden' }, { kind: 'MANUAL_EMAIL' }, { sourceType: 'FEEDBACK', sourceId: 'unverified-contact' }]) assert.equal(participantRequestSchema.safeParse(requestInput(patch)).success, false);
  assert.ok(staffRequestSchema.safeParse(requestInput({ kind: 'MANUAL_EMAIL', requesterEmail: 'claimed@example.invalid' })).success);
  assert.equal(requestUpdateSchema.safeParse({ version: 0, status: 'NEW' }).success, false);
  assert.equal(requestUpdateSchema.safeParse({ version: 1, status: 'RESOLVED', congressId: 'foreign' }).success, false);
});

test('participant serializer exposes neither internal notes, assignee data nor private audit events', () => {
  const row = { id: 'request', kind: 'QUESTION', origin: 'PARTICIPANT', subject: 'Question', description: 'Public description', status: 'WAITING', sourceType: null, sourceId: null, publicResult: 'Public response', createdAt: new Date(0), updatedAt: new Date(0), resolvedAt: null, internalNote: 'PRIVATE_NOTE', assigneeId: 'PRIVATE_STAFF', requesterEmail: 'PRIVATE_EMAIL', payloadHash: 'PRIVATE_HASH', events: [{ internalNote: 'PRIVATE_EVENT' }] };
  const serialized = publicRequest(row);
  assert.equal(serialized.publicResult, 'Public response');
  assert.ok(!JSON.stringify(serialized).includes('PRIVATE'));
});

test('independent host can use worklist core through ports without congress business modules', async () => {
  const rows = new Map(), events = [], audits = [];
  const tx = { workRequest: {
    async upsert({ where, create }) { const key = `${where.congressId_requestKey.congressId}:${where.congressId_requestKey.requestKey}`; if (!rows.has(key)) rows.set(key, { ...create, status: 'NEW', version: 1, publicResult: '', internalNote: '', createdAt: new Date(), updatedAt: new Date(), resolvedAt: null }); return rows.get(key); },
    async findFirst({ where }) { return [...rows.values()].find(row => row.id === where.id && row.congressId === where.congressId) ?? null; },
    async updateMany({ where, data }) { const row = [...rows.values()].find(row => row.id === where.id && row.congressId === where.congressId && row.version === where.version); if (!row) return { count: 0 }; Object.assign(row, data, { version: row.version + 1, updatedAt: new Date() }); return { count: 1 }; },
    async findUniqueOrThrow({ where }) { return [...rows.values()].find(row => row.id === where.id); },
  }, workRequestEvent: { async create({ data }) { events.push(data); return data; } } };
  const ports = { resolveSource: async () => assert.fail('independent question has no business source'), validateAssignee: async () => assert.fail('independent question has no staff assignment'), audit: async (_tx, _context, action, id, detail) => audits.push({ action, id, detail }) };
  const context = { congressId: 'independent-host-space', origin: 'PARTICIPANT', email: 'synthetic@example.invalid' };
  const input = requestInput();
  const row = await createRequest(tx, context, input, ports);
  assert.equal((await createRequest(tx, context, input, ports)).id, row.id);
  assert.equal(events.length, 1); assert.equal(audits.length, 1);
  await assert.rejects(createRequest(tx, context, { ...input, description: 'Conflicting request body' }, ports), { status: 409 });
  await assert.rejects(updateRequest(tx, context, row.id, { version: 1, status: 'RESOLVED', publicResult: 'Resolved by participant' }, ports), { status: 403 });
  const staffContext = { ...context, origin: 'STAFF_EMAIL' };
  await assert.rejects(updateRequest(tx, staffContext, row.id, { version: 1, status: 'RESOLVED' }, ports), { status: 400 });
  await updateRequest(tx, staffContext, row.id, { version: 1, status: 'RESOLVED', publicResult: 'Resolved by independent host' }, ports);
  await assert.rejects(updateRequest(tx, staffContext, row.id, { version: 1, status: 'WAITING' }, ports), { status: 409 });
  assert.equal(events.length, 2); assert.equal(audits.length, 2);
  assert.equal(publicRequest(row).publicResult, 'Resolved by independent host');
});
