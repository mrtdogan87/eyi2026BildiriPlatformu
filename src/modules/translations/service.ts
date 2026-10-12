import {prisma} from '@/lib/prisma';
import {moduleEnabled,requireContext} from '@/platform/context';
import {allows} from '@/platform/policy';
import {AccessError} from '@/platform/http';
import {effectiveConfiguration} from '@/modules/congress/configuration';
import {effectiveSite} from '@/modules/site/configuration';
import {documentSchema} from '@/modules/cms/configuration';
import {recordDocument} from '@/modules/content/configuration';
import {missingEnglish,pageLayoutDiffers,pageFields,recordFields,siteFields,settingsFields,type TranslationKind} from './fields';
export type TranslationEntry={key:string;kind:TranslationKind;id:string;name:string;missing:number;englishEnabled:boolean;published:boolean;needsReview?:boolean};
export async function translationOverview(){
 const c=await requireContext();const settings=allows(c.roles,'settings');const cms=allows(c.roles,'cms')&&await moduleEnabled(c.congress.id,'CMS');
 if(!settings&&!cms)throw new AccessError(403,'Dil ve çevirileri düzenlemek için kongre ayar yetkisi veya açık CMS modülünde içerik yetkisi gerekir.');
 const config=effectiveConfiguration(c.congress.configuration);
 const [pages,records]=cms?await Promise.all([
  prisma.cmsPage.findMany({where:{congressId:c.congress.id,archived:false},select:{id:true,internalName:true,draft:true,publishedRevisionId:true},orderBy:{createdAt:'asc'}}),
  prisma.siteRecord.findMany({where:{congressId:c.congress.id,archived:false},select:{id:true,internalName:true,draft:true,publishedVersion:true},orderBy:[{kind:'asc'},{createdAt:'asc'}]})
 ]):[[],[]];
 const entries:TranslationEntry[]=[];
 if(settings){const site=effectiveSite(c.congress.siteConfiguration);entries.push({key:'site',kind:'site',id:'',name:'Ana sayfa, başlıklar ve görsel açıklamaları',missing:missingEnglish(siteFields(site,'tr'),siteFields(site,'en')),englishEnabled:config.languages.includes('EN'),published:true},{key:'settings',kind:'settings',id:'',name:'Bilimsel tema ve başvuru beyanları',missing:missingEnglish(settingsFields(config,'tr'),settingsFields(config,'en')),englishEnabled:config.languages.includes('EN'),published:true});}
 for(const p of pages){const doc=documentSchema.parse(p.draft);entries.push({key:'page:'+p.id,kind:'page',needsReview:pageLayoutDiffers(doc),id:p.id,name:p.internalName,missing:missingEnglish(pageFields(doc,'tr'),pageFields(doc,'en')),englishEnabled:doc.translations.en.enabled,published:!!p.publishedRevisionId});}
 for(const r of records){const doc=recordDocument.parse(r.draft);entries.push({key:'record:'+r.id,kind:'record',id:r.id,name:r.internalName,missing:missingEnglish(recordFields(doc,'tr'),recordFields(doc,'en')),englishEnabled:doc.translations.en.enabled,published:!!r.publishedVersion});}
 return {congressId:c.congress.id,name:c.congress.name,slug:c.congress.slug,languages:config.languages,canSettings:settings,entries};
}
export type TranslationOverview=Awaited<ReturnType<typeof translationOverview>>;
