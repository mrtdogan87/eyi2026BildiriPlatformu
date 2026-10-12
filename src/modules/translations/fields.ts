import {blockLabels, type CmsDocument} from '../cms/configuration.ts';
import type {RecordDocument} from '../content/configuration.ts';
import type {SiteConfiguration} from '../site/configuration.ts';
import type {CongressConfiguration} from '../congress/configuration.ts';
export type TextPath=(string|number)[];
export type TranslationField={label:string;path:TextPath;value:string;max:number;multiline?:boolean};
export type TranslationKind='site'|'page'|'record'|'settings';
const names:Record<string,string>={shortName:'Kısa kongre adı',fullName:'Üst şeritte kongre adı (boşsa kayıtlı ad)',eyebrow:'Üst başlık',headline:'Ana başlık',introduction:'Giriş metni',about:'Kongre hakkında metni',venue:'Yer / katılım bilgisi',logoAlt:'Logo alternatif metni',heroAlt:'Ana görsel alternatif metni',heroCaption:'Ana görsel alt bandı',actions:'Ana sayfa butonu',label:'Bağlantı / buton etiketi',people:'Kişi',role:'Görev',talk:'Konuşma başlığı',images:'Görsel',alt:'Alternatif metin',caption:'Açıklama',link:'Bağlantı',sections:'Ana sayfa bölümleri',aboutTitle:'Kongre hakkında başlığı',participationTitle:'Başvuru ve katılım başlığı',datesTitle:'Önemli tarihler başlığı',contactTitle:'İletişim başlığı'};
const limits:Record<string,number>={shortName:50,fullName:180,eyebrow:80,headline:200,introduction:1000,about:2000,venue:200,logoAlt:180,heroAlt:300,heroCaption:160,role:180,talk:250,alt:250,caption:500,aboutTitle:180,participationTitle:180,datesTitle:180,contactTitle:180};
export function textAt(value:unknown,path:TextPath):string {let current:unknown=value;for(const key of path)current=(current as Record<string|number,unknown>|undefined)?.[key];return typeof current==='string'?current:'';}
export function replaceText<T>(value:T,path:TextPath,text:string):T {const copy=structuredClone(value);let node=copy as Record<string|number,unknown>;for(const key of path.slice(0,-1)){if(node[key]==null)throw new Error('Metin alanı bulunamadı.');node=node[key] as Record<string|number,unknown>;}node[path[path.length-1]]=text;return copy;}
function pairedFields(value:unknown,locale:'tr'|'en',path:TextPath=[],label=''):TranslationField[]{
 if(!value||typeof value!=='object')return[];
 const row=value as Record<string,unknown>;
 if(typeof row.tr==='string'&&typeof row.en==='string'){const key=String(path.at(-1));return[{label,path:[...path,locale],value:row[locale] as string,multiline:['headline','introduction','about','heroCaption'].includes(key),max:limits[key]??(path[0]==='actions'?45:100)}];}
 return Object.entries(row).flatMap(([key,child])=>{const index=/^\d+$/.test(key);return pairedFields(child,locale,[...path,index?Number(key):key],[label,index?String(Number(key)+1):names[key]??key].filter(Boolean).join(' · '));});
}
export function siteFields(site:SiteConfiguration,locale:'tr'|'en'){return pairedFields(site,locale);}
export function recordFields(doc:RecordDocument,locale:'tr'|'en'):TranslationField[]{return [{label:'Halka açık başlık / kişi adı',path:['translations',locale,'title'],value:doc.translations[locale].title,max:180},{label:'Açıklama / biyografi',path:['translations',locale,'body'],value:doc.translations[locale].body,max:10000},...pairedFields(doc.people,locale,['people'],'Kişi'),...pairedFields(doc.images,locale,['images'],'Görsel'),...(doc.link.target!=='NONE'?pairedFields(doc.link.label,locale,['link','label'],'Bağlantı etiketi'):[])];}
export function pageFields(doc:CmsDocument,locale:'tr'|'en'):TranslationField[]{
 const t=doc.translations[locale],base:TextPath=['translations',locale];
 const fields:TranslationField[]=[{label:'Halka açık başlık',path:[...base,'title'],value:t.title,max:180},{label:'Menü etiketi',path:[...base,'menuLabel'],value:t.menuLabel,max:80},{label:'Giriş metni',path:[...base,'lead'],value:t.lead,max:1500}];
 t.blocks.forEach((block,index)=>{const p=[...base,'blocks',index],label=`${index+1}. ${blockLabels[block.type]}`;const add=(key:string,value:string,max:number,suffix='')=>fields.push({label:label+(suffix?' · '+suffix:''),path:[...p,key],value,max,multiline:['text','caption'].includes(key)});
 switch(block.type){case'heading':case'paragraph':case'notice':add('text',block.text,block.type==='heading'?180:block.type==='notice'?2000:10000);break;
 case'image':add('alt',block.alt,250,'alternatif metin');add('caption',block.caption,500,'açıklama');break;
 case'button':case'download':case'dynamic':add('label',block.label,block.type==='button'?80:block.type==='download'?100:180,'görünen etiket');break;
 case'list':block.items.forEach((value,i)=>fields.push({label:`${label} · ${i+1}. öğe`,path:[...p,'items',i],value,max:1000}));break;
 case'table':add('caption',block.caption,250,'tablo adı');block.headers.forEach((value,i)=>fields.push({label:`${label} · ${i+1}. sütun başlığı`,path:[...p,'headers',i],value,max:100}));block.rows.forEach((row,r)=>row.forEach((value,c)=>fields.push({label:`${label} · ${r+1}. satır, ${c+1}. sütun`,path:[...p,'rows',r,c],value,max:500})));break;}
 });return fields;
}
// Only text is cleared; media IDs, destinations, order and block types survive.
export function prepareEnglishPage(doc:CmsDocument):CmsDocument {if(doc.translations.en.blocks.length)throw new Error('İngilizce bloklar zaten var; mevcut çeviriyi düzenleyin.');let copy=structuredClone(doc);copy.translations.en={...structuredClone(doc.translations.tr),enabled:doc.translations.en.enabled};for(const field of pageFields(copy,'en'))copy=replaceText(copy,field.path,'');copy.translations.en.title=doc.translations.en.title;copy.translations.en.menuLabel=doc.translations.en.menuLabel;copy.translations.en.lead=doc.translations.en.lead;return copy;}
const declarations:Record<string,string>={accuracy:'Bilgilerin doğruluğu beyanı',submissionLimit:'Bildiri sınırı beyanı',coauthorApproval:'Diğer yazarların onayı',personalDataConsent:'Kişisel veri beyanı',registrationPresentationConsent:'Kayıt ve sunum koşulları'};
export function settingsFields(config:CongressConfiguration,locale:'tr'|'en'):TranslationField[]{return [{label:'Davet ve afişte bilimsel tema',path:['invitationFacts','theme',locale],value:config.invitationFacts.theme[locale],max:300},...Object.entries(config.declarationTexts[locale==='tr'?'TR':'EN']).map(([key,value])=>({label:declarations[key]??key,path:['declarationTexts',locale==='tr'?'TR':'EN',key],value,max:2000}))];}
export function missingEnglish(source:TranslationField[],target:TranslationField[]):number {const key=(path:TextPath)=>path.map(part=>['tr','en','TR','EN'].includes(String(part))?'locale':part).join('.');const values=new Map(target.map(field=>[key(field.path),field.value]));return source.filter(field=>field.value.trim()&&!values.get(key(field.path))?.trim()).length;}

export function pageLayoutDiffers(doc:CmsDocument):boolean {return JSON.stringify(doc.translations.tr.blocks.map(b=>[b.id,b.type]))!==JSON.stringify(doc.translations.en.blocks.map(b=>[b.id,b.type]));}
