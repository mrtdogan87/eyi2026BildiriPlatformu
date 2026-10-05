import Link from 'next/link';
import { actorSession, availableContexts } from '@/platform/context';
import { ContextSelector } from '@/components/admin/platform-controls';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await actorSession();
  const contexts = session ? await availableContexts(session.userId) : [];
  return <>{session && <header className="platform-bar"><div><Link href="/admin/panel"><strong>Kongre Yönetimi</strong></Link><p>{session.user.name} · {session.user.email}</p></div><ContextSelector contexts={contexts.map(c => ({ id: c.id, name: c.name, organization: c.organization.name }))} selected={contexts.some(c => c.id === session.congressId) ? session.congressId : null} /></header>}{children}</>;
}
