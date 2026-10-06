import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AccessError } from '@/platform/http';
import { participantIdentity } from './session';
import { requireContext } from '@/platform/context';
import { createParticipantWorkRequest } from '@/integrations/congress/worklist';
import { openParticipantFlow } from '@/integrations/congress/participant-records';
export async function participantAction(raw: unknown, action: 'request' | 'open', platform = false) {
  const base = z.object({ congressSlug: z.string().min(1).max(120).optional() }).passthrough().safeParse(raw);
  if (!base.success) throw new AccessError(400, 'Geçerli talep gerekli.');
  const { congressSlug, ...input } = base.data;
  const identity = platform ? await requireContext('own').then(c => ({ congressId: c.congress.id, email: c.actor.email, actorId: c.actor.id, parentSession: { kind: 'PLATFORM' as const, id: c.sessionId } })) : await participantIdentity(congressSlug ?? '');
  if (action === 'request') return prisma.$transaction(tx => createParticipantWorkRequest(tx, identity, input));
  const target = z.object({ sourceType: z.enum(['SUBMISSION', 'REGISTRATION']), sourceId: z.string().min(1).max(128).optional() }).strict().safeParse(input);
  if (!target.success) throw new AccessError(400, 'Geçerli işlem gerekli.');
  return openParticipantFlow(identity, target.data);
}
