import {createHash} from 'node:crypto';
import {documentSchema} from './configuration.ts';
import {allows} from '../../platform/policy.ts';
import {CmsPublicationError,validateCmsPublication} from './publication.mjs';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const cmsSourceHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function scheduledActorRole(user,org,member){
 if(!user?.active)return null;
 const role=user.platformAdmin?'PLATFORM_ADMIN':org?.active&&org.organizer?'ORGANIZER':org?.active&&member?.active?member.role:null;
 return role&&allows(role,'cms')?role:null;
}
export function scheduledSourceCurrent(schedule,page,source){return !!page&&page.id===schedule.pageId&&!page.archived&&page.congressId===schedule.congressId&&page.version===schedule.sourceVersion&&source?.id===schedule.sourceRevisionId&&source.pageId===page.id&&source.number===schedule.sourceVersion&&cmsSourceHash(source.content)===schedule.sourceHash&&cmsSourceHash(page.draft)===schedule.sourceHash;}
export async function invalidateCmsSchedules(tx,{pageId,actorId,congressId,organizationId,reason,now=new Date()}){
 const pending=await tx.cmsPublicationSchedule.findMany({where:{pageId,congressId,status:'PENDING'},select:{id:true,sourceRevisionId:true,sourceVersion:true}});
 for(const schedule of pending){await tx.cmsPublicationSchedule.update({where:{id:schedule.id},data:{status:'BLOCKED',outcomeReason:reason,finishedAt:now}});await tx.auditLog.create({data:{actorId,congressId,organizationId,action:'cms.schedule.blocked',targetId:schedule.id,detail:{pageId,reason,sourceRevisionId:schedule.sourceRevisionId,sourceVersion:schedule.sourceVersion}}});}
 return pending.length;
}
async function executeSchedule(prisma,candidate,now){
 return prisma.$transaction(async tx=>{
  // Keep the CMS congress-first lock order. NO KEY UPDATE also lets authority
  // revocations insert AuditLog foreign keys while we wait for their row locks.
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id=${candidate.congressId} FOR NO KEY UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.congressId}))`;
  const schedule=await tx.cmsPublicationSchedule.findUnique({where:{id:candidate.id}});
  if(!schedule||schedule.status!=='PENDING'||schedule.dueAt>now)return null;
  const congress=await tx.congress.findUniqueOrThrow({where:{id:schedule.congressId}});
  const audit=(action,detail)=>tx.auditLog.create({data:{actorId:schedule.actorId,organizationId:congress.organizationId,congressId:congress.id,action,targetId:schedule.id,detail:{pageId:schedule.pageId,sourceRevisionId:schedule.sourceRevisionId,sourceVersion:schedule.sourceVersion,dueAt:schedule.dueAt.toISOString(),...detail}}});
  try{
   // Membership writers do not all take the congress lock. Hold their rows so
   // a revocation cannot commit between this authority check and publication.
   await tx.$queryRaw`SELECT id FROM "PlatformUser" WHERE id=${schedule.actorId} FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM "OrganizationMembership" WHERE "organizationId"=${congress.organizationId} AND "userId"=${schedule.actorId} FOR SHARE`;
   await tx.$queryRaw`SELECT id FROM "CongressMembership" WHERE "congressId"=${congress.id} AND "userId"=${schedule.actorId} FOR SHARE`;
   const [module,user,org,member,page,source]=await Promise.all([
    tx.congressModule.findUnique({where:{congressId_key:{congressId:congress.id,key:'CMS'}}}),
    tx.platformUser.findUnique({where:{id:schedule.actorId}}),
    tx.organizationMembership.findUnique({where:{organizationId_userId:{organizationId:congress.organizationId,userId:schedule.actorId}}}),
    tx.congressMembership.findUnique({where:{congressId_userId:{congressId:congress.id,userId:schedule.actorId}}}),
    tx.cmsPage.findUnique({where:{id:schedule.pageId}}),tx.cmsRevision.findUnique({where:{id:schedule.sourceRevisionId}}),
   ]);
   if(congress.closedAt)throw new CmsPublicationError('Kongre kapandığı için zamanlanmış yayın durduruldu.');
   if(!module?.enabled)throw new CmsPublicationError('CMS modülü kapalı; yeniden zamanlama onayı gerekli.');
   if(!scheduledActorRole(user,org,member))throw new CmsPublicationError('Zamanlamayı onaylayan kişinin yayın yetkisi artık geçerli değil.');
   if(!scheduledSourceCurrent(schedule,page,source))throw new CmsPublicationError('Kaydedilmiş sayfa sürümü değişti veya arşivlendi; güncel sürüm için yeni onay gerekli.');
   const parsed=documentSchema.safeParse(source.content);if(!parsed.success)throw new CmsPublicationError('Zamanlanan sayfanın içerik yapısı geçersiz.');
   const doc=parsed.data,ids=await validateCmsPublication(tx,{congressId:congress.id,page,doc,configuration:congress.configuration});
   const revision=await tx.cmsRevision.create({data:{pageId:page.id,number:page.version+1,kind:'PUBLISH',content:doc,createdById:schedule.actorId,mediaRefs:{create:ids.map(mediaId=>({mediaId}))}}});
   await tx.cmsPage.update({where:{id:page.id},data:{version:{increment:1},publishedRevisionId:revision.id}});
   await tx.cmsPublicationSchedule.update({where:{id:schedule.id},data:{status:'PUBLISHED',publishedRevisionId:revision.id,finishedAt:now,outcomeReason:null}});
   await audit('cms.schedule.published',{publishedRevisionId:revision.id,publicationVersion:revision.number,previousPublication:page.publishedRevisionId});
   return {id:schedule.id,status:'PUBLISHED'};
  }catch(error){
   if(!(error instanceof CmsPublicationError))throw error;
   await tx.cmsPublicationSchedule.update({where:{id:schedule.id},data:{status:'BLOCKED',outcomeReason:error.message,finishedAt:now}});
   await audit('cms.schedule.blocked',{reason:error.message});
   return {id:schedule.id,status:'BLOCKED'};
  }
 },{timeout:30000,maxWait:30000});
}
export async function processCmsSchedules({prisma,now=new Date(),limit=20,congressId}){
 const clock=new Date(now);if(!Number.isFinite(clock.getTime())||!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid CMS worker batch.');
 const rows=await prisma.cmsPublicationSchedule.findMany({where:{status:'PENDING',dueAt:{lte:clock},...(congressId?{congressId}:{})},select:{id:true,congressId:true},orderBy:[{dueAt:'asc'},{id:'asc'}],take:limit});
 const results=[];
 for(const row of rows){const result=await executeSchedule(prisma,row,clock);if(result)results.push(result);}
 return {scanned:rows.length,results};
}
