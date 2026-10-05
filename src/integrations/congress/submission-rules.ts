import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AccessError } from '@/platform/http';
import { effectiveConfiguration, fieldLabels, type CongressConfiguration, type FieldKey } from '@/modules/congress/configuration';
export async function submissionRules(id: string) { const paper = await prisma.submission.findUnique({ where: { id }, select: { congress: { select: { configuration: true } } } }); if (!paper) throw new AccessError(404, 'Bildiri bulunamadı.'); return effectiveConfiguration(paper.congress.configuration); }
function parse<T>(schema: z.ZodType<T>, value: unknown) { const result = schema.safeParse(value); if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'Alanları kontrol edin.'); return result.data; }
function field(config: CongressConfiguration, key: FieldKey, value: unknown) {
  if (config.fields[key] === 'REQUIRED' && !value) throw new AccessError(400, `${fieldLabels[key]} gerekli.`);
  if (config.fields[key] === 'HIDDEN' && value) throw new AccessError(400, `${fieldLabels[key]} bu kongrede kullanılmıyor.`);
}
export function configuredDetails(raw: unknown, config: CongressConfiguration) {
  const text = z.string().max(50000).default('');
  const input = parse(z.object({ submissionLanguage: z.enum(['TR', 'EN']), titleTr: text, titleEn: text, abstractTr: text, abstractEn: text, keywordsTr: text, keywordsEn: text }), raw);
  if (!config.languages.includes(input.submissionLanguage)) throw new AccessError(400, 'Bu bildiri dili kongrede açık değil.');
  const suffix = input.submissionLanguage === 'TR' ? 'Tr' : 'En';
  if (!input[`title${suffix}`].trim()) throw new AccessError(400, 'Bildiri başlığı gerekli.');
  field(config, 'abstract', config.fields.abstract === 'HIDDEN' ? input.abstractTr.trim() || input.abstractEn.trim() : input[`abstract${suffix}`].trim());
  field(config, 'keywords', config.fields.keywords === 'HIDDEN' ? input.keywordsTr.trim() || input.keywordsEn.trim() : input[`keywords${suffix}`].trim());
  return input;
}
export function configuredAuthors(raw: unknown, config: CongressConfiguration) {
  const input = parse(z.array(z.object({ fullName: z.string().trim().min(1).max(180), email: z.string().trim().toLowerCase().email().max(254), title: z.string().trim().max(120).default(''), institution: z.string().trim().max(300).default(''), country: z.string().trim().max(120).default(''), isPresenter: z.boolean() })).min(1).max(50), raw);
  if (input.filter(a => a.isPresenter).length !== 1) throw new AccessError(400, 'Tam bir sunan yazar seçin.');
  if (new Set(input.map(a => a.email)).size !== input.length) throw new AccessError(400, 'Yazar e-postaları tekrar edemez.');
  for (const author of input) { field(config, 'authorTitle', author.title); field(config, 'authorInstitution', author.institution); field(config, 'authorCountry', author.country); }
  return input;
}
export function configuredParticipation(raw: unknown, config: CongressConfiguration) {
  const input = parse(z.object({ presentationMode: z.enum(['ONLINE', 'IN_PERSON']).nullable().default(null), audience: z.enum(['ACADEMIC', 'STUDENT']).nullable().default(null) }), raw);
  field(config, 'presentationMode', input.presentationMode); field(config, 'audience', input.audience); return input;
}

export async function requireEditableDraft(id: string) {
  const submission = await prisma.submission.findUnique({ where:{id}, select:{status:true} });
  if (!submission) throw new AccessError(404, 'Bildiri bulunamadı.');
  if (submission.status !== 'DRAFT') throw new AccessError(409, 'Gönderilmiş bildirinin içeriği bu ekrandan değiştirilemez.');
}
