import type {Prisma} from '@prisma/client';
import {starterPages,starterDocument} from '@/modules/cms/templates';
export async function initializeCmsTemplates(tx:Prisma.TransactionClient,congressId:string,actorId:string){
 const existing=await tx.cmsPage.findMany({where:{congressId},select:{slug:true,templateKey:true}});const aliases=await tx.cmsPageAlias.findMany({where:{congressId},select:{slug:true}});let created=0;
 for(const [i,entry] of starterPages.entries()){
  if(existing.some(p=>p.slug===entry[0]||p.templateKey===entry[0])||aliases.some(p=>p.slug===entry[0]))continue;
  const content=starterDocument(entry,(i+1)*10);const page=await tx.cmsPage.create({data:{congressId,slug:entry[0],templateKey:entry[0],internalName:entry[1],draft:content}});
  await tx.cmsRevision.create({data:{pageId:page.id,number:1,kind:'SAVE',content,createdById:actorId}});created++;
 }
 return {created,total:starterPages.length};
}
