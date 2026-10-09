import { PasswordRecoveryRequestForm } from '@/components/admin/password-recovery-form';

export const metadata = { title: 'Parolamı unuttum · Kongre Yönetim Platformu', robots: { index: false, follow: false } };
export default function PasswordRecoveryPage() {
  return <main className="page-shell admin-page-shell"><PasswordRecoveryRequestForm /></main>;
}
