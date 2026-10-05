import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {publicCmsPage,publishedCmsPages} from '@/modules/cms/public';
import {selectTranslation} from '@/modules/cms/configuration';
import {publicSite} from '@/integrations/congress/site-data';
import {getLocale} from '@/lib/i18n/server';
import {CmsBlocks} from '@/components/cms/blocks';
export const dynamic='force-dynamic';
type Props={params:Promise<{congressSlug:string;pageSlug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {congressSlug,pageSlug}=await params;const {document}=await publicCmsPage(congressSlug,pageSlug);const {workflow}=await publicSite(congressSlug);const t=selectTranslation(document,await getLocale(workflow.languages));return {title:t?.title,description:t?.lead};}
export default async function Page({params}:Props){const {congressSlug,pageSlug}=await params;const [{document,media},{workflow,modules}]=await Promise.all([publicCmsPage(congressSlug,pageSlug),publicSite(congressSlug)]);const locale=await getLocale(workflow.languages);const t=selectTranslation(document,locale);if(!t)notFound();const pages=await publishedCmsPages(congressSlug,locale);return <main id="congress-content" tabIndex={-1} className="cms-public site-width" lang={t.locale}><div className="cms-page-heading"><p className="site-eyebrow">{locale==='en'?'Congress information':'Kongre bilgileri'}</p><h1>{t.title}</h1>{t.locale!==locale&&<p className="cms-translation-note">{locale==='en'?'This page is currently available in Turkish.':'Bu sayfa şu anda İngilizce olarak sunuluyor.'}</p>}{t.lead&&<p className="cms-lead">{t.lead}</p>}</div><CmsBlocks blocks={t.blocks} media={media} slug={congressSlug} locale={t.locale} modules={modules} pages={pages.map(p=>p.slug)}/></main>;}
