import Link from 'next/link';
import {interventionOptions} from '@/modules/platform-management/service';
import {managementPage} from '@/modules/platform-management/page';
import {RecordDirectory} from '@/components/admin-ui/record-directory';
import {StartIntervention} from '@/components/platform-management/intervention';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params,p=await managementPage(()=>interventionOptions(id));return <main className="page-shell"><header className="hero"><h1>Kongreye müdahale</h1><p>{p.organization.name} · Destek vereceğiniz kongreyi seçin ve gerekçeyi yazın.</p></header><p><Link href="/admin/kurumlar">Kurumlara dön</Link></p><RecordDirectory label="Kongre" search records={p.congresses.map(c=>({id:c.id,title:c.name,subtitle:p.organization.name,state:c.closedAt?'Kapanmış':'Yönetim açık',detail:<StartIntervention congress={c} organization={p.organization}/>}))}/>{!p.congresses.length&&<section className="card"><h2>Bu kurumda kongre yok</h2><p>Kurum yöneticisi kendi hesabıyla kongre oluşturabilir. Kurumun sorumlusunu ve erişimlerini Kurumlar ekranından düzenleyebilirsiniz.</p></section>}</main>;}
