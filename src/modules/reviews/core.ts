import { z } from 'zod';

export const modes = ['OPEN', 'SINGLE_BLIND', 'DOUBLE_BLIND'] as const;
export const modeLabels: Record<string, string> = { OPEN: 'Açık değerlendirme', SINGLE_BLIND: 'Tek kör (hakem kimliği yazardan gizli)', DOUBLE_BLIND: 'Çift kör (iki tarafın kimliği gizli)' };
export const stateLabels: Record<string, string> = { OPEN: 'Tur açık', CLOSED: 'Tur kararı verildi', CANCELLED: 'Kapatıldı', INVITED: 'Davet yanıtı bekleniyor', ACCEPTED: 'Değerlendirme bekleniyor', DECLINED: 'Davet reddedildi', CONFLICT: 'Çıkar çatışması bildirildi', SUBMITTED: 'Değerlendirme teslim edildi', ACCEPT: 'Kabul', REVISE: 'Revizyon', REJECT: 'Ret' };
export const defaultCriteria = [{ id: 'originality', tr: 'Özgünlük / katkı', en: 'Originality / contribution' }, { id: 'method', tr: 'Yöntem ve bilimsel tutarlılık', en: 'Method and scientific soundness' }, { id: 'clarity', tr: 'Anlatım ve düzen', en: 'Clarity and structure' }];
export const criterionSchema = z.object({ id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), tr: z.string().trim().min(2).max(200), en: z.string().trim().min(2).max(200) }).strict();
export const criteriaSchema = z.array(criterionSchema).min(1).max(10).refine(a => new Set(a.map(c => c.id)).size === a.length, 'Ölçüt kimlikleri tekil olmalı.');
export const contentSchema = z.object({ titleTr: z.string().max(50000), titleEn: z.string().max(50000), abstractTr: z.string().max(50000), abstractEn: z.string().max(50000), keywordsTr: z.string().max(50000), keywordsEn: z.string().max(50000) }).strict().refine(c => !!(c.titleTr.trim() || c.titleEn.trim()), 'En az bir başlık gerekli.');
export type ReviewContent = z.infer<typeof contentSchema>;
export const reasonSchema = z.string().trim().min(8).max(2000);
const version = z.number().int().min(0), confirmed = z.literal(true);
export const roundSchema = z.object({ version, correctionVersion: version, mode: z.enum(modes).default('SINGLE_BLIND'), deadline: z.string().datetime({ offset: true }), criteria: criteriaSchema, content: contentSchema.optional(), anonymityChecked: z.boolean().default(false), reason: reasonSchema, confirmed, reopen: z.boolean().default(false) }).strict();
export const inviteSchema = z.object({ version, reviewerId: z.string().min(1).max(128), reason: reasonSchema, confirmed, notify: z.boolean().default(true) }).strict();
export const responseSchema = z.object({ version, response: z.enum(['ACCEPT', 'DECLINE', 'CONFLICT']), conflict: z.boolean(), reason: reasonSchema, confirmed }).strict();
export const evaluationSchema = z.object({ version, submit: z.boolean(), scores: z.record(z.string(), z.number().int().min(1).max(5)), recommendation: z.enum(['ACCEPT', 'REVISE', 'REJECT']), authorComment: z.string().trim().max(5000), internalComment: z.string().trim().max(5000), confirmed }).strict();
export const importSchema = evaluationSchema.extend({ reason: reasonSchema, identityChecked: confirmed }).strict();
export const cancelSchema = z.object({ version, reason: reasonSchema, confirmed }).strict();
export const deadlineSchema = z.object({ version, deadline: z.string().datetime({ offset: true }), reason: reasonSchema, confirmed }).strict();
export const decisionSchema = z.object({ version, correctionVersion: version, decision: z.enum(['ACCEPT', 'REVISE', 'REJECT']), reason: reasonSchema, feedbackTr: z.string().trim().min(8).max(5000), feedbackEn: z.string().trim().max(10000), publishReviews: z.boolean(), confirmed, overrideIncomplete: z.boolean().default(false), notify: z.boolean().default(true), requestFileRevision: z.boolean().default(false), revisionDeadline: z.string().datetime({ offset: true }).optional() }).strict();

export class ReviewError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export function deadlineDate(value: string, now = new Date()) { const d = new Date(value); if (!Number.isFinite(d.getTime()) || d <= now || d.getTime() > now.getTime() + 366 * 86400000) throw new ReviewError(400, 'Son tarih gelecekte ve en fazla bir yıl içinde olmalı.'); return d; }
export function sameEmail(a: string, b: string) { return a.trim().toLowerCase() === b.trim().toLowerCase(); }
export function isAuthor(email: string, owner: string, authors: Array<{ email: string }>) { return sameEmail(email, owner) || authors.some(a => sameEmail(a.email, email)); }
export function assertCurrent(expected: number, actual: number) { if (expected !== actual) throw new ReviewError(409, 'Kayıt değişti; yenileyip tekrar inceleyin.'); }
export function assertOpen(state: string, deadline: Date, now = new Date()) { if (state !== 'OPEN') throw new ReviewError(409, 'Değerlendirme turu kapalı.'); if (deadline <= now) throw new ReviewError(409, 'Son tarih geçti; editörden gerekçeli süre uzatımı isteyin.'); }
export function validateScores(criteria: Array<{ id: string }>, input: z.infer<typeof evaluationSchema>) {
  if (Object.keys(input.scores).some(k => !criteria.some(c => c.id === k))) throw new ReviewError(400, 'Turun ölçütleri dışında puan verilemez.');
  if (input.submit && (criteria.some(c => !Object.hasOwn(input.scores, c.id)) || input.authorComment.length < 8)) throw new ReviewError(400, 'Teslim için tüm ölçütleri puanlayın ve yazara en az sekiz karakter yorum yazın.');
}
export function reviewProjection(content: ReviewContent, mode: string, authors: Array<{ fullName: string; institution: string | null }>) { return { ...content, ...(mode === 'DOUBLE_BLIND' ? {} : { authors: authors.map(a => ({ name: a.fullName, institution: a.institution })) }) }; }
