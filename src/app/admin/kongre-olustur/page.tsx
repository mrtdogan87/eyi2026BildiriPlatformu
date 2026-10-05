import { redirect } from 'next/navigation';
import { actorSession } from '@/platform/context';
import { creationOrganizations, creationTemplates } from '@/modules/congress/service';
import { CongressSetup } from '@/components/admin/congress-setup';
export const dynamic = 'force-dynamic';
export default async function Page() { if (!(await actorSession())) redirect('/admin'); const organizations = await creationOrganizations(); if (!organizations.length) redirect('/admin/panel?denied=1'); return <main className="page-shell"><section className="hero"><h1>Yeni kongre oluştur</h1><p>Yeni yılın tarihlerini, formunu ve sürecini birlikte hazırlayın.</p></section><section className="card platform-card"><CongressSetup organizations={organizations} templates={await creationTemplates()}/></section></main>; }
