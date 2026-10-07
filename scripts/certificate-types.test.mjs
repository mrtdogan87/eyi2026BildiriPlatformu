import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { roles, recipientSchema, certificateTypeSchema, defaultLayout } from '../src/modules/certificates/core.ts';
import { certificateTypes, resolveCertificateType, certificateRoleLabel } from '../src/modules/certificates/types.mjs';
import { mapRows, readCsv, readXlsx } from '../src/modules/certificates/import.mjs';
import { renderCertificate, sampleBackground } from '../src/modules/certificates/pdf.mjs';

const key = 'CUSTOM_89f11da0-f186-4691-bbd3-e06c1c1de001';
const secondKey = 'CUSTOM_89f11da0-f186-4691-bbd3-e06c1c1de002';
const type = { congressId: 'one', key, name: 'Workshop katılımı', baseRole: 'PARTICIPANT' };
const db = records => ({ certificateType: {
  findFirst: async ({ where }) => records.find(r => r.congressId === where.congressId && r.key === where.key) ?? null,
  findMany: async ({ where }) => records.filter(r => r.congressId === where.congressId),
} });
const confirmation = { reason: 'Reviewed workshop certificate conditions.', confirmed: true };

test('Custom types require a standard base role and cannot forge a key or update an old type', () => {
  assert.equal(certificateTypeSchema.parse({ ...confirmation, name: ' Workshop   katılımı ', baseRole: 'PARTICIPANT' }).name, 'Workshop katılımı');
  for (const patch of [{ baseRole: 'ANYONE' }, { key }, { id: 'existing' }, { confirmed: false }]) {
    assert.equal(certificateTypeSchema.safeParse({ ...confirmation, name: type.name, baseRole: type.baseRole, ...patch }).success, false);
  }
  assert.equal(recipientSchema.safeParse({ role: 'Unregistered workshop', data: { recipientName: 'Şule Işık' } }).success, false);
});

test('A custom-shaped role requires an existing record in the exact selected congress', async () => {
  assert.equal(recipientSchema.safeParse({ role: key, data: { recipientName: 'Şule Işık' } }).success, true);
  assert.deepEqual(await resolveCertificateType(db([type]), 'one', key), { key, name: type.name, baseRole: 'PARTICIPANT', custom: true });
  await assert.rejects(resolveCertificateType(db([type]), 'other', key), error => error.status === 400);
  await assert.rejects(resolveCertificateType(db([type]), 'one', secondKey), error => error.status === 400);
  await assert.rejects(resolveCertificateType(db([{ ...type, baseRole: 'ADMIN' }]), 'one', key), error => error.status === 409);
});

test('Built-in roles retain their original keys and policies without custom database access', async () => {
  for (const role of roles) assert.equal((await resolveCertificateType({}, 'one', role)).baseRole, role);
  const list = await certificateTypes(db([type, { ...type, congressId: 'foreign', key: secondKey }]), 'one');
  assert.deepEqual(list.filter(t => !t.custom).map(t => t.key), roles);
  assert.equal(list.filter(t => t.custom).length, 1);
  assert.equal(list.at(-1).key, key);
});

test('Reviewed CSV rejects unknown or foreign custom keys by line and distinguishes two types for one person', () => {
  const mapping = { recipientName: 'name', role: 'type' };
  const table = readCsv(`name,type\nŞule Işık,${key}\nŞule Işık,${secondKey}\nŞule Işık,PARTICIPANT`);
  const scoped = mapRows(table, mapping, '', [...roles, key]);
  assert.equal(scoped.errors.length, 1);
  assert.equal(scoped.errors[0].line, 3);
  assert.equal(scoped.valid.length, 2);
  assert.equal(mapRows(table, mapping).errors.length, 2);
  assert.equal(mapRows(table, mapping, '', [...roles, key, secondKey]).valid.length, 3);
});

test('XLSX custom type keys survive parsing and require the same scoped catalogue as CSV', async () => {
  const zip = await JSZip.loadAsync(readFileSync('data/certificates/recipients-example.xlsx'));
  for (const [name, file] of Object.entries(zip.files)) if (name.endsWith('.xml')) {
    zip.file(name, (await file.async('string')).replaceAll('PARTICIPANT', key).replaceAll('SPEAKER', secondKey));
  }
  const table = await readXlsx(await zip.generateAsync({ type: 'uint8array' }));
  const result = mapRows(table, { role: 'role', recipientName: 'recipientName', institution: 'institution' }, '', [...roles, key, secondKey]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.valid.length, 2);
  assert.deepEqual(new Set(result.valid.map(r => r.role)), new Set([key, secondKey]));
});

test('PDF role field renders the custom name without changing recipient data or writing an artifact', async () => {
  const layout = [defaultLayout[0], { ...defaultLayout[1], field: 'role' }];
  const rendered = await renderCertificate({ background: await sampleBackground(), layout, data: { recipientName: 'Şule Işık' }, role: type.name, number: 'CERT-TEST', verificationCode: 'test' });
  assert.deepEqual(rendered.placements.find(p => p.field === 'role').lines, [type.name]);
  assert.ok(rendered.pdf.length > 1000);
});

test('Issued label comes from its immutable PDF snapshot and old standard files still show their role', () => {
  assert.equal(certificateRoleLabel(key, { roleLabel: 'Workshop katılımı' }), 'Workshop katılımı');
  assert.equal(certificateRoleLabel('PARTICIPANT', {}), 'Katılımcı');
  assert.equal(certificateRoleLabel('SPEAKER', { roleLabel: 'Eski konuşmacı belgesi' }), 'Eski konuşmacı belgesi');
});
