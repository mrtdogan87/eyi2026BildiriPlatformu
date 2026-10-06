import { z } from 'zod';
import type { CongressConfiguration } from '../congress/configuration.ts';
import { abstractSectionKeys, abstractSectionLabels, ParticipationValidationError } from './rules.ts';
export { abstractSectionKeys, abstractSectionLabels } from './rules.ts';
const sectionText = z.string().max(50000).default('');
const language = z.object({ purpose: sectionText, method: sectionText, findings: sectionText, conclusion: sectionText }).strict();
export const structuredAbstractSchema = z.object({ TR: language, EN: language }).strict();
export type StructuredAbstract = z.infer<typeof structuredAbstractSchema>;
export function emptyStructuredAbstract(): StructuredAbstract {
  return { TR: { purpose: '', method: '', findings: '', conclusion: '' }, EN: { purpose: '', method: '', findings: '', conclusion: '' } };
}
/** A word is a whitespace-delimited token containing a Unicode letter or number. */
export function wordCount(text: string) { return text.trim().split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).length; }
export function validateStructuredAbstract(raw: unknown, config: CongressConfiguration, selectedLanguage: 'TR' | 'EN'): StructuredAbstract {
  const parsed = structuredAbstractSchema.safeParse(raw ?? emptyStructuredAbstract());
  if (!parsed.success) throw new ParticipationValidationError(400, 'Yapılandırılmış özet bölümlerini kontrol edin.');
  const values = parsed.data;
  for (const lang of ['TR', 'EN'] as const) for (const key of abstractSectionKeys) {
    const text = values[lang][key].trim(); values[lang][key] = text;
    if (!config.structuredAbstract.enabled) {
      if (text) throw new ParticipationValidationError(400, 'Bu kongrede yapılandırılmış özet kullanılmıyor.');
      continue;
    }
    if (!config.languages.includes(lang) && text) throw new ParticipationValidationError(400, 'Bu özet dili kongrede açık değil.');
    const rule = config.structuredAbstract.sections[lang][key];
    if (lang === selectedLanguage && rule.required && !text) throw new ParticipationValidationError(400, `${abstractSectionLabels[lang][key]} gerekli.`);
    if (wordCount(text) > rule.maxWords) throw new ParticipationValidationError(400, `${abstractSectionLabels[lang][key]} en fazla ${rule.maxWords} kelime olabilir.`);
  }
  if (config.structuredAbstract.enabled && (structuredAbstractText(values, 'TR').length > 50000 || structuredAbstractText(values, 'EN').length > 50000)) throw new ParticipationValidationError(400, 'Özetin tüm bölümleri bir dilde en fazla 50000 karakter olabilir.');
  return values;
}
export function structuredAbstractText(values: StructuredAbstract, language: 'TR' | 'EN') {
  return abstractSectionKeys.filter(key => values[language][key].trim()).map(key => `${abstractSectionLabels[language][key]}\n${values[language][key]}`).join('\n\n');
}
