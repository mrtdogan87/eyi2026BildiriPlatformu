import { ParticipantAccess } from '@/components/participation/access';
import { participantCongress, participationEnabled } from '@/modules/participation/session';
import { getLocale } from '@/lib/i18n/server';
import { effectiveConfiguration } from '@/modules/congress/configuration';
export const dynamic = 'force-dynamic';
export default async function ParticipantPage({ params }: { params: Promise<{ congressSlug: string }> }) {
  const { congressSlug } = await params, congress = await participantCongress(congressSlug), locale = await getLocale(effectiveConfiguration(congress.configuration).languages);
  return <main id="congress-content" className="page-shell" tabIndex={-1}><section className="card platform-card"><h1>{locale === 'en' ? 'Participant panel' : 'Katılımcı paneli'}</h1><p>{congress.name}</p>{participationEnabled(congress) ? <ParticipantAccess slug={congressSlug} locale={locale} /> : <p>{locale === 'en' ? 'Participant operations are closed for this congress.' : 'Bu kongrede katılımcı işlemleri kapalı.'}</p>}</section></main>;
}
