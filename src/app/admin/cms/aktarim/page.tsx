import {requirePage} from '@/platform/context';
import {eyiSourceInventory} from '@/modules/cms/eyi-import';
import {EyiImport} from '@/components/cms/eyi-import';
export const dynamic='force-dynamic';
export default async function Page(){const c=await requirePage('cms','CMS');return <main className="page-shell"><section className="hero"><h1>EYİ 2026 aktarım kaynakları</h1><p>{c.congress.name} · Tarihsel referans, kaynak ve dosya denetimi</p></section><section className="card platform-card"><EyiImport initial={eyiSourceInventory()}/></section></main>;}
