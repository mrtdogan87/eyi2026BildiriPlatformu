import Link from 'next/link';
import {redirect} from 'next/navigation';
import {prisma} from '@/lib/prisma';
import {actorSession,requireContext} from '@/platform/context';
import {AccessError} from '@/platform/http';
import {allows,type Action} from '@/platform/policy';
import {congressDashboard} from '@/integrations/congress/dashboard';
import {creationOrganizations} from '@/modules/congress/service';
import {congressNavigation,visibleNavigation} from '@/components/admin-ui/navigation.mjs';
import {EmptyState} from '@/components/admin-ui/workspace';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{denied?:string}>}){
  const session=await actorSession();if(!session)redirect('/admin');if(session.user.platformAdmin&&!session.congressId)redirect('/admin/platform');
  let context;try{context=await requireContext();}catch(error){if(!(error instanceof AccessError))throw error;}
  if(!context)return <main className="page-shell"><h1>Kongre seçin</h1><EmptyState title="Önce çalışma kongrenizi seçin">Üst alandaki Kongre seç düğmesiyle erişiminiz olan kongreyi açın. Erişiminiz kaldırıldıysa kongre ekibiyle görüşün.</EmptyState><p><Link className="button primary" href="/admin/kongreler">Kongrelerimi aç</Link></p></main>;
  const enabled=await prisma.congressModule.findMany({where:{congressId:context.congress.id,enabled:true},select:{key:true}}),actions=[...new Set(congressNavigation.flatMap(g=>g.items.map(i=>i[2])))].filter(action=>allows(context.roles,action as Action)),groups=visibleNavigation(actions,enabled.map(m=>m.key),Boolean(context.congress.closedAt)),links=groups.flatMap(g=>g.items);
  const priority=['hakemlik/gorevler','program/gorevler','oduller/juri','is-listesi','bildiriler','kayitlar','cms','belgeler','kayitlarim'],shortcuts=priority.map(path=>links.find(link=>link[0]===path)).filter((link):link is readonly string[]=>Boolean(link)).slice(0,4),tasks=await congressDashboard(context);
  const canCreate=session.user.platformAdmin||(await creationOrganizations()).length>0;
  return <main className="page-shell admin-page-shell"><header className="hero"><h1>Genel bakış</h1><p>{context.congress.name} · Yetki kaynağı: {context.accessSource==='PLATFORM'?'Platform':context.accessSource==='ORGANIZATION'?'Kurum yöneticiliği':'Kongre üyeliği'}</p></header>{(await searchParams).denied&&<p role="alert" className="error">İstediğiniz işlem için yetkiniz yok veya ilgili modül kapalı.</p>}<section className="card platform-card"><h2>Bugün ilgilenmeniz gerekenler</h2>{context.congress.closedAt?<p>Kongre kapalı. Arşivdeki kayıtları inceleyebilir; yetkiniz varsa arşiv ekranından yeniden açabilirsiniz.</p>:tasks.length?<div className="ui-task-list">{tasks.map(task=><Link href={task.href} key={task.href}><span>{task.label}</span><strong>{task.count}</strong><span aria-hidden="true">→</span></Link>)}</div>:<EmptyState title="Bu kapsamda bekleyen iş özeti yok">Görevlerinize aşağıdaki kısa yollardan veya menüden ulaşabilirsiniz.</EmptyState>}</section><section className="ui-shortcuts"><h2>Hızlı erişim</h2><div className="ui-actions">{shortcuts.map(([path,label],index)=><Link key={path} className={`button ${index===0?'primary':'secondary'}`} href={'/admin/'+path}>{label}</Link>)}</div></section><details className="ui-detail"><summary>Kongre ve erişim bilgileri</summary><div><p>{context.congress.organization.name} / {context.congress.name}</p><p>Diğer yetkili çalışma alanları soldaki menüde bulunur. Kapalı modüller menüde görünmez; yetkili yönetici Modüller ekranından durumlarını inceleyebilir.</p><div className="ui-actions"><Link className="button secondary" href={`/${context.congress.slug}`}>Katılımcı sayfasını aç</Link>{canCreate&&<Link href="/admin/kongre-olustur">Yeni kongre oluştur</Link>}</div></div></details></main>;
}
