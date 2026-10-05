import type {CSSProperties} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requirePage,moduleEnabled} from '@/platform/context';
import {AccessError} from '@/platform/http';
import {cmsPreview} from '@/modules/cms/service';
import {effectiveConfiguration} from '@/modules/congress/configuration';
import {readableAccent} from '@/modules/site/configuration';
import {CmsBlocks} from '@/components/cms/blocks';
export const dynamic='force-dynamic';
export const metadata={title:'Özel CMS önizlemesi',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{lang?:string;revision?:string}>}){await requirePage('cms','CMS');const {id}=await params;const query=await searchParams;let data;try{data=await cmsPreview(id,query.revision);}catch(e){if(e instanceof AccessError&&e.status===404)notFound();throw e;}const lang=query.lang==='en'?'en':'tr';const t=data.document.translations[lang];const workflow=effectiveConfiguration(data.congress.configuration);const modules={SUBMISSIONS:await moduleEnabled(data.congress.id,'SUBMISSIONS'),REGISTRATION:await moduleEnabled(data.congress.id,'REGISTRATION')};return <div className="congress-site cms-preview-page" lang={lang} style={{'--primary':readableAccent(workflow.accent),'--accent':workflow.accent} as CSSProperties}><aside className="cms-private-banner"><strong>Özel önizleme · {query.revision?'Geçmiş sürüm':'Kaydedilmiş taslak'}</strong><span>Bu adres kongre yetkisi ve CMS açıkken çalışır.</span><Link href={`/admin/cms/${id}`}>Editöre dön</Link><Link href={`/admin/cms/${id}/onizleme?lang=${lang==='tr'?'en':'tr'}${query.revision?'&revision='+encodeURIComponent(query.revision):''}`}>{lang==='tr'?'EN önizleme':'TR önizleme'}</Link></aside><main id="cms-preview-content" tabIndex={-1} className="cms-public site-width"><div className="cms-page-heading"><p className="site-eyebrow">{data.congress.name}</p><h1>{t.title||'Halka açık başlık henüz girilmedi'}</h1>{!t.enabled&&<p className="cms-translation-note">Bu dil henüz yayın için seçilmedi.</p>}<p className="cms-lead">{t.lead}</p></div><CmsBlocks blocks={t.blocks} media={data.media.filter(m=>m.active)} slug={data.congress.slug} locale={lang} modules={modules} pages={data.pages}/></main></div>;}
