import { redirect } from 'next/navigation';
import { actorSession } from '@/platform/context';
import { creationOptions } from '@/modules/congress/service';
import { CongressSetup } from '@/components/admin/congress-setup';
export const dynamic = 'force-dynamic';
export default async function Page() { if (!(await actorSession())) redirect('/admin'); const options = await creationOptions(); if (!options.organizations.length && !options.canCreateOrganization) redirect('/admin/panel?denied=1'); return <main className="page-shell"><section className="hero"><h1>Yeni kongre oluştur</h1><p>{options.canCreateOrganization?'Kurumunuzu seçin veya yeni kurum oluşturun; kongrenin tarihlerini, formunu ve sürecini hazırlayın.':'Yetkili olduğunuz kurumu seçin; kongrenin tarihlerini, formunu ve sürecini hazırlayın.'}</p></section><section className="card platform-card"><CongressSetup {...options}/></section></main>; }
