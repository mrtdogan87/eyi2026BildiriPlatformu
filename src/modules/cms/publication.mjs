import {documentSchema,mediaReferences,publicationProblems} from './configuration.ts';
import {menuProblem} from './navigation.ts';
import {effectiveConfiguration} from '../congress/configuration.ts';
import {recordKinds} from '../content/configuration.ts';
export class CmsPublicationError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=message=>{throw new CmsPublicationError(message);};
// The same publication gate is used by immediate publishing and the durable worker.
export async function validateCmsPublication(tx,{congressId,page,doc,configuration}){
 const problems=publicationProblems(doc,effectiveConfiguration(configuration).languages);if(problems.length)fail(problems[0]);
 const rows=await tx.cmsPage.findMany({where:{congressId,archived:false},select:{slug:true,draft:true,publishedRevision:{select:{content:true}},aliases:{select:{slug:true}}}});
 const canonical=slug=>rows.find(p=>p.slug===slug||p.aliases.some(a=>a.slug===slug))?.slug??slug;
 const graph=rows.filter(p=>p.publishedRevision||p.slug===page.slug).map(p=>({slug:p.slug,parent:canonical(documentSchema.parse(p.publishedRevision?p.publishedRevision.content:p.draft).menuParent)}));
 const menuIssue=menuProblem(page.slug,canonical(doc.menuParent),graph);if(menuIssue)fail(menuIssue);
 const modules=await tx.congressModule.findMany({where:{congressId}});
 const ids=mediaReferences(doc),media=await tx.cmsMedia.findMany({where:{id:{in:ids},congressId},select:{id:true,active:true,kind:true}});
 if(media.length!==ids.length)fail('Bir medya bu kongreye ait değil veya bulunamadı.');
 for(const t of Object.values(doc.translations)){
  if(!t.enabled)continue;
  for(const block of t.blocks){
   if(block.type==='image'||block.type==='download'){
    const asset=media.find(m=>m.id===block.mediaId);
    if(!asset||(block.type==='image'?asset.kind!=='IMAGE':asset.kind==='IMAGE'))fail('Blok için doğru medya türünü seçin.');
    if(!asset.active)fail('Yayımlanacak medyayı kitaplıkta yeniden açın.');
   }
   if(block.type==='dynamic'){
    if(!recordKinds.includes(block.source)){if(block.recordId)fail('Bu ortak kaynak tek kayıt seçimi kullanmaz.');}
    else if(block.recordId){const record=await tx.siteRecord.findFirst({where:{id:block.recordId,congressId,kind:block.source,archived:false}});if(!record?.publishedVersion)fail('Dinamik kaynak bu kongrede açık ve yayımlanmış olmalı.');}
    else if(!await tx.siteRecord.count({where:{congressId,kind:block.source,archived:false,publishedVersion:{not:null}}}))fail('Dinamik kaynakta önce bir kayıt yayımlayın.');
   }
   if(block.type==='button'){
    if(['SUBMISSIONS','REGISTRATION'].includes(block.target)&&!modules.some(m=>m.key===block.target&&m.enabled))fail('Kapalı modüle buton yayımlanamaz.');
    if(block.target==='PAGE'&&block.pageSlug!==page.slug){const target=await tx.cmsPage.findFirst({where:{congressId,archived:false,OR:[{slug:block.pageSlug},{aliases:{some:{slug:block.pageSlug}}}]},select:{publishedRevisionId:true}});if(!target?.publishedRevisionId)fail('Bağlantı hedefi yayımlanmış bir kongre sayfası olmalı.');}
   }
  }
 }
 return mediaReferences(doc,true);
}
