import Link from 'next/link';
import { requirePage } from '@/platform/context';
import { worklistOverview } from '@/integrations/congress/worklist';
import { WorklistManager } from '@/components/worklist/manager';
export const dynamic = 'force-dynamic';
export default async function WorklistPage() {
  const context = await requirePage('worklist');
  return <main className="page-shell"><section className="hero"><h1>Sekreterya iş listesi</h1><p>{context.congress.name}</p></section><p><Link href="/admin/panel">← Yönetim paneli</Link></p><WorklistManager initial={await worklistOverview()} /></main>;
}
