import { notFound } from 'next/navigation';
import { AccessError } from '@/platform/http';
import { publicSite } from '@/integrations/congress/site-data';
import { publicActivities } from '@/integrations/congress/activities';
import { getLocale } from '@/lib/i18n/server';
import { PublicActivities } from '@/components/activities/public';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ congressSlug: string }> }) { const { congressSlug } = await params; const { workflow } = await publicSite(congressSlug); const locale = await getLocale(workflow.languages); let data; try { data = await publicActivities(congressSlug); } catch (e) { if (e instanceof AccessError && [403,404].includes(e.status)) notFound(); throw e; } return <main id="congress-content" className="site-width program-page" tabIndex={-1}><PublicActivities initial={data} slug={congressSlug} en={locale==='en'}/></main>; }
