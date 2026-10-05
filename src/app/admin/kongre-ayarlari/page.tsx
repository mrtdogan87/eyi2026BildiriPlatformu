import { requirePage } from '@/platform/context';
import { congressSettings } from '@/modules/congress/service';
import { CongressSetup } from '@/components/admin/congress-setup';
export const dynamic = 'force-dynamic';
export default async function Page() { const context = await requirePage('settings'); return <main className="page-shell"><section className="hero"><h1>Kongre yapılandırması</h1><p>{context.congress.name}</p></section><section className="card platform-card"><CongressSetup initial={await congressSettings()}/></section></main>; }
