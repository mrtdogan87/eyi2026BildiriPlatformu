import { membershipRoles } from '@/platform/roles.mjs';
import type { Prisma } from '@prisma/client';
import { AccessError } from '@/platform/http';
export async function copyCongressTeam(tx: Prisma.TransactionClient, sourceId: string, targetId: string, organizationId: string, actorId: string, selectedIds: string[]) {
  if (new Set(selectedIds).size !== selectedIds.length) throw new AccessError(400, 'Ekip seçimi tekrar edemez.');
  const members = await tx.congressMembership.findMany({ where: { id: { in: selectedIds }, congressId: sourceId, active: true, user: { active: true, organizations: { some: { organizationId, active: true } } } } });
  if (members.length !== selectedIds.length) throw new AccessError(400, 'Seçilen ekip üyelerinden biri artık uygun değil.');
  for (const member of members) if (member.userId !== actorId) await tx.congressMembership.create({ data: { congressId: targetId, userId: member.userId, role: member.role, roles: membershipRoles(member) } });
  return members.map(m => ({ userId: m.userId, role: m.role, roles: membershipRoles(m) }));
}
