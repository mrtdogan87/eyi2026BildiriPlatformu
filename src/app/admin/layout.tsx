import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { actorSession, availableContexts } from '@/platform/context';
import { ContextSelector } from '@/components/admin/platform-controls';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await actorSession();
  const contexts = session ? await availableContexts(session.userId) : [];
  const canManageInstitutions = session && (session.user.platformAdmin || await prisma.organizationMembership.count({where:{userId:session.userId,active:true,organizer:true}})>0);
  const settings = session ? await prisma.platformSettings.findUnique({where:{id:'platform'},select:{displayName:true}}) : null;
  return <>{session && <header className="platform-bar"><div>
    <Link href={session.user.platformAdmin?'/admin/platform':'/admin/panel'}><strong>{session.user.platformAdmin?'Platform Yönetimi':'Kongre Yönetimi'}</strong></Link>
    <p>{settings?.displayName??'Kongre Yönetim Platformu'}</p>
    <nav className="management-nav" aria-label="Yönetim gezinmesi">
      {session.user.platformAdmin&&<Link href="/admin/platform">Platform yönetimine dön</Link>}
      <Link href="/admin/kongreler">Kongrelerim</Link>
      {canManageInstitutions&&<><Link href="/admin/kurumlar">Kurumlar</Link><Link href="/admin/kullanicilar">Kullanıcılar ve yetkiler</Link></>}
    </nav><p>{session.user.name} · {session.user.email}</p>
  </div><ContextSelector contexts={contexts.map(c=>({id:c.id,name:c.name,organization:c.organization.name}))} selected={contexts.some(c=>c.id===session.congressId)?session.congressId:null}/></header>}{children}</>;
}
