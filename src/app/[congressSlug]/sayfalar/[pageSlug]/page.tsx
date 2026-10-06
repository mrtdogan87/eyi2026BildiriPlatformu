import {PageLanguageAvailability} from '@/lib/i18n/provider';
import {dynamicViews} from '@/modules/content/public';
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {publicCmsPage,publishedCmsPages} from '@/modules/cms/public';
import {selectTranslation} from '@/modules/cms/configuration';
import {publicSite} from '@/integrations/congress/site-data';
import {getLocale} from '@/lib/i18n/server';
import {CmsBlocks} from '@/components/cms/blocks';
export const dynamic='force-dynamic';
type Props={params:Promise<{congressSlug:string;pageSlug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {congressSlug,pageSlug}=await params;const {document}=await publicCmsPage(congressSlug,pageSlug);const {workflow}=await publicSite(congressSlug);const locale=await getLocale();const t=workflow.languages.includes(locale==='en'?'EN':'TR')?selectTranslation(document,locale):null;return {title:t?.title,description:t?.lead};}
export default async function Page({params}:Props){const {congressSlug,pageSlug}=await params;const [{document,media},{congress,workflow,modules}]=await Promise.all([publicCmsPage(congressSlug,pageSlug),publicSite(congressSlug)]);const locale=await getLocale();const t=selectTranslation(document,locale);if(!t||!workflow.languages.includes(locale==='en'?'EN':'TR'))notFound();const pages=await publishedCmsPages(congressSlug,locale);return <main id="congress-content" tabIndex={-1} className="cms-public site-width" lang={t.locale}><PageLanguageAvailability available={(['tr','en'] as const).filter(lang=>workflow.languages.includes(lang==='en'?'EN':'TR')&&!!selectTranslation(document,lang))}/><div className="cms-page-heading"><p className="site-eyebrow">{locale==='en'?'Congress information':'Kongre bilgileri'}</p><h1>{t.title}</h1>{t.lead&&<p className="cms-lead">{t.lead}</p>}</div><CmsBlocks dynamic={await dynamicViews(congress.id,t.blocks,t.locale)} blocks={t.blocks} media={media} slug={congressSlug} locale={t.locale} modules={modules} pages={pages.flatMap(p=>[p.slug,...p.aliases])}/></main>;}
