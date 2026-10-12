import { z } from 'zod';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { requireContext } from '@/platform/context';
import { auditData } from '@/platform/audit';
import { AccessError } from '@/platform/http';
import { requireExpectedCongress } from '@/platform/expected-congress';
import { appearanceSchema, effectiveSite, siteSchema } from './configuration';
import { effectiveConfiguration } from '@/modules/congress/configuration';
export async function siteSettings() {
  const context=await requireContext('settings');const c=context.congress;const workflow=effectiveConfiguration(c.configuration);
  const assets=await prisma.siteAsset.findMany({where:{congressId:c.id},select:{kind:true,originalName:true,width:true,height:true,active:true,updatedAt:true}});
  return {id:c.id,slug:c.slug,name:c.name,siteVersion:c.siteVersion,configVersion:c.configVersion,site:effectiveSite(c.siteConfiguration),appearance:{theme:workflow.theme,accent:workflow.accent},assets:assets.map(asset=>({...asset,updatedAt:asset.updatedAt.toISOString()}))};
}
export async function updateSiteSettings(raw: unknown) {
  const context=await requireContext('settings');
  requireExpectedCongress(raw,context.congress.id);
  const result=z.object({congressId:z.string().min(1),siteVersion:z.number().int().min(0),configVersion:z.number().int().min(0),site:siteSchema,appearance:appearanceSchema}).strict().safeParse(raw);
  if (!result.success) throw new AccessError(400,result.error.issues[0]?.message ?? 'Site ayarlarını kontrol edin.');
  const input=result.data;
  await prisma.$transaction(async tx=>{
    const before=await tx.congress.findUniqueOrThrow({where:{id:context.congress.id}});const workflow=effectiveConfiguration(before.configuration);
    const appearanceChanged=workflow.theme!==input.appearance.theme || workflow.accent!==input.appearance.accent;
    if (appearanceChanged) { const modules=await tx.congressModule.findMany({where:{congressId:before.id}});workflow.modules.SUBMISSIONS=modules.some(m=>m.key==='SUBMISSIONS'&&m.enabled);workflow.modules.REGISTRATION=modules.some(m=>m.key==='REGISTRATION'&&m.enabled);Object.assign(workflow,input.appearance); }
    const updated=await tx.congress.updateMany({where:{id:before.id,siteVersion:input.siteVersion,configVersion:input.configVersion},data:{siteConfiguration:input.site,siteVersion:{increment:1},...(appearanceChanged ? {configuration:workflow,configVersion:{increment:1}} : {})}});
    if (!updated.count) throw new AccessError(409,'Site veya kongre ayarları değişti. Sayfayı yenileyip tekrar deneyin.');
    await tx.auditLog.create({data:auditData(context,'site.settings.update',before.id,{before:{site:before.siteConfiguration,appearance:{theme:effectiveConfiguration(before.configuration).theme,accent:effectiveConfiguration(before.configuration).accent}},after:{site:input.site,appearance:input.appearance}})});
  });return {ok:true};
}
function kindOf(kind: string) { if (kind!=='logo'&&kind!=='hero') throw new AccessError(404,'Görsel alanı bulunamadı.');return kind==='logo' ? 'LOGO' as const : 'HERO' as const; }
export async function putSiteAsset(kind: string,request: Request) {
  const context=await requireContext('settings');const slot=kindOf(kind);const form=await request.formData();const file=form.get('file');const version=Number(form.get('siteVersion'));
  requireExpectedCongress({congressId:form.get('congressId')},context.congress.id);
  if (!(file instanceof File) || !file.size || file.size>5*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new AccessError(400,'PNG, JPEG veya WebP görseli yükleyin (en fazla 5 MB).');
  if (!Number.isInteger(version) || version<0 || form.get('siteVersion')===null) throw new AccessError(400,'Sayfayı yenileyin.');
  let bytes: Buffer;let width: number;let height: number;
  try { const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:24000000,animated:false});const metadata=await image.metadata();if (!['png','jpeg','webp'].includes(metadata.format ?? '')) throw new Error('Invalid image format');const transformed=await image.rotate().resize({width:slot==='LOGO' ? 800 : 2400,height:slot==='LOGO' ? 800 : 1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});bytes=transformed.data;width=transformed.info.width;height=transformed.info.height; } catch { throw new AccessError(400,'Görsel okunamadı. Geçerli bir PNG, JPEG veya WebP seçin.'); }
  await prisma.$transaction(async tx=>{
    const updated=await tx.congress.updateMany({where:{id:context.congress.id,siteVersion:version},data:{siteVersion:{increment:1}}});if (!updated.count) throw new AccessError(409,'Görseller başka bir işlemde değişti. Sayfayı yenileyin.');
    await tx.siteAsset.upsert({where:{congressId_kind:{congressId:context.congress.id,kind:slot}},create:{congressId:context.congress.id,kind:slot,content:new Uint8Array(bytes),mimeType:'image/webp',originalName:file.name.slice(0,200),width,height},update:{content:new Uint8Array(bytes),mimeType:'image/webp',originalName:file.name.slice(0,200),width,height,active:true}});
    await tx.auditLog.create({data:auditData(context,'site.asset.replace',slot,{width,height,bytes:bytes.length})});
  });return {ok:true};
}
export async function setSiteAssetActive(kind:string,raw:unknown) {
  const context=await requireContext('settings');const slot=kindOf(kind);requireExpectedCongress(raw,context.congress.id);const result=z.object({congressId:z.string().min(1),siteVersion:z.number().int().min(0),active:z.boolean()}).strict().safeParse(raw);if (!result.success) throw new AccessError(400,'Görsel durumunu kontrol edin.');
  await prisma.$transaction(async tx=>{const asset=await tx.siteAsset.findUnique({where:{congressId_kind:{congressId:context.congress.id,kind:slot}}});if (!asset) throw new AccessError(404,'Görsel bulunamadı.');const changed=await tx.congress.updateMany({where:{id:context.congress.id,siteVersion:result.data.siteVersion},data:{siteVersion:{increment:1}}});if (!changed.count) throw new AccessError(409,'Görsel ayarları değişti. Sayfayı yenileyin.');await tx.siteAsset.update({where:{id:asset.id},data:{active:result.data.active}});await tx.auditLog.create({data:auditData(context,result.data.active ? 'site.asset.restore' : 'site.asset.hide',slot,{active:result.data.active})});});return {ok:true};
}
export async function publicSiteAsset(slug:string,kind:string) {
  const slot=kindOf(kind);const asset=await prisma.siteAsset.findFirst({where:{kind:slot,active:true,congress:{slug}},select:{content:true,mimeType:true}});if (!asset) throw new AccessError(404,'Görsel bulunamadı.');return new Response(new Uint8Array(asset.content),{headers:{'Content-Type':asset.mimeType,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':`inline; filename="${kind}.webp"`}});
}
