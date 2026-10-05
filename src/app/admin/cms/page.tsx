import {requirePage} from '@/platform/context';
import {listCmsPages} from '@/modules/cms/service';
import {CmsPageList} from '@/components/cms/page-list';
export const dynamic='force-dynamic';
export default async function Page(){const c=await requirePage('cms','CMS');return <main className="page-shell"><section className="hero"><h1>CMS sayfaları</h1><p>{c.congress.name} · Taslak, yayın ve sürümler</p></section><section className="card platform-card"><CmsPageList initial={await listCmsPages()}/></section></main>;}
