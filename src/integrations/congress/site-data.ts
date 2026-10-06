import { prisma } from '@/lib/prisma';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { effectiveSite } from '@/modules/site/configuration';
import { notFound } from 'next/navigation';
export async function publicSite(slug: string) {
  const congress=await prisma.congress.findUnique({where:{slug},include:{organization:{select:{name:true}},modules:true,siteAssets:{where:{active:true},select:{kind:true,width:true,height:true,updatedAt:true}}}});
  if (!congress) notFound();
  const workflow=effectiveConfiguration(congress.configuration);
  const modules={CERTIFICATES:congress.modules.some(m=>m.key==='CERTIFICATES'&&m.enabled),ACTIVITIES:congress.modules.some(m=>m.key==='ACTIVITIES'&&m.enabled),PROGRAM:congress.modules.some(m=>m.key==='PROGRAM'&&m.enabled),SUBMISSIONS:congress.modules.some(m=>m.key==='SUBMISSIONS'&&m.enabled),REGISTRATION:congress.modules.some(m=>m.key==='REGISTRATION'&&m.enabled)};
  return {congress,workflow,modules,site:effectiveSite(congress.siteConfiguration),assets:Object.fromEntries(congress.siteAssets.map(asset=>[asset.kind,{width:asset.width,height:asset.height,url:`/api/public/congresses/${encodeURIComponent(slug)}/assets/${asset.kind.toLowerCase()}?v=${asset.updatedAt.getTime()}`}])) as Partial<Record<'LOGO'|'HERO',{width:number;height:number;url:string}>>};
}
