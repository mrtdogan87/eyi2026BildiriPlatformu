import { createHash, randomUUID } from 'node:crypto';
import type { ModuleKey, Prisma, WorkRequest } from '@prisma/client';
import { parseWorklist, participantRequestSchema, staffRequestSchema, requestUpdateSchema, WorklistError } from './configuration.ts';

export type WorklistContext = { congressId: string; origin: 'PARTICIPANT' | 'STAFF_EMAIL'; email: string; actorId?: string };
export type WorklistSource = { type: 'SUBMISSION' | 'REGISTRATION' | 'FEEDBACK' | 'EMAIL_ISSUE'; id: string };
export type WorklistPorts = {
  resolveSource(tx: Prisma.TransactionClient, context: WorklistContext, source: WorklistSource, kind: string): Promise<{ module: ModuleKey | null }>;
  validateAssignee(tx: Prisma.TransactionClient, context: WorklistContext, userId: string): Promise<void>;
  audit(tx: Prisma.TransactionClient, context: WorklistContext, action: string, id: string, detail: { version: number }): Promise<unknown>;
};
// These functions write only the worklist's own tables. Authentication, source records,
// assignable people and audit persistence are explicit host-application ports.
export async function createRequest(tx: Prisma.TransactionClient, context: WorklistContext, raw: unknown, ports: WorklistPorts) {
  const input = context.origin === 'PARTICIPANT' ? parseWorklist(participantRequestSchema, raw) : parseWorklist(staffRequestSchema, raw);
  const staff = context.origin === 'STAFF_EMAIL' ? parseWorklist(staffRequestSchema, raw) : null;
  const linked = input.sourceType && input.sourceId ? await ports.resolveSource(tx, context, { type: input.sourceType, id: input.sourceId }, input.kind) : null;
  if (staff?.assigneeId) await ports.validateAssignee(tx, context, staff.assigneeId);
  const data = {
    congressId: context.congressId, requestKey: input.requestKey, kind: input.kind, origin: context.origin,
    subject: input.subject, description: input.description,
    requesterEmail: (staff?.requesterEmail ?? context.email).trim().toLowerCase(), requesterName: staff?.requesterName || null,
    requesterUserId: context.origin === 'PARTICIPANT' ? context.actorId ?? null : null,
    sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, sourceModule: linked?.module ?? null,
    assigneeId: staff?.assigneeId ?? null, createdById: context.actorId ?? null, updatedById: context.actorId ?? null,
  };
  const payloadHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const id = randomUUID();
  const row = await tx.workRequest.upsert({ where: { congressId_requestKey: { congressId: data.congressId, requestKey: data.requestKey } }, create: { id, ...data, payloadHash }, update: { requestKey: data.requestKey } });
  if (row.payloadHash !== payloadHash) throw new WorklistError(409, 'Bu gönderim anahtarı farklı bir talepte kullanıldı.');
  if (row.id === id) {
    await tx.workRequestEvent.create({ data: { requestId: row.id, number: 1, action: 'CREATE', actorId: context.actorId ?? null, toStatus: 'NEW', assigneeId: row.assigneeId } });
    await ports.audit(tx, context, 'worklist.create', row.id, { version: 1 });
  }
  return row;
}

export async function updateRequest(tx: Prisma.TransactionClient, context: WorklistContext, id: string, raw: unknown, ports: WorklistPorts) {
  if (context.origin !== 'STAFF_EMAIL') throw new WorklistError(403, 'Talebi yalnız yetkili sekreterya güncelleyebilir.');
  const input = parseWorklist(requestUpdateSchema, raw);
  const previous = await tx.workRequest.findFirst({ where: { id, congressId: context.congressId } });
  if (!previous) throw new WorklistError(404, 'Talep bulunamadı.');
  if (previous.version !== input.version) throw new WorklistError(409, 'Talep değişti; listeyi yenileyin.');
  if (input.assigneeId) await ports.validateAssignee(tx, context, input.assigneeId);
  const publicResult = input.publicResult ?? previous.publicResult;
  if (input.status === 'RESOLVED' && publicResult.trim().length < 8) throw new WorklistError(400, 'Talebi sonuçlandırmak için açıklayıcı bir sonuç gerekli.');
  const data = { status: input.status, assigneeId: input.assigneeId === undefined ? previous.assigneeId : input.assigneeId,
    publicResult, internalNote: input.internalNote ?? previous.internalNote, updatedById: context.actorId ?? null,
    resolvedAt: input.status === 'RESOLVED' ? previous.resolvedAt ?? new Date() : null, version: { increment: 1 } };
  const changed = await tx.workRequest.updateMany({ where: { id, congressId: context.congressId, version: input.version }, data });
  if (!changed.count) throw new WorklistError(409, 'Talep değişti; listeyi yenileyin.');
  await tx.workRequestEvent.create({ data: { requestId: id, number: input.version + 1, action: 'UPDATE', actorId: context.actorId ?? null,
    fromStatus: previous.status, toStatus: input.status, assigneeId: data.assigneeId, publicResult, internalNote: data.internalNote } });
  await ports.audit(tx, context, 'worklist.update', id, { version: input.version + 1 });
  return tx.workRequest.findUniqueOrThrow({ where: { id } });
}

export function publicRequest(row: WorkRequest) {
  return { id: row.id, kind: row.kind, origin: row.origin, subject: row.subject, description: row.description,
    status: row.status, sourceType: row.sourceType, sourceId: row.sourceId, publicResult: row.publicResult,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null };
}
export function staffRequest(row: WorkRequest) {
  return { ...publicRequest(row), version: row.version, requesterEmail: row.requesterEmail, requesterName: row.requesterName,
    assigneeId: row.assigneeId, sourceModule: row.sourceModule, internalNote: row.internalNote };
}
