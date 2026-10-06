import { requireContext } from '@/platform/context';
import { participantRecords } from './participant-records';
export async function ownRecords() {
  const context = await requireContext('own');
  return participantRecords(context.congress.id, context.actor.email);
}
