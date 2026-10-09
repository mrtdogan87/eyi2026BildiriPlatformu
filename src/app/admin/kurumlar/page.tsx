import Link from 'next/link';
import {listOrganizations,managementOptions} from '@/modules/platform-management/service';
import {responsibleSummary,organizationAccessLabel} from '@/modules/platform-management/account-state.mjs';
import {managementPage} from '@/modules/platform-management/page';
import {OrganizationForm} from '@/components/platform-management/controls';
import {Workspace,WorkspacePanel} from '@/components/admin-ui/workspace';
import {RecordDirectory} from '@/components/admin-ui/record-directory';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{institution?:string}>}){
 const params=await searchParams,options=await managementPage(managementOptions),rows=await listOrganizations();
 return <main className="page-shell"><header className="hero"><h1>Kurumlar</h1><p>{options.platformAdmin?'Platformdaki kurumlar':'Yetkili olduğunuz kurumlar'} · Sorumlu atamak isteğe bağlıdır.</p></header>
  <Workspace label="Kurum yönetimi"><WorkspacePanel id="institutions" label="Kurum listesi">
   <RecordDirectory key={params.institution??'institutions'} label="Kurum" search preferInitialSelection={!!params.institution} initialSelected={rows.some(o=>o.id===params.institution)?params.institution:null} records={rows.map(o=>({id:o.id,title:o.name,subtitle:options.platformAdmin?'Kurum yönetimi':o._count.congresses+' kongre',state:responsibleSummary(o.memberships),detail:<>
    <h3>Kurum sorumluları</h3>
    {o.memberships.length?o.memberships.map(m=><div key={m.id}><p><strong>{m.user.name}</strong> · {m.account.label}</p><p className="ui-muted">{organizationAccessLabel({organizer:true,active:m.active})}</p></div>):<p>Henüz kurum yöneticisi atanmadı.</p>}
    <div className="ui-actions">
     {o.memberships.length>0&&<Link className="button secondary" href={'/admin/kullanicilar?organization='+o.id}>Sorumlu ve erişimleri aç</Link>}
     <Link className="button secondary" href={'/admin/kullanicilar?organization='+o.id+'&invite=1'}>{o.memberships.length?'Yeni sorumlu davet et':'Sorumlu ata'}</Link>
     {options.platformAdmin?<Link className="button secondary" href={'/admin/kurumlar/'+o.id+'/mudahele'}>Kongreye müdahale</Link>:<Link className="button primary" href={'/admin/kongreler?organization='+o.id}>Kurumun kongreleri</Link>}
    </div>
    {options.platformAdmin&&<details className="ui-detail"><summary>Kurum adını düzenle</summary><div><OrganizationForm initial={{id:o.id,name:o.name}}/></div></details>}
   </>}))}/>
  </WorkspacePanel>{options.platformAdmin&&<WorkspacePanel id="create" label="Yeni kurum"><section className="card"><h2>Kurum oluştur</h2><OrganizationForm/></section></WorkspacePanel>}</Workspace>
 </main>;
}
