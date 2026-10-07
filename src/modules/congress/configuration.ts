import { z } from 'zod';
import { defaultStructuredAbstractRules, structuredAbstractRulesSchema, defaultDeclarationTexts, declarationTextsSchema } from '../participation/rules.ts';
export const fieldKeys = ['abstract', 'keywords', 'file', 'authorTitle', 'authorInstitution', 'authorCountry', 'presentationMode', 'audience', 'receipt', 'studentDocument'] as const;
export type FieldKey = typeof fieldKeys[number];
export const fieldLabels: Record<FieldKey, string> = { abstract: 'Özet', keywords: 'Anahtar kelimeler', file: 'Word dosyası', authorTitle: 'Yazar unvanı', authorInstitution: 'Yazar kurumu', authorCountry: 'Yazar ülkesi', presentationMode: 'Sunum şekli', audience: 'Akademik statü', receipt: 'Dekont', studentDocument: 'Öğrenci belgesi' };
export const stageKeys = ['ABSTRACT', 'FULL_TEXT', 'PARTICIPATION', 'PAYMENT'] as const;
export type StageKey = typeof stageKeys[number];
export const stageLabels: Record<StageKey, string> = { ABSTRACT: 'Özet', FULL_TEXT: 'Tam metin dosyası', PARTICIPATION: 'Sunum bilgileri', PAYMENT: 'Ücret ve dekont' };
export type FieldMode = 'HIDDEN' | 'OPTIONAL' | 'REQUIRED';
export const modeLabels: Record<FieldMode, string> = { HIDDEN: 'Gizli', OPTIONAL: 'İsteğe bağlı', REQUIRED: 'Zorunlu' };
const date = z.string().datetime({ offset: true }).nullable();
const stage = z.object({ enabled: z.boolean(), deadline: date }).strict();
const mode = z.enum(['HIDDEN', 'OPTIONAL', 'REQUIRED']);
const invitationText = z.string().trim().max(300).refine(value => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value), 'Kontrol karakteri kullanmayın.');
export const emptyInvitationFacts = () => ({ theme: { tr: '', en: '' }, participationMode: '' as const });
export const invitationFactsSchema = z.object({
  theme: z.object({ tr: invitationText, en: invitationText }).strict(),
  participationMode: z.enum(['', 'ONSITE', 'ONLINE', 'HYBRID']),
}).strict();
export type InvitationFacts = z.infer<typeof invitationFactsSchema>;
export const participationModeLabels = {
  ONSITE: { tr: 'Yüz yüze', en: 'In person' },
  ONLINE: { tr: 'Çevrim içi', en: 'Online' },
  HYBRID: { tr: 'Hibrit (yüz yüze ve çevrim içi)', en: 'Hybrid (in person and online)' },
} as const;
export const configurationSchema = z.object({
  version: z.literal(1), profile: z.enum(['CLASSIC', 'ABSTRACT_ONLY', 'REGISTRATION_ONLY', 'CUSTOM']),
  languages: z.array(z.enum(['TR', 'EN'])).min(1).max(2).refine(v => new Set(v).size === v.length, 'Diller tekrar edemez.'),
  theme: z.enum(['eyi', 'simple']), accent: z.string().regex(/^#[a-fA-F0-9]{6}$/, 'Renk #RRGGBB biçiminde olmalı.'),
  invitationFacts: invitationFactsSchema.default(emptyInvitationFacts),
  modules: z.object({ SUBMISSIONS: z.boolean(), REGISTRATION: z.boolean() }).strict(),
  stages: z.object({ ABSTRACT: stage, FULL_TEXT: stage, PARTICIPATION: stage, PAYMENT: stage }).strict(),
  fields: z.object(Object.fromEntries(fieldKeys.map(key => [key, mode])) as Record<FieldKey, typeof mode>).strict(),
  structuredAbstract: structuredAbstractRulesSchema.default(defaultStructuredAbstractRules),
  declarationTexts: declarationTextsSchema.default(defaultDeclarationTexts),
}).strict().superRefine((config, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (config.modules.SUBMISSIONS && !config.stages.ABSTRACT.enabled && !config.stages.FULL_TEXT.enabled) error('Bildiri modülü en az özet veya tam metin aşaması ister.');
  if (config.stages.ABSTRACT.enabled && config.fields.abstract === 'HIDDEN') error('Özet aşaması açıkken özet alanı görünür olmalı.');
  if (!config.stages.ABSTRACT.enabled && (config.fields.abstract !== 'HIDDEN' || config.fields.keywords !== 'HIDDEN')) error('Kapalı özet aşamasının alanları gizli olmalı.');
  if (config.stages.FULL_TEXT.enabled && config.fields.file === 'HIDDEN') error('Tam metin aşaması açıkken dosya alanı görünür olmalı.');
  if (!config.stages.FULL_TEXT.enabled && config.fields.file !== 'HIDDEN') error('Tam metin aşaması kapalıyken dosya alanı gizli olmalı.');
  if (!config.stages.PARTICIPATION.enabled && (config.fields.presentationMode !== 'HIDDEN' || config.fields.audience !== 'HIDDEN')) error('Sunum aşaması kapalıyken sunum ve statü alanları gizli olmalı.');
  if (config.modules.REGISTRATION && config.stages.PAYMENT.enabled && config.modules.SUBMISSIONS && (!config.stages.PARTICIPATION.enabled || config.fields.presentationMode !== 'REQUIRED' || config.fields.audience !== 'REQUIRED')) error('Ücretli bildiri kaydı sunum şeklini ve akademik statüyü gerektirir.');
  if (config.modules.REGISTRATION && config.stages.PAYMENT.enabled && config.fields.receipt === 'HIDDEN') error('Ücret aşamasında dekont alanı en az isteğe bağlı olmalı.');
  if (!config.stages.PAYMENT.enabled && config.fields.receipt !== 'HIDDEN') error('Ücretsiz kayıt dekont istemez.');
  if (config.stages.PARTICIPATION.deadline) error('Sunum bilgileri teslim aşamasının tarihini izler; ayrı son tarih kullanmaz.');
  if (stageKeys.some(key => !config.stages[key].enabled && config.stages[key].deadline)) error('Kapalı aşamanın son tarihi olamaz.');
  if (config.structuredAbstract.enabled && !config.stages[config.structuredAbstract.stage].enabled) error('Yapılandırılmış özetin seçilen teslim aşaması açık olmalı.');
});
export type CongressConfiguration = z.infer<typeof configurationSchema>;
export const profileLabels = { CLASSIC: 'Bildirili kongre', ABSTRACT_ONLY: 'Yalnız özet / ücretsiz', REGISTRATION_ONLY: 'Kayıt odaklı / ücretsiz', CUSTOM: 'Özel yapılandırma' };
export function profileConfiguration(profile: CongressConfiguration['profile'] = 'CLASSIC'): CongressConfiguration {
  const classic: CongressConfiguration = { version: 1, profile, languages: ['TR', 'EN'], theme: 'eyi', accent: '#1f4f9d', invitationFacts: emptyInvitationFacts(), modules: { SUBMISSIONS: true, REGISTRATION: true }, structuredAbstract: defaultStructuredAbstractRules(), declarationTexts: defaultDeclarationTexts(),
    stages: { ABSTRACT: { enabled: true, deadline: null }, FULL_TEXT: { enabled: true, deadline: null }, PARTICIPATION: { enabled: true, deadline: null }, PAYMENT: { enabled: true, deadline: null } },
    fields: { abstract: 'REQUIRED', keywords: 'REQUIRED', file: 'REQUIRED', authorTitle: 'REQUIRED', authorInstitution: 'OPTIONAL', authorCountry: 'OPTIONAL', presentationMode: 'REQUIRED', audience: 'REQUIRED', receipt: 'REQUIRED', studentDocument: 'OPTIONAL' } };
  if (profile === 'ABSTRACT_ONLY') { classic.modules.REGISTRATION = false; classic.stages.FULL_TEXT.enabled = false; classic.stages.PARTICIPATION.enabled = false; classic.stages.PAYMENT.enabled = false; Object.assign(classic.fields, { keywords: 'OPTIONAL', file: 'HIDDEN', authorTitle: 'OPTIONAL', presentationMode: 'HIDDEN', audience: 'HIDDEN', receipt: 'HIDDEN', studentDocument: 'HIDDEN' }); }
  if (profile === 'REGISTRATION_ONLY') { classic.modules.SUBMISSIONS = false; classic.stages.ABSTRACT.enabled = false; classic.stages.FULL_TEXT.enabled = false; classic.stages.PARTICIPATION.enabled = false; classic.stages.PAYMENT.enabled = false; Object.assign(classic.fields, { abstract: 'HIDDEN', keywords: 'HIDDEN', file: 'HIDDEN', authorTitle: 'OPTIONAL', presentationMode: 'HIDDEN', audience: 'HIDDEN', receipt: 'HIDDEN', studentDocument: 'HIDDEN' }); }
  return classic;
}
export function effectiveConfiguration(value: unknown): CongressConfiguration {
  // Null means the existing P03 congress flow, with no new deadline assumptions.
  return value == null ? profileConfiguration() : configurationSchema.parse(value);
}
export function clearTemplateDates(config: CongressConfiguration): CongressConfiguration {
  const copy = structuredClone(config); stageKeys.forEach(key => { copy.stages[key].deadline = null; }); return copy;
}
export function setStage(config: CongressConfiguration, key: StageKey, enabled: boolean) {
  const copy = structuredClone(config); copy.profile = 'CUSTOM'; copy.stages[key] = { enabled, deadline: enabled ? copy.stages[key].deadline : null };
  if (key === 'ABSTRACT') { copy.fields.abstract = enabled ? 'REQUIRED' : 'HIDDEN'; copy.fields.keywords = enabled ? 'OPTIONAL' : 'HIDDEN'; }
  if (key === 'FULL_TEXT') copy.fields.file = enabled ? 'REQUIRED' : 'HIDDEN';
  if (key === 'PARTICIPATION') { copy.fields.presentationMode = enabled ? 'REQUIRED' : 'HIDDEN'; copy.fields.audience = enabled ? 'REQUIRED' : 'HIDDEN'; }
  if (key === 'PAYMENT') copy.fields.receipt = enabled ? 'REQUIRED' : 'HIDDEN';
  if (!enabled && copy.structuredAbstract.stage === key) copy.structuredAbstract.enabled = false;
  return copy;
}
export const feeSchema = z.object({ presenter: z.number().int().min(0).max(1000000), student: z.number().int().min(0).max(1000000), listener: z.number().int().min(0).max(1000000), currency: z.enum(['TRY', 'EUR', 'USD']) }).strict();
export type FeeSetup = z.infer<typeof feeSchema>;
export const eventSettingsSchema = z.object({
  name: z.string().trim().min(3).max(180), year: z.number().int().min(2000).max(2100),
  eventStartsAt: date, eventEndsAt: date, earlyDeadline: date, lateDeadline: date,
  bankName: z.string().trim().max(120), bankAccountHolder: z.string().trim().max(180), bankIban: z.string().trim().max(50), bankBranch: z.string().trim().max(120),
  configuration: configurationSchema, fees: feeSchema,
}).strict().superRefine((input, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (Boolean(input.eventStartsAt) !== Boolean(input.eventEndsAt) || (input.eventStartsAt && input.eventEndsAt && new Date(input.eventEndsAt) < new Date(input.eventStartsAt))) error('Etkinlik başlangıç ve bitiş tarihlerini sıralı girin.');
  if (input.earlyDeadline && input.lateDeadline && new Date(input.earlyDeadline) > new Date(input.lateDeadline)) error('Erken kayıt tarihi son kayıt tarihinden sonra olamaz.');
  if (input.configuration.modules.REGISTRATION && input.configuration.stages.PAYMENT.enabled && (!input.bankName || !input.bankAccountHolder || !input.bankIban)) error('Ücretli kayıt için banka, hesap sahibi ve IBAN bilgisi gerekli.');
});
export type EventSettings = z.infer<typeof eventSettingsSchema>;
export function configurationSummary(config: CongressConfiguration) {
  const submissionFields = fieldKeys.filter(k => !['receipt','studentDocument'].includes(k));
  const requiredSubmission = config.modules.SUBMISSIONS ? submissionFields.filter(k => config.fields[k] === 'REQUIRED').map(k => fieldLabels[k]) : [];
  return [config.modules.SUBMISSIONS ? 'Bildiri menüsü ve formu açık' : 'Bildiri menüsü ve formu kapalı', config.modules.REGISTRATION ? 'Kayıt menüsü ve formu açık' : 'Kayıt menüsü ve formu kapalı',
    `İstenen aşamalar: ${stageKeys.filter(k => config.stages[k].enabled && (k === 'PAYMENT' ? config.modules.REGISTRATION : config.modules.SUBMISSIONS)).map(k => stageLabels[k]).join(', ') || 'Yok'}`,
    config.modules.SUBMISSIONS ? `Bildiri için asgari bilgi: başlık, yazar adı, e-posta ve tek sunan yazar. Ek zorunlu alanlar: ${requiredSubmission.join(', ') || 'Yok'}` : 'Bildiri başvurusu alınmaz.',
    config.modules.REGISTRATION ? `Kayıt için asgari bilgi: doğrulanmış e-posta, ad ve dinleyici türü/günü veya kabul edilmiş bildiri seçimi. Öğrenci belgesi: ${modeLabels[config.fields.studentDocument]}.` : 'Kayıt alınmaz.',
    config.modules.REGISTRATION && config.stages.PAYMENT.enabled ? `Tarifeler uygulanır. Dekont: ${modeLabels[config.fields.receipt]}; pozitif tutarda bu koşul aranır.` : 'Ücret/dekont aşaması kapalı; kayıt toplamı sıfırdır.',
    config.structuredAbstract.enabled ? `Yapılandırılmış özet: ${stageLabels[config.structuredAbstract.stage]} aşamasında; Amaç, Yöntem, Bulgular ve Sonuç için TR/EN gereksinimleri uygulanır.` : 'Özet için mevcut serbest metin düzeni korunur.',
    `Bilimsel tema (TR / EN): ${config.invitationFacts.theme.tr || 'Belirtilmemiş'} / ${config.invitationFacts.theme.en || 'Not specified'}. Katılım biçimi: ${config.invitationFacts.participationMode ? participationModeLabels[config.invitationFacts.participationMode].tr : 'Belirtilmemiş'}.`,
    'Gönderimde görülen beyan metni ve etkin kurallar sürümü saklanır; eski başvurulara onay eklenmez.',
    'Yönetim panelinde seçili kongrenin açık modülleri görünür; yapılandırma ve ekip yönetimi kullanılabilir.' ];
}
