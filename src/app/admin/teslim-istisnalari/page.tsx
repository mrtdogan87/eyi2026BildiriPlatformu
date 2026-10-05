import { requirePage } from '@/platform/context';
import { listDeliveryExceptions } from '@/modules/congress/delivery';
import { DeliveryExceptions } from '@/components/admin/delivery-exceptions';
export const dynamic = 'force-dynamic';
export default async function Page() { const context = await requirePage('settings'); const records = await listDeliveryExceptions(); return <main className="page-shell"><section className="hero"><h1>Süreli teslim istisnaları</h1><p>{context.congress.name}</p></section><section className="card platform-card"><DeliveryExceptions records={records.map(record => ({ ...record, startsAt:record.startsAt.toISOString(), expiresAt:record.expiresAt.toISOString(), revokedAt:record.revokedAt?.toISOString() ?? null }))}/></section></main>; }
