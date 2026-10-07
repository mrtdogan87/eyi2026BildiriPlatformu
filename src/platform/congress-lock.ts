import type { Prisma, ModuleKey } from '@prisma/client';
import type { CongressContext } from './context';
import { effectiveRoles } from './roles.mjs';
import { allows, type Action } from './policy';
import { AccessError } from './http';
export async function lockCongress(tx:Prisma.TransactionClient,c:CongressContext,action:Action,module:ModuleKey,options?:{allowPublishedArchive:boolean}) {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id=${c.congress.id} FOR UPDATE`;
  const congress=await tx.congress.findUniqueOrThrow({where:{id:c.congress.id},select:{closedAt:true}});
  if(congress.closedAt&&module!=='ARCHIVE')throw new AccessError(403,'Kongre kapandı; modül işlemi durduruldu.');
  const [setting,user,session,org,member]=await Promise.all([
    tx.congressModule.findUnique({where:{congressId_key:{congressId:c.congress.id,key:module}}}),
    tx.platformUser.findUnique({where:{id:c.actor.id}}),tx.platformSession.findUnique({where:{id:c.sessionId}}),
    tx.organizationMembership.findUnique({where:{organizationId_userId:{organizationId:c.congress.organizationId,userId:c.actor.id}}}),
    tx.congressMembership.findUnique({where:{congressId_userId:{congressId:c.congress.id,userId:c.actor.id}}}),
  ]);
  const roles=effectiveRoles(user?.platformAdmin,org,member);
  const archiveLifecycle=options?.allowPublishedArchive&&action==='own'&&module==='ARCHIVE'&&(await tx.archiveSettings.findUnique({where:{congressId:c.congress.id},select:{publicEnabled:true}}))?.publicEnabled;
  if((!setting?.enabled&&!archiveLifecycle)||!user?.active||!session||session.revokedAt||session.expiresAt<=new Date()||!roles.includes(c.role)||!allows(roles,action))throw new AccessError(403,'Modül, kongre yetkiniz veya oturumunuz değişti.');
}
