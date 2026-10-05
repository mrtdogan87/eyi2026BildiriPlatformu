import type { CSSProperties } from 'react';
import Link from 'next/link';
import { publicSite } from '@/integrations/congress/site-data';
import { localized, readableAccent } from '@/modules/site/configuration';
import { LanguageProvider } from '@/lib/i18n/provider';
import { getLocale } from '@/lib/i18n/server';
import {publishedCmsPages} from '@/modules/cms/public';
import { SiteHeader } from '@/components/site/site-header';
export default async function CongressLayout({children,params}:{children:React.ReactNode;params:Promise<{congressSlug:string}>}) {
  const {congressSlug}=await params;const {congress,workflow,modules,site,assets}=await publicSite(congressSlug);const locale=await getLocale(workflow.languages);const name=localized(site.shortName,locale,congress.name);const primary=readableAccent(workflow.accent);const pages=await publishedCmsPages(congressSlug,locale);
  return <LanguageProvider key={locale} initialLocale={locale}><div className="congress-site" lang={locale} data-congress-theme={workflow.theme} style={{'--primary':primary,'--primary-soft':primary,'--primary-strong':primary,'--accent':workflow.accent} as CSSProperties}>
    <SiteHeader pages={pages.filter(p=>p.showInMenu).map(p=>({href:`/${congressSlug}/sayfalar/${p.slug}`,label:p.title}))} slug={congressSlug} name={name} organization={congress.organization.name} locale={locale} languages={workflow.languages} modules={modules} contact={!!site.contactEmail} logo={assets.LOGO} logoAlt={localized(site.logoAlt,locale)}/>
    {children}
    <footer className="site-footer"><div className="site-width"><div><Link href={`/${congressSlug}`}><strong>{name}</strong></Link><p>{congress.organization.name}</p></div><div>{site.contactEmail&&<a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>}<p>{locale==='en'?'Submission & participation services':'Başvuru ve katılım hizmetleri'}</p></div></div></footer>
  </div></LanguageProvider>;
}
