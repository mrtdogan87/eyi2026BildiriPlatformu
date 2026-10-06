import type { CongressRole } from '@prisma/client';
export type Action = 'context' | 'submissions.read' | 'submissions.status' | 'submissions.delete' | 'registrations.read' | 'registrations.delete' | 'settings' | 'members' | 'modules' | 'audit' | 'own' | 'cms' | 'feedback' | 'communications' | 'communication.manage' | 'worklist' | 'submissions.correct' | 'payments.read' | 'payments.manage' | 'reviews.read' | 'reviews.manage' | 'reviews.perform' | 'program.read' | 'program.manage' | 'program.perform' | 'activities.read' | 'activities.manage' | 'certificates.read' | 'certificates.manage' | 'attendance.perform';
export const roleLabels: Record<CongressRole, string> = {
  ORGANIZER: 'Organizatör', SECRETARY: 'Sekreter', CONTENT_EDITOR: 'İçerik editörü',
  REVIEWER: 'Hakem', SESSION_CHAIR: 'Oturum başkanı', PARTICIPANT: 'Katılımcı',
};
export function allows(role: CongressRole | 'PLATFORM_ADMIN', action: Action) {
  if (role === 'PLATFORM_ADMIN' || role === 'ORGANIZER') return true;
  if (action === 'context' || action === 'own') return true;
  if (action === 'attendance.perform') return role === 'SESSION_CHAIR' || role === 'SECRETARY';
  if (action === 'program.perform') return role === 'SESSION_CHAIR';
  if (action === 'reviews.perform') return role === 'REVIEWER';
  if (action === 'feedback') return role === 'SECRETARY';
  if (action === 'communications') return role === 'SECRETARY';
  if (action === 'worklist') return role === 'SECRETARY';
  if (action === 'cms') return role === 'CONTENT_EDITOR';
  return role === 'SECRETARY' && ['submissions.read', 'submissions.status', 'submissions.correct', 'registrations.read', 'payments.read', 'payments.manage', 'reviews.read', 'reviews.manage', 'program.read', 'program.manage', 'activities.read', 'activities.manage', 'certificates.read', 'certificates.manage'].includes(action);
}
export const moduleCatalog = {
  SUBMISSIONS: { label: 'Bildiri gönderimi', implemented: true },
  REGISTRATION: { label: 'Kayıt ve ücretler', implemented: true },
  CMS: { label: 'Sayfalar ve medya (CMS)', implemented: true },
  REVIEWS: { label: 'Hakem değerlendirmesi', implemented: true },
  PROGRAM: { label: 'Bilimsel program', implemented: true },
  ACTIVITIES: { label: 'Workshop ve sosyal katılım', implemented: true },
  CERTIFICATES: { label: 'Belgeler', implemented: true },
};
