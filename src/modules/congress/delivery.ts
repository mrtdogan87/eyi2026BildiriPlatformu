import { z } from 'zod';
import type { DeliveryStage } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext, moduleEnabled } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { effectiveConfiguration } from './configuration';
export async function deliveryAllowed(congressId: string, input: { email?: string; submissionId?: string; stage?: DeliveryStage | 'SUBMIT' } = {}) {
  const congress = await prisma.congress.findUnique({ where: { id: congressId } });
  if (!congress || !(await moduleEnabled(congressId, 'SUBMISSIONS'))) return false;
  const config = effectiveConfiguration(congress.configuration);
  const first: DeliveryStage = config.stages.ABSTRACT.enabled ? 'ABSTRACT' : 'FULL_TEXT';
  const finalStage = config.stages.FULL_TEXT.enabled && (config.fields.file === 'REQUIRED' || (config.structuredAbstract.enabled && config.structuredAbstract.stage === 'FULL_TEXT')) ? 'FULL_TEXT' : first;
  const stages: DeliveryStage[] = [input.stage === 'SUBMIT' ? finalStage : input.stage ?? first];
  const now = new Date();
  for (const stage of stages) {
    if (!config.stages[stage].enabled) return false;
    const deadline = config.stages[stage].deadline;
    if (!congress.submissionsClosed && (!deadline || new Date(deadline) > now)) continue;
    if (!input.email) return false;
    const permission = await prisma.deliveryException.findFirst({ where: { congressId, email: input.email.toLowerCase(), stage, revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now }, OR: [{ submissionId: null }, ...(input.submissionId ? [{ submissionId: input.submissionId }] : [])] } });
    if (!permission) return false;
  }
  return true;
}
export async function listDeliveryExceptions() {
  const context = await requireContext('settings');
  return prisma.deliveryException.findMany({ where: { congressId: context.congress.id }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, email: true, submissionId: true, stage: true, reason: true, startsAt: true, expiresAt: true, revokedAt: true, createdBy: { select: { name: true } } } });
}
export async function grantDeliveryException(raw: unknown) {
  const context = await requireContext('settings');
  const result = z.object({ email: z.string().trim().toLowerCase().email().max(254), submissionId: z.string().optional(), stage: z.enum(['ABSTRACT', 'FULL_TEXT']), reason: z.string().trim().min(5).max(500), expiresAt: z.string().datetime({ offset: true }) }).strict().safeParse(raw);
  if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'İstisna bilgilerini kontrol edin.');
  const input = result.data; const expiresAt = new Date(input.expiresAt);
  if (expiresAt <= new Date()) throw new AccessError(400, 'İstisnanın bitişi gelecekte olmalı.');
  if (!(await moduleEnabled(context.congress.id, 'SUBMISSIONS')) || !effectiveConfiguration(context.congress.configuration).stages[input.stage].enabled) throw new AccessError(400, 'Kapalı modül/aşama için teslim izni verilemez.');
  if (input.submissionId) {
    const submission = await prisma.submission.findFirst({ where: { id: input.submissionId, congressId: context.congress.id, draftOwnerEmail: { equals: input.email, mode: 'insensitive' } } });
    if (!submission) throw new AccessError(404, 'Bu kongrede bu kişiye ait başvuru bulunamadı.');
    if (submission.status !== 'DRAFT') throw new AccessError(400, 'Teslim izni yalnız gönderilmemiş taslaklar için verilebilir.');
  }
  return prisma.$transaction(async tx => {
    const record = await tx.deliveryException.create({ data: { congressId: context.congress.id, email: input.email, submissionId: input.submissionId || null, stage: input.stage, reason: input.reason, expiresAt, createdById: context.actor.id } });
    await tx.auditLog.create({ data: auditData(context, 'delivery.exception.grant', record.id, { email: record.email, submissionId: record.submissionId, stage: record.stage, reason: record.reason, expiresAt: record.expiresAt.toISOString() }) });
    return { id: record.id };
  });
}
export async function revokeDeliveryException(id: string) {
  const context = await requireContext('settings');
  return prisma.$transaction(async tx => {
    const record = await tx.deliveryException.findFirst({ where: { id, congressId: context.congress.id } });
    if (!record) throw new AccessError(404, 'İstisna bulunamadı.');
    await tx.deliveryException.update({ where: { id }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: auditData(context, 'delivery.exception.revoke', id, { email: record.email, stage: record.stage }) });
    return { ok: true };
  });
}
