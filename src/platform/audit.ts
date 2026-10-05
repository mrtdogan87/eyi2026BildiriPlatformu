import type { Prisma } from '@prisma/client';
import type { CongressContext } from './context';
// Only callers' explicit, non-secret snapshots are stored. Tokens and passwords never belong here.
export function auditData(context: CongressContext, action: string, targetId?: string, detail?: Prisma.InputJsonValue) {
  return { actorId: context.actor.id, organizationId: context.congress.organizationId, congressId: context.congress.id, action, targetId, ...(detail === undefined ? {} : { detail }) };
}

// A transaction-bound sink keeps cross-cutting audit writes behind this platform interface.
export function auditSink(db: Pick<Prisma.TransactionClient, 'auditLog'>) {
  return (context: CongressContext, action: string, targetId?: string, detail?: Prisma.InputJsonValue) =>
    db.auditLog.create({ data: auditData(context, action, targetId, detail) });
}
