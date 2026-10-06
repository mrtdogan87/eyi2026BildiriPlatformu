import Link from 'next/link';
import { requirePage } from '@/platform/context';
import { communicationOverview } from '@/modules/communication/admin';
import { CommunicationManager } from '@/components/communication/manager';
export const dynamic = 'force-dynamic';
export default async function CommunicationPage() {
  const c = await requirePage('communications');
  return <main className="page-shell"><section className="hero"><h1>E-posta ve teslim sorunları</h1><p>{c.congress.name}</p></section><p><Link href="/admin/panel">← Yönetim paneli</Link></p><CommunicationManager initial={await communicationOverview()} /></main>;
}
