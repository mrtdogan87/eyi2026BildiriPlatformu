import { PasswordResetForm } from '@/components/admin/password-recovery-form';

export const metadata = { title: 'Parola yenile · Kongre Yönetim Platformu', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default function PasswordResetPage() {
  return <main className="page-shell admin-page-shell"><PasswordResetForm /></main>;
}
