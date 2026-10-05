import {requirePage} from '@/platform/context';
import {notFound} from 'next/navigation';
import {AccessError} from '@/platform/http';
import {cmsPageEditor} from '@/modules/cms/service';
import {CmsPageEditor} from '@/components/cms/page-editor';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){await requirePage('cms','CMS');const {id}=await params;let initial;try{initial=await cmsPageEditor(id);}catch(e){if(e instanceof AccessError&&e.status===404)notFound();throw e;}return <main className="page-shell"><section className="hero"><h1>Sayfa editörü</h1><p>{initial.page.internalName} · {initial.congress.name}</p></section><section className="card platform-card"><CmsPageEditor key={initial.congress.id+':'+initial.page.id} initial={initial}/></section></main>;}
