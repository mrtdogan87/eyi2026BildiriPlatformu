import test from 'node:test';
import assert from 'node:assert/strict';
import { changedFields, outputKinds, correctionSchema, reasonSchema, fileCorrectionSchema, requestRevisionSchema, reviewRevisionSchema } from '../src/modules/revisions/configuration.ts';
const author = { fullName: 'Synthetic author', email: 'author@example.invalid', title: '', institution: '', country: '', isPresenter: true };
const input = () => ({ version: 0, reason: 'Synthetic correction reason', notify: false, registrationHandling: 'UPDATE', draftOwnerEmail: author.email, details: { submissionLanguage: 'TR', titleTr: 'Title', titleEn: '', abstractTr: 'Abstract', abstractEn: '', keywordsTr: 'Keyword', keywordsEn: '' }, authors: [author] });
test('correction requires a trimmed bounded reason and rejects hidden identity/status fields', () => {
  assert.equal(reasonSchema.parse('  A valid reason  '), 'A valid reason');
  for (const reason of ['', '       ', 'short', 'x'.repeat(2001)]) assert.equal(reasonSchema.safeParse(reason).success, false);
  for (const patch of [{ actorId: 'forged' }, { status: 'ACCEPTED' }, { reason: 'short' }, { version: -1 }, { notify: 'yes' }]) assert.equal(correctionSchema.safeParse({ ...input(), ...patch }).success, false);
  assert.ok(correctionSchema.safeParse(input()).success);
});
test('author and content payload limits apply before configured congress rules', () => {
  for (const authors of [[], Array(51).fill(author), [{ ...author, actorId: 'forged' }], [{ ...author, email: 'bad' }]]) assert.equal(correctionSchema.safeParse({ ...input(), authors }).success, false);
  assert.equal(correctionSchema.safeParse({ ...input(), details: { ...input().details, titleTr: 'x'.repeat(50001) } }).success, false);
  assert.equal(correctionSchema.parse({ ...input(), draftOwnerEmail: ' AUTHOR@EXAMPLE.INVALID ', authors: [{ ...author, email: ' AUTHOR@EXAMPLE.INVALID ' }] }).authors[0].email, author.email);
});
test('file, request and review actions reject forged fields and invalid decisions', () => {
  assert.ok(fileCorrectionSchema.safeParse({ version: 1, reason: 'Restore old version', notify: false, restoreVersionId: 'version-id' }).success);
  assert.equal(fileCorrectionSchema.safeParse({ version: 1, reason: 'Restore old version', notify: false, number: 99 }).success, false);
  assert.equal(requestRevisionSchema.safeParse({ version: 0, reason: 'Please revise file', expiresAt: 'tomorrow', notify: false }).success, false);
  assert.equal(reviewRevisionSchema.safeParse({ version: 1, reason: 'Reviewed proposal', decision: 'SUBMITTED', notify: false }).success, false);
});
test('history captures exact previous/new author order and content while unchanged fields stay out', () => {
  const before = { title: 'Old', authors: [author, { ...author, email: 'other@example.invalid' }], unchanged: 'same' };
  const after = { ...before, title: 'New', authors: [...before.authors].reverse() };
  assert.deepEqual(changedFields(before, after), [{ field: 'title', before: 'Old', after: 'New' }, { field: 'authors', before: before.authors, after: after.authors }]);
  assert.deepEqual(changedFields(before, structuredClone(before)), []);
});
test('accepted author corrections require letter/list/program/book/certificate and registration review', () => {
  assert.deepEqual(new Set(outputKinds('ACCEPTED', ['authors'], true)), new Set(['REGISTRATION_REVIEW', 'BOOK', 'ACCEPTED_LIST', 'ACCEPTANCE_LETTER', 'PROGRAM', 'CERTIFICATE']));
});
test('file and abstract changes do not invent identity or certificate updates', () => {
  assert.deepEqual(outputKinds('SUBMITTED', ['file'], false), ['BOOK']);
  assert.deepEqual(outputKinds('ACCEPTED', ['abstractTr'], false), ['BOOK', 'ACCEPTED_LIST']);
  assert.deepEqual(outputKinds('ACCEPTED', ['titleTr'], false), ['BOOK', 'ACCEPTED_LIST', 'ACCEPTANCE_LETTER', 'PROGRAM']);
});
test('unchanged or pending submissions do not fabricate accepted outputs', () => {
  assert.deepEqual(outputKinds('ACCEPTED', [], true), []);
  assert.deepEqual(outputKinds('SUBMITTED', ['authors'], false), ['BOOK']);
  assert.deepEqual(outputKinds('REJECTED', ['draftOwnerEmail'], true), ['REGISTRATION_REVIEW']);
});
