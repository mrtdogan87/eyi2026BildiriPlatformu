import { ParticipantAccess } from '@/components/participation/access';
import { participantCongress } from '@/modules/participation/session';
import { getLocale } from '@/lib/i18n/server';
import { effectiveConfiguration } from '@/modules/congress/configuration';
export const dynamic = 'force-dynamic';
export default async function VerifyParticipantPage({ params, searchParams }: { params: Promise<{ congressSlug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { congressSlug } = await params, congress = await participantCongress(congressSlug), { token } = await searchParams, locale = await getLocale(effectiveConfiguration(congress.configuration).languages);
  return <main id="congress-content" tabIndex={-1} className="page-shell"><section className="card platform-card"><h1>{locale === 'en' ? 'Verify participant access' : 'Katılımcı erişimini doğrulayın'}</h1><p>{congress.name}</p><ParticipantAccess slug={congressSlug} locale={locale} token={token && /^[a-f0-9]{64}$/.test(token) ? token : undefined} /></section></main>;
}
