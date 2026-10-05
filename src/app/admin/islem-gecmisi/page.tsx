import { requirePage } from '@/platform/context';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export default async function AuditPage() {
  const context = await requirePage('audit'); const entries = await prisma.auditLog.findMany({ where: { congressId: context.congress.id }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <main className="page-shell"><section className="hero"><h1>İşlem geçmişi</h1><p>{context.congress.name} · son 100 işlem</p></section><section className="card platform-card"><div className="platform-members">{entries.map(entry => <div className="platform-member" key={entry.id}><div><strong>{entry.action}</strong><p>{entry.actor?.name ?? 'Sistem'} · {entry.createdAt.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p><p>Hedef: {entry.targetId ?? '—'}</p>{entry.detail && <pre className="audit-detail">{JSON.stringify(entry.detail, null, 2)}</pre>}</div></div>)}</div></section></main>;
}
