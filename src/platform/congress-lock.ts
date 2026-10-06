import type { Prisma, ModuleKey } from '@prisma/client';
import type { CongressContext } from './context';
import { allows, type Action } from './policy';
import { AccessError } from './http';
export async function lockCongress(tx:Prisma.TransactionClient,c:CongressContext,action:Action,module:ModuleKey) {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id=${c.congress.id} FOR UPDATE`;
  const [setting,user,session,org,member]=await Promise.all([
    tx.congressModule.findUnique({where:{congressId_key:{congressId:c.congress.id,key:module}}}),
    tx.platformUser.findUnique({where:{id:c.actor.id}}),tx.platformSession.findUnique({where:{id:c.sessionId}}),
    tx.organizationMembership.findUnique({where:{organizationId_userId:{organizationId:c.congress.organizationId,userId:c.actor.id}}}),
    tx.congressMembership.findUnique({where:{congressId_userId:{congressId:c.congress.id,userId:c.actor.id}}}),
  ]);
  const role=user?.platformAdmin?'PLATFORM_ADMIN':org?.active&&org.organizer?'ORGANIZER':org?.active&&member?.active?member.role:null;
  if(!setting?.enabled||!user?.active||!session||session.revokedAt||session.expiresAt<=new Date()||!role||role!==c.role||!allows(role,action))throw new AccessError(403,'Modül, kongre yetkiniz veya oturumunuz değişti.');
}
