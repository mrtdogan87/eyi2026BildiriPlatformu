import { requirePage } from '@/platform/context';
import { listMembers } from '@/modules/identity/service';
import { MemberControls } from '@/components/admin/platform-controls';
export const dynamic = 'force-dynamic';
export default async function TeamPage() { const context = await requirePage('members'); return <main className="page-shell"><section className="hero"><h1>Ekip ve roller</h1><p>{context.congress.name}</p></section><section className="card platform-card"><h2>Kongre ekibine davet</h2><MemberControls members={await listMembers()} /></section></main>; }
