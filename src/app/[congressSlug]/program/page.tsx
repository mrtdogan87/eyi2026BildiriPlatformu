import { publicProgram } from '@/integrations/congress/program';
import { getLocale } from '@/lib/i18n/server';
import { publicSite } from '@/integrations/congress/site-data';
import { PublicProgram } from '@/components/program/public';
import { AccessError } from '@/platform/http';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function ProgramPage({params}:{params:Promise<{congressSlug:string}>}){const {congressSlug}=await params;const {workflow}=await publicSite(congressSlug),locale=await getLocale(workflow.languages);let data;try{data=await publicProgram(congressSlug);}catch(e){if(e instanceof AccessError&&[403,404].includes(e.status))notFound();throw e;}return <main id="congress-content" className="site-width program-page" tabIndex={-1}><PublicProgram data={data} slug={congressSlug} en={locale==='en'}/></main>;}
