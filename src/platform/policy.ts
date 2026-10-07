import type { CongressRole } from '@prisma/client';
export type Action = 'archive.read' | 'archive.manage' | 'archive.export' | 'context' | 'submissions.read' | 'submissions.status' | 'submissions.delete' | 'registrations.read' | 'registrations.delete' | 'settings' | 'members' | 'modules' | 'audit' | 'own' | 'cms' | 'feedback' | 'communications' | 'communication.manage' | 'worklist' | 'submissions.correct' | 'payments.read' | 'payments.manage' | 'reviews.read' | 'reviews.manage' | 'reviews.perform' | 'program.read' | 'program.manage' | 'program.perform' | 'activities.read' | 'activities.manage' | 'certificates.read' | 'certificates.manage' | 'attendance.perform' | 'awards.read' | 'awards.manage' | 'awards.perform' | 'promotion.read' | 'promotion.manage' | 'publications.read' | 'publications.manage';
export const roleLabels: Record<CongressRole, string> = {
  ORGANIZER: 'Organizatör', SECRETARY: 'Sekreter', CONTENT_EDITOR: 'İçerik editörü',
  REVIEWER: 'Hakem', SESSION_CHAIR: 'Oturum başkanı', PARTICIPANT: 'Katılımcı',
};
export function allows(role: CongressRole | 'PLATFORM_ADMIN', action: Action) {
  if (role === 'PLATFORM_ADMIN' || role === 'ORGANIZER') return true;
  if (action === 'context' || action === 'own') return true;
  if (action === 'archive.read') return role === 'CONTENT_EDITOR' || role === 'SECRETARY';
  if (action === 'archive.export') return role === 'CONTENT_EDITOR' || role === 'SECRETARY';
  if (action === 'archive.manage') return false;
  if (action === 'publications.read' || action === 'publications.manage') return role === 'CONTENT_EDITOR' || role === 'SECRETARY';
  if (action === 'promotion.read' || action === 'promotion.manage') return role === 'CONTENT_EDITOR' || role === 'SECRETARY';
  if (action === 'awards.perform') return role === 'REVIEWER';
  if (action === 'attendance.perform') return role === 'SESSION_CHAIR' || role === 'SECRETARY';
  if (action === 'program.perform') return role === 'SESSION_CHAIR';
  if (action === 'reviews.perform') return role === 'REVIEWER';
  if (action === 'feedback') return role === 'SECRETARY';
  if (action === 'communications') return role === 'SECRETARY';
  if (action === 'worklist') return role === 'SECRETARY';
  if (action === 'cms') return role === 'CONTENT_EDITOR';
  return role === 'SECRETARY' && ['submissions.read', 'submissions.status', 'submissions.correct', 'registrations.read', 'payments.read', 'payments.manage', 'reviews.read', 'reviews.manage', 'program.read', 'program.manage', 'activities.read', 'activities.manage', 'certificates.read', 'certificates.manage', 'awards.read', 'awards.manage'].includes(action);
}
export const moduleCatalog = {
  ARCHIVE: {label:'Kapanış ve kalıcı arşiv',implemented:true},
  SUBMISSIONS: { label: 'Bildiri gönderimi', implemented: true },
  REGISTRATION: { label: 'Kayıt ve ücretler', implemented: true },
  CMS: { label: 'Sayfalar ve medya (CMS)', implemented: true },
  REVIEWS: { label: 'Hakem değerlendirmesi', implemented: true },
  PROGRAM: { label: 'Bilimsel program', implemented: true },
  ATTENDANCE: { label: 'Oturum yoklaması', implemented: true },
  ACTIVITIES: { label: 'Workshop ve sosyal katılım', implemented: true },
  CERTIFICATES: { label: 'Belgeler', implemented: true },
  PUBLICATIONS: {label:'Tam metin ve yayın onayları',implemented:true},
  PROMOTION: {label:'Davet ve afiş çıktıları',implemented:true},
  AWARDS: {label:'Ödül başvuruları ve jüri',implemented:true},
};
