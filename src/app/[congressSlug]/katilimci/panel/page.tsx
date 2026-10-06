import { redirect } from 'next/navigation';
import { ParticipantDashboard } from '@/components/participation/dashboard';
import { participantIdentity } from '@/modules/participation/session';
import { participantRecords } from '@/integrations/congress/participant-records';
import { AccessError } from '@/platform/http';
import { getLocale } from '@/lib/i18n/server';
import { effectiveConfiguration } from '@/modules/congress/configuration';
export const dynamic = 'force-dynamic';
export default async function ParticipantPanelPage({ params }: { params: Promise<{ congressSlug: string }> }) {
  const { congressSlug } = await params;
  let identity; try { identity = await participantIdentity(congressSlug); } catch (error) { if (error instanceof AccessError && error.status === 401) redirect(`/${congressSlug}/katilimci`); throw error; }
  return <main id="congress-content" tabIndex={-1} className="page-shell"><ParticipantDashboard initial={await participantRecords(identity.congressId, identity.email)} locale={await getLocale(effectiveConfiguration(identity.congress.configuration).languages)} /></main>;
}
