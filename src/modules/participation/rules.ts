import { z } from 'zod';

export const abstractSectionKeys = ['purpose', 'method', 'findings', 'conclusion'] as const;
export type AbstractSection = typeof abstractSectionKeys[number];
export const abstractSectionLabels = {
  TR: { purpose: 'Amaç', method: 'Yöntem', findings: 'Bulgular', conclusion: 'Sonuç' },
  EN: { purpose: 'Purpose', method: 'Method', findings: 'Findings', conclusion: 'Conclusion' },
};
const sectionRule = z.object({ required: z.boolean(), maxWords: z.number().int().min(1).max(5000) }).strict();
const sections = z.object({ purpose: sectionRule, method: sectionRule, findings: sectionRule, conclusion: sectionRule }).strict();
export const structuredAbstractRulesSchema = z.object({
  enabled: z.boolean(), stage: z.enum(['ABSTRACT', 'FULL_TEXT']), sections: z.object({ TR: sections, EN: sections }).strict(),
}).strict();
export function defaultStructuredAbstractRules(): z.infer<typeof structuredAbstractRulesSchema> {
  const language = () => ({ purpose: { required: true, maxWords: 150 }, method: { required: true, maxWords: 150 }, findings: { required: true, maxWords: 150 }, conclusion: { required: true, maxWords: 150 } });
  return { enabled: false, stage: 'ABSTRACT', sections: { TR: language(), EN: language() } };
}
export const declarationKeys = ['accuracy', 'submissionLimit', 'coauthorApproval', 'personalDataConsent', 'registrationPresentationConsent'] as const;
export type DeclarationKey = typeof declarationKeys[number];
const declarationText = z.string().trim().min(1).max(2000);
const declarationLanguage = z.object({ accuracy: declarationText, submissionLimit: declarationText, coauthorApproval: declarationText, personalDataConsent: declarationText, registrationPresentationConsent: declarationText }).strict();
export const declarationTextsSchema = z.object({ TR: declarationLanguage, EN: declarationLanguage }).strict();
export function defaultDeclarationTexts(): z.infer<typeof declarationTextsSchema> {
  return {
    TR: {
      accuracy: 'Bu formda sunduğum bilgi ve belgelerin doğru, eksiksiz ve güncel olduğunu beyan ederim.',
      submissionLimit: 'Bir araştırmacının bu kongrede en fazla iki bildiride yazar olabileceği kuralını okudum ve kabul ediyorum.',
      coauthorApproval: 'Çalışmada adı geçen diğer yazarların başvurudan ve içerikten haberdar olduğunu ve gerekli onaylarını aldığımı beyan ederim.',
      personalDataConsent: 'Bu formda sunduğum kişisel verilerin kongre başvuru ve kayıt süreçlerinin yürütülmesi amacıyla işlenmesine ilişkin beyanımı onaylıyorum.',
      registrationPresentationConsent: 'Bu kongre için açık olan kayıt ve katılım aşamalarının formda belirtilen koşullarını okudum ve kabul ediyorum.',
    },
    EN: {
      accuracy: 'I declare that the information and documents I provide in this form are accurate, complete and up to date.',
      submissionLimit: 'I have read and accept that a researcher may be an author of at most two papers at this congress.',
      coauthorApproval: 'I declare that the other authors are aware of this application and its content and that I have obtained their necessary approval.',
      personalDataConsent: 'I confirm my declaration concerning the processing of the personal data supplied in this form for congress application and registration processes.',
      registrationPresentationConsent: 'I have read and accept the conditions shown in this form for the registration and participation stages enabled for this congress.',
    },
  };
}
export class ParticipationValidationError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
