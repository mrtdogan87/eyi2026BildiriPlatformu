import { requirePage } from '@/platform/context';
import { listModules } from '@/platform/modules';
import { ModuleControls } from '@/components/admin/platform-controls';
export const dynamic = 'force-dynamic';
export default async function ModulesPage() { const context = await requirePage('modules'); return <main className="page-shell"><section className="hero"><h1>Modüller</h1><p>{context.congress.name}</p></section><section className="card platform-card"><ModuleControls modules={await listModules()} /></section></main>; }
