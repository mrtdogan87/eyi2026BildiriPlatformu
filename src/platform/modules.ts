import type { ModuleKey } from '@prisma/client';
import { requireContext } from './context';
import { prisma } from '@/lib/prisma';
import { moduleCatalog } from './policy';
import { AccessError } from './http';
import { auditData } from './audit';
export async function listModules() {
  const context = await requireContext('modules');
  const rows = await prisma.congressModule.findMany({ where: { congressId: context.congress.id } });
  return Object.entries(moduleCatalog).map(([key, item]) => ({ key: key as ModuleKey, ...item, enabled: rows.find(row => row.key === key)?.enabled ?? false }));
}
export async function setModule(key: ModuleKey, enabled: boolean) {
  const context = await requireContext('modules');
  if (!Object.hasOwn(moduleCatalog, key) || !moduleCatalog[key].implemented || typeof enabled !== 'boolean') throw new AccessError(400, 'Bu modül henüz kullanıma hazır değil.');
  await prisma.$transaction(async tx => {
    const before = await tx.congressModule.findUnique({ where: { congressId_key: { congressId: context.congress.id, key } } });
    await tx.congressModule.upsert({ where: { congressId_key: { congressId: context.congress.id, key } }, create: { congressId: context.congress.id, key, enabled }, update: { enabled } });
    await tx.auditLog.create({ data: auditData(context, 'module.toggle', key, { before: before?.enabled ?? false, after: enabled }) });
  });
}
