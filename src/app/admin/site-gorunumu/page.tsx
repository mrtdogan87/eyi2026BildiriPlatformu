import { requirePage } from '@/platform/context';
import { siteSettings } from '@/modules/site/service';
import { SiteEditor } from '@/components/admin/site-editor';
export const dynamic='force-dynamic';
export default async function Page() {await requirePage('settings');const initial=await siteSettings();return <main className="page-shell"><section className="hero"><h1>Site görünümü</h1><p>{initial.name} · Ana sayfa, renk ve görseller</p></section><section className="card platform-card"><SiteEditor key={initial.slug} initial={initial}/></section></main>;}
