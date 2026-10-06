import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CongressConfiguration } from '../congress/configuration.ts';
import { declarationKeys, ParticipationValidationError, type DeclarationKey } from './rules.ts';
export { declarationKeys } from './rules.ts';
export type DeclarationDocument = { version: string; locale: 'tr' | 'en'; items: Array<{ key: DeclarationKey; text: string }> };
export type DeclarationDocuments = { tr: DeclarationDocument; en: DeclarationDocument };
export type DeclarationEntity = 'SUBMISSION' | 'REGISTRATION';
function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, canonicalJson(object[key])]));
  }
  return value;
}
export function declarationDocument(config: CongressConfiguration, entityType: DeclarationEntity, locale: 'tr' | 'en'): DeclarationDocument {
  const keys = entityType === 'SUBMISSION'
    ? declarationKeys.filter(key => key !== 'registrationPresentationConsent' || config.modules.REGISTRATION || config.stages.PARTICIPATION.enabled)
    : declarationKeys.filter(key => key !== 'submissionLimit' && key !== 'coauthorApproval');
  const items = keys.map(key => ({ key, text: config.declarationTexts[locale === 'tr' ? 'TR' : 'EN'][key] }));
  const version = createHash('sha256').update(JSON.stringify(canonicalJson({ schema: 1, entityType, locale, items, rules: config, authorSubmissionLimit: 2 }))).digest('hex');
  return { version, locale, items };
}
export function declarationDocuments(config: CongressConfiguration, entityType: DeclarationEntity): DeclarationDocuments {
  return { tr: declarationDocument(config, entityType, 'tr'), en: declarationDocument(config, entityType, 'en') };
}
const booleans = z.object({ accuracy: z.boolean().optional(), submissionLimit: z.boolean().optional(), coauthorApproval: z.boolean().optional(), personalDataConsent: z.boolean().optional(), registrationPresentationConsent: z.boolean().optional() }).strict();
export const declarationAcceptanceSchema = z.object({ declarations: booleans, declarationVersion: z.string().regex(/^[a-f0-9]{64}$/), declarationLocale: z.enum(['tr', 'en']) }).strict();
export function validateDeclarationAcceptance(raw: unknown, document: DeclarationDocument) {
  const input = declarationAcceptanceSchema.safeParse(raw);
  if (!input.success) throw new ParticipationValidationError(400, 'Beyanları ve görüntülenen metin sürümünü doğrulayın.');
  if (input.data.declarationLocale !== document.locale || input.data.declarationVersion !== document.version) throw new ParticipationValidationError(409, 'Başvuru kuralları veya beyan metni değişti. Sayfayı yenileyip güncel metinleri onaylayın.');
  if (document.items.some(item => input.data.declarations[item.key] !== true)) throw new ParticipationValidationError(400, 'Gerekli beyanların tümünü onaylayın.');
  return input.data;
}
export function declarationMetadata(record: { version: string; locale: string; acceptedAt: Date | string } | null) {
  return record ? { recorded: true as const, version: record.version, locale: record.locale, acceptedAt: new Date(record.acceptedAt).toISOString() } : { recorded: false as const };
}
