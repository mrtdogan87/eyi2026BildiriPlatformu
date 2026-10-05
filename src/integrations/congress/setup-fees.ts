import type { Prisma } from '@prisma/client';
import type { FeeSetup } from '@/modules/congress/configuration';
export async function createFeeSchedule(tx: Prisma.TransactionClient, congressId: string, fees: FeeSetup) {
  const tiers: Prisma.PaymentTierCreateManyInput[] = [];
  for (const audience of ['ACADEMIC', 'STUDENT'] as const) for (const period of ['EARLY', 'LATE'] as const) {
    for (const paperOrder of [1, 2]) tiers.push({ congressId, role: 'PRESENTER', audience, period, paperOrder, amount: paperOrder === 2 ? 0 : audience === 'STUDENT' ? fees.student : fees.presenter, currency: fees.currency, sortOrder: tiers.length });
    tiers.push({ congressId, role: 'LISTENER', presentationMode: 'IN_PERSON', audience, period, amount: fees.listener, currency: fees.currency, sortOrder: tiers.length });
  }
  tiers.push({ congressId, role: 'LISTENER', presentationMode: 'ONLINE', amount: 0, currency: fees.currency, sortOrder: tiers.length });
  await tx.paymentTier.createMany({ data: tiers });
}
export async function copyFeeSchedule(tx: Prisma.TransactionClient, sourceId: string, targetId: string) {
  const rows = await tx.paymentTier.findMany({ where: { congressId: sourceId } });
  await tx.paymentTier.createMany({ data: rows.map(row => ({ congressId: targetId, presentationMode: row.presentationMode, role: row.role, audience: row.audience, period: row.period, paperOrder: row.paperOrder, amount: row.amount, currency: row.currency, active: row.active, sortOrder: row.sortOrder })) });
}
