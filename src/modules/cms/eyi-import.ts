import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import pages from '../../../data/eyi-2026/pages.json';
import assets from '../../../data/eyi-2026/assets.json';
import {prisma} from '@/lib/prisma';
import {requireContext} from '@/platform/context';
import {AccessError} from '@/platform/http';
import {auditData} from '@/platform/audit';
import {documentSchema,mediaReferences} from './configuration';
export function eyiSourceInventory(){return {capturedAt:pages.capturedAt,origin:pages.origin,pages:pages.pages.map(p=>({key:p.key,title:p.title,url:p.url,state:p.state,sourceParts:p.sourceParts,assetCount:p.assetFiles.length,sourceSha256:p.sourceSha256})),assets:assets.assets.map(a=>({label:a.label,url:a.url,state:a.state,kind:a.kind,byteSize:a.byteSize,sha256:a.sha256,storedSha256:a.storedSha256})),notes:['Kaynak yalnız Türkçe olarak yakalandı; İngilizce içerik uydurulmaz.','Galeri ve etkinlik içeriği kaynakta bekliyor; iki bozuk hedef kayıtlıdır.','Aktarım yalnız taslak oluşturur; tarihsel bilgiler yeni kongre ayarlarını değiştirmez.']};}
export async function importEyiSnapshot(raw:unknown){
 const c=await requireContext('cms','CMS');const parsed=z.object({keys:z.array(z.string()).min(1).max(40),acknowledgeHistory:z.literal(true)}).strict().safeParse(raw);if(!parsed.success)throw new AccessError(400,'Kaynakları seçip tarihsel içerik uyarısını onaylayın.');
 const selected=[...new Set(parsed.data.keys)].map(key=>pages.pages.find(p=>p.key===key));if(selected.some(p=>!p||p.state!=='ready'))throw new AccessError(400,'Kaynak bulunamadı veya aktarıma uygun değil.');const sourcePages=selected.filter(p=>!!p);
 const required=[...new Set(sourcePages.flatMap(p=>p.assetFiles))];const files=await Promise.all(required.map(async file=>{const a=assets.assets.find(a=>a.file===file&&a.state==='verified');if(!a||!/^[a-f0-9]{20}\.(webp|pdf|dotx)$/.test(file))throw new AccessError(400,'Doğrulanmış kaynak dosyası eksik.');const bytes=await readFile(join(process.cwd(),'data/eyi-2026/assets',file));if(bytes.length!==a.byteSize||createHash('sha256').update(bytes).digest('hex')!==a.storedSha256)throw new AccessError(400,'Kaynak dosyasının özeti uyuşmuyor.');return {a,bytes};}));
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${c.congress.id}))`;
  const existing=await tx.cmsPage.findMany({where:{congressId:c.congress.id},select:{slug:true,templateKey:true}});const pending=sourcePages.filter(p=>!existing.some(e=>e.templateKey==='eyi-source:'+p.key));
  for(const p of pending)if(existing.some(e=>e.slug===p.slug)||await tx.cmsPageAlias.findUnique({where:{congressId_slug:{congressId:c.congress.id,slug:p.slug}}}))throw new AccessError(409,'Aktarım adresi kullanılıyor: '+p.slug);
  const mediaIds=new Map<string,string>();const pendingFiles=new Set(pending.flatMap(p=>p.assetFiles));
  for(const {a,bytes} of files){if(!pendingFiles.has(a.file))continue;const media=await tx.cmsMedia.create({data:{congressId:c.congress.id,internalName:('EYİ 2026 — '+a.label).slice(0,180),originalName:'eyi-2026-'+a.file,kind:a.kind as 'IMAGE'|'PDF'|'WORD_TEMPLATE',mimeType:a.mimeType,byteSize:bytes.length,content:new Uint8Array(bytes),width:a.width,height:a.height,uploadedById:c.actor.id}});mediaIds.set(a.file,media.id);await tx.auditLog.create({data:auditData(c,'cms.source.media',media.id,{sourceUrl:a.url,sourceSha256:a.sha256,storedSha256:a.storedSha256})});}
  const created=[];
  for(const p of pending){const doc=documentSchema.parse(p.document);for(const t of Object.values(doc.translations))for(const block of t.blocks)if(block.type==='image'||block.type==='download'){const file=block.mediaId.replace(/^asset-/,'');const id=mediaIds.get(file);if(!id)throw new AccessError(400,'Kaynak medya eşleştirmesi eksik.');block.mediaId=id;}
   const page=await tx.cmsPage.create({data:{congressId:c.congress.id,slug:p.slug,templateKey:'eyi-source:'+p.key,internalName:('EYİ 2026 arşivi — '+p.title).slice(0,180),draft:doc}});
   await tx.cmsRevision.create({data:{pageId:page.id,number:1,kind:'SAVE',content:doc,createdById:c.actor.id,mediaRefs:{create:mediaReferences(doc).map(mediaId=>({mediaId}))}}});await tx.auditLog.create({data:auditData(c,'cms.source.import',page.id,{sourceUrl:p.url,sourceSha256:p.sourceSha256,capturedAt:pages.capturedAt,historicalYear:2026})});created.push({id:page.id,title:p.title});
  }
  return {created,skipped:sourcePages.length-pending.length,mediaCreated:mediaIds.size};
 },{timeout:30000});
}
