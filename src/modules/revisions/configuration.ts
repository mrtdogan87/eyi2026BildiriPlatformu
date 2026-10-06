import { z } from 'zod';
export const reasonSchema = z.string().trim().min(8, 'En az 8 karakterlik gerekçe gerekli.').max(2000);
export const correctionSchema = z.object({ version: z.number().int().min(0), reason: reasonSchema, notify: z.boolean(), registrationHandling: z.enum(['UPDATE', 'FOLLOW_UP']), draftOwnerEmail: z.string().trim().toLowerCase().email().max(254), details: z.object({ submissionLanguage: z.enum(['TR', 'EN']), titleTr: z.string().max(50000), titleEn: z.string().max(50000), abstractTr: z.string().max(50000), abstractEn: z.string().max(50000), keywordsTr: z.string().max(50000), keywordsEn: z.string().max(50000), structuredAbstract: z.unknown().optional() }).strict(), authors: z.array(z.object({ fullName: z.string().trim().min(1).max(180), email: z.string().trim().toLowerCase().email().max(254), title: z.string().max(120), institution: z.string().max(300), country: z.string().max(120), isPresenter: z.boolean() }).strict()).min(1).max(50) }).strict();
export const fileCorrectionSchema = z.object({ version: z.number().int().min(0), reason: reasonSchema, notify: z.boolean(), restoreVersionId: z.string().min(1).max(128).optional() }).strict();
export const requestRevisionSchema = z.object({ version: z.number().int().min(0), reason: reasonSchema, expiresAt: z.string().datetime({ offset: true }), notify: z.boolean() }).strict();
export const reviewRevisionSchema = z.object({ version: z.number().int().min(1), decision: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']), reason: reasonSchema, notify: z.boolean() }).strict();
export type Snapshot = Record<string, unknown>;
export function changedFields(before: Snapshot, after: Snapshot) {
  return Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(field => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}
export function outputKinds(status: string, fields: string[], registered: boolean) {
  if (!fields.length) return [];
  const result = new Set<string>();
  if (fields.some(k => ['authors', 'draftOwnerEmail'].includes(k)) && registered) result.add('REGISTRATION_REVIEW');
  if (fields.some(k => ['titleTr', 'titleEn', 'abstractTr', 'abstractEn', 'keywordsTr', 'keywordsEn', 'structuredAbstract', 'authors', 'file'].includes(k))) result.add('BOOK');
  if (status === 'ACCEPTED') {
    result.add('ACCEPTED_LIST');
    if (fields.some(k => ['authors', 'draftOwnerEmail', 'titleTr', 'titleEn'].includes(k))) { result.add('ACCEPTANCE_LETTER'); result.add('PROGRAM'); }
    if (fields.includes('authors')) result.add('CERTIFICATE');
  }
  return [...result];
}
export const outputLabels: Record<string, string> = { ACCEPTANCE_LETTER: 'Kabul mektubunu yeniden düzenle', ACCEPTED_LIST: 'Kabul listesine sıra bozulmadan ek düzeltme işle', PROGRAM: 'Program başlığı/yazarlarını kontrol et', BOOK: 'Kitap/yayın sürümünü kontrol et', CERTIFICATE: 'Yazar belgelerini kontrol et', REGISTRATION_REVIEW: 'İlişkili kayıt e-postası ve sunan yazarı kontrol et' };

export const revisionStatusLabels: Record<string, [string, string]> = { OPEN: ['Dosya bekleniyor', 'Awaiting file'], SUBMITTED: ['İnceleme bekliyor', 'Awaiting review'], APPROVED: ['Onaylandı', 'Approved'], REJECTED: ['Reddedildi', 'Rejected'], CANCELLED: ['Kapatıldı', 'Closed'] };
