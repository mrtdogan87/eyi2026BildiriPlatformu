import { redirect, notFound } from 'next/navigation';
import { participantIdentity } from '@/modules/participation/session';
import { participantRevision } from '@/integrations/congress/revisions';
import { ParticipantRevision } from '@/components/revisions/participant';
import { AccessError } from '@/platform/http';
import { getLocale } from '@/lib/i18n/server';
import { effectiveConfiguration } from '@/modules/congress/configuration';
export const dynamic = 'force-dynamic';
export default async function RevisionPage({ params }: { params: Promise<{ congressSlug: string; id: string }> }) {
  const { congressSlug, id } = await params;
  let identity, revision;
  try { identity = await participantIdentity(congressSlug); revision = await participantRevision(id, identity); }
  catch (error) { if (error instanceof AccessError) { if (error.status === 401) redirect(`/${congressSlug}/katilimci`); if ([403,404].includes(error.status)) notFound(); } throw error; }
  return <main className="page-shell" id="congress-content"><ParticipantRevision initial={revision} slug={congressSlug} locale={await getLocale(effectiveConfiguration(identity.congress.configuration).languages)}/></main>;
}
