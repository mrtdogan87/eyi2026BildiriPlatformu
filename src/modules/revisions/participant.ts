import { participantIdentity } from '@/modules/participation/session';
import { requireContext } from '@/platform/context';
import { participantRevision, submitParticipantRevision } from '@/integrations/congress/revisions';
import { revisionForm, formPayload } from './http';
import { readRevisionBinary } from '@/integrations/congress/revision-files';
export async function revisionIdentity(request: Request, platform: boolean) {
  if (platform) { const c = await requireContext('own', 'SUBMISSIONS'); return { congressId: c.congress.id, email: c.actor.email }; }
  return participantIdentity(new URL(request.url).searchParams.get('congressSlug') ?? '');
}
export async function participantRevisionGet(request: Request, id: string, platform = false) { return participantRevision(id, await revisionIdentity(request, platform)); }
export async function participantRevisionPost(request: Request, id: string, platform = false) {
  const identity = await revisionIdentity(request, platform), form = await revisionForm(request);
  return submitParticipantRevision(id, identity, formPayload(form), await readRevisionBinary(form.get('file')));
}
