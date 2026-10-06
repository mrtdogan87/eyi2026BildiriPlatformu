import Link from 'next/link';
import { requirePage } from '@/platform/context';
import { allows } from '@/platform/policy';
import { bankOverview } from '@/integrations/congress/payments';
import { BankManager } from '@/components/payments/bank-manager';
export const dynamic = 'force-dynamic';
export default async function PaymentsPage() {
  const c = await requirePage('payments.read', 'REGISTRATION');
  return <main className="page-shell admin-page-shell"><section className="hero admin-hero"><div><Link href="/admin/panel">← Kongre paneli</Link><h1>Ödeme doğrulama ve ekstre</h1><p>{c.congress.name}</p></div></section><BankManager initial={await bankOverview()} canManage={allows(c.role, 'payments.manage')}/></main>;
}
