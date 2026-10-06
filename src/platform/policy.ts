import type { CongressRole } from '@prisma/client';
export type Action = 'context' | 'submissions.read' | 'submissions.status' | 'submissions.delete' | 'registrations.read' | 'registrations.delete' | 'settings' | 'members' | 'modules' | 'audit' | 'own' | 'cms' | 'feedback';
export const roleLabels: Record<CongressRole, string> = {
  ORGANIZER: 'Organizatör', SECRETARY: 'Sekreter', CONTENT_EDITOR: 'İçerik editörü',
  REVIEWER: 'Hakem', SESSION_CHAIR: 'Oturum başkanı', PARTICIPANT: 'Katılımcı',
};
export function allows(role: CongressRole | 'PLATFORM_ADMIN', action: Action) {
  if (role === 'PLATFORM_ADMIN' || role === 'ORGANIZER') return true;
  if (action === 'context' || action === 'own') return true;
  if (action === 'feedback') return role === 'SECRETARY';
  if (action === 'cms') return role === 'CONTENT_EDITOR';
  return role === 'SECRETARY' && ['submissions.read', 'submissions.status', 'registrations.read'].includes(action);
}
export const moduleCatalog = {
  SUBMISSIONS: { label: 'Bildiri gönderimi', implemented: true },
  REGISTRATION: { label: 'Kayıt ve ücretler', implemented: true },
  CMS: { label: 'Sayfalar ve medya (CMS)', implemented: true },
  REVIEWS: { label: 'Hakem değerlendirmesi', implemented: false },
  PROGRAM: { label: 'Bilimsel program', implemented: false },
  CERTIFICATES: { label: 'Belgeler', implemented: false },
};
