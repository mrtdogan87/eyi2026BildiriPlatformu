import type { CongressConfiguration } from '@/modules/congress/configuration';
import { declarationDocument, validateDeclarationAcceptance, type DeclarationEntity } from '@/modules/participation/declarations';
import { ParticipationValidationError } from '@/modules/participation/rules';
import { AccessError } from '@/platform/http';

export function acceptedDeclaration(raw: unknown, configuration: CongressConfiguration, entityType: DeclarationEntity) {
  const locale = typeof raw === 'object' && raw !== null && 'declarationLocale' in raw && raw.declarationLocale === 'en' ? 'en' : 'tr';
  const document = declarationDocument(configuration, entityType, locale);
  try { validateDeclarationAcceptance(raw, document); }
  catch (error) { if (error instanceof ParticipationValidationError) throw new AccessError(error.status, error.message); throw error; }
  return { locale: document.locale, version: document.version, texts: document.items, rules: { configuration, authorSubmissionLimit: 2 } };
}
