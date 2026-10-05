import {requirePage} from '@/platform/context';
import {cmsMediaLibrary} from '@/modules/cms/service';
import {CmsMediaLibrary} from '@/components/cms/media-library';
export const dynamic='force-dynamic';
export default async function Page(){const c=await requirePage('cms','CMS');return <main className="page-shell"><section className="hero"><h1>Medya kitaplığı</h1><p>{c.congress.name} · Görseller ve PDF dosyaları</p></section><section className="card platform-card"><CmsMediaLibrary key={c.congress.id} initial={await cmsMediaLibrary()}/></section></main>;}
