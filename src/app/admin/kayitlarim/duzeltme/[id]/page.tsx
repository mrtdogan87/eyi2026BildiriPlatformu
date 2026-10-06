import { notFound } from 'next/navigation';
import { requirePage } from '@/platform/context';
import { participantRevision } from '@/integrations/congress/revisions';
import { ParticipantRevision } from '@/components/revisions/participant';
import { AccessError } from '@/platform/http';
export const dynamic = 'force-dynamic';
export default async function OwnRevisionPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await requirePage('own', 'SUBMISSIONS');
  let revision;
  try { revision = await participantRevision((await params).id, { congressId: c.congress.id, email: c.actor.email }); }
  catch (error) { if (error instanceof AccessError && error.status === 404) notFound(); throw error; }
  return <main className="page-shell"><ParticipantRevision initial={revision} slug={c.congress.slug} platform/></main>;
}
