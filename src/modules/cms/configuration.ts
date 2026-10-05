import { z } from 'zod';
export const cmsSlug=z.string().trim().min(2).max(70).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Adres küçük harf, sayı ve tire içermeli.').refine(v=>!['admin','api','bildiri-gonder','kayit','sayfalar','onizleme'].includes(v),'Bu adres kullanılamaz.');
const safeHttps=z.string().trim().max(500).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Harici bağlantı kullanıcı bilgisi içermeyen HTTPS adresi olmalı.');
const id=z.string().max(100);const blockId=z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const heading=z.object({id:blockId,type:z.literal('heading'),text:z.string().max(180),level:z.union([z.literal(2),z.literal(3)])}).strict();
const paragraph=z.object({id:blockId,type:z.literal('paragraph'),text:z.string().max(10000)}).strict();
const notice=z.object({id:blockId,type:z.literal('notice'),text:z.string().max(2000)}).strict();
const list=z.object({id:blockId,type:z.literal('list'),ordered:z.boolean(),items:z.array(z.string().max(1000)).max(40)}).strict();
const image=z.object({id:blockId,type:z.literal('image'),mediaId:id,alt:z.string().max(250),caption:z.string().max(500)}).strict();
const download=z.object({id:blockId,type:z.literal('download'),mediaId:id,label:z.string().max(100)}).strict();
const button=z.object({id:blockId,type:z.literal('button'),label:z.string().max(80),target:z.enum(['PAGE','SUBMISSIONS','REGISTRATION','EXTERNAL']),pageSlug:z.union([z.literal(''),cmsSlug]),url:safeHttps}).strict();
const table=z.object({id:blockId,type:z.literal('table'),caption:z.string().max(250),headers:z.array(z.string().max(100)).max(6),rows:z.array(z.array(z.string().max(500)).max(6)).max(30)}).strict();
export const blockSchema=z.discriminatedUnion('type',[heading,paragraph,notice,list,image,download,button,table]);
export type CmsBlock=z.infer<typeof blockSchema>;
const translation=z.object({enabled:z.boolean(),title:z.string().trim().max(180),lead:z.string().max(1500),blocks:z.array(blockSchema).max(40)}).strict().superRefine((value,ctx)=>{if(new Set(value.blocks.map(b=>b.id)).size!==value.blocks.length)ctx.addIssue({code:'custom',message:'Blok kimlikleri tekrar edemez.'});});
export const documentSchema=z.object({version:z.literal(1),showInMenu:z.boolean(),menuOrder:z.number().int().min(0).max(1000),translations:z.object({tr:translation,en:translation}).strict()}).strict().superRefine((value,ctx)=>{if(new TextEncoder().encode(JSON.stringify(value)).length>300000)ctx.addIssue({code:'custom',message:'Sayfa içeriği çok büyük.'});});
export type CmsDocument=z.infer<typeof documentSchema>;
export type CmsLocale='tr'|'en';
export function emptyDocument():CmsDocument{return {version:1,showInMenu:true,menuOrder:10,translations:{tr:{enabled:true,title:'',lead:'',blocks:[]},en:{enabled:false,title:'',lead:'',blocks:[]}}};}
export const blockLabels:Record<CmsBlock['type'],string>={heading:'Alt başlık',paragraph:'Metin',notice:'Bilgi kutusu',list:'Liste',image:'Görsel',download:'PDF bağlantısı',button:'Buton',table:'Tablo'};
export function newBlock(type:CmsBlock['type'],id:string):CmsBlock{switch(type){case'heading':return {id,type,text:'',level:2};case'paragraph':case'notice':return {id,type,text:''};case'list':return{id,type,ordered:false,items:['']};case'image':return{id,type,mediaId:'',alt:'',caption:''};case'download':return{id,type,mediaId:'',label:''};case'button':return{id,type,label:'',target:'EXTERNAL',pageSlug:'',url:''};case'table':return{id,type,caption:'',headers:['Başlık 1','Başlık 2'],rows:[['','']]};}}
export function mediaReferences(doc:CmsDocument,publishedOnly=false){return [...new Set(Object.values(doc.translations).filter(t=>!publishedOnly||t.enabled).flatMap(t=>t.blocks.flatMap(b=>b.type==='image'||b.type==='download'?b.mediaId?[b.mediaId]:[]:[])))];}
export function selectTranslation(doc:CmsDocument,locale:CmsLocale){const other=locale==='tr'?'en':'tr';const selected=doc.translations[locale].enabled&&doc.translations[locale].title?locale:doc.translations[other].enabled&&doc.translations[other].title?other:null;return selected?{locale:selected,...doc.translations[selected]}:null;}
export function publicationProblems(doc:CmsDocument,languages:readonly ('TR'|'EN')[]=['TR','EN']) {
  const issues:string[]=[];if(!languages.some(l=>doc.translations[l==='TR'?'tr':'en'].enabled))issues.push('Kongrede açık dillerden en az biri yayımlanmalı.');
  for(const lang of ['tr','en'] as const){const t=doc.translations[lang];if(!t.enabled)continue;const prefix=lang.toUpperCase()+': ';if(!t.title.trim())issues.push(prefix+'Halka açık başlık gerekli.');if(!t.blocks.length)issues.push(prefix+'En az bir içerik bloğu gerekli.');
    for(const [index,b]of t.blocks.entries()){const p=prefix+(index+1)+'. blok: ';switch(b.type){case'heading':case'paragraph':case'notice':if(!b.text.trim())issues.push(p+'Metin boş.');break;case'list':if(!b.items.length||b.items.some(i=>!i.trim()))issues.push(p+'Liste öğeleri boş olamaz.');break;case'image':if(!b.mediaId||!b.alt.trim())issues.push(p+'Görsel ve alternatif metni gerekli.');break;case'download':if(!b.mediaId||!b.label.trim())issues.push(p+'PDF ve görünen bağlantı adı gerekli.');break;case'button':if(!b.label.trim()||b.target==='EXTERNAL'&&!b.url||b.target==='PAGE'&&!b.pageSlug)issues.push(p+'Buton etiketi ve hedefi gerekli.');break;case'table':if(!b.caption.trim()||!b.headers.length||b.headers.some(h=>!h.trim())||!b.rows.length||b.rows.some(row=>row.length!==b.headers.length))issues.push(p+'Tablo adı, sütun başlıkları ve eşit sütunlu satırlar gerekli.');break;}}
  }return issues;
}
export type CmsMediaView={id:string;kind:'IMAGE'|'PDF';width:number|null;height:number|null;url:string};
export function blockHref(block:Extract<CmsBlock,{type:'button'}>,slug:string,modules:{SUBMISSIONS:boolean;REGISTRATION:boolean},pages:readonly string[]){switch(block.target){case'EXTERNAL':return block.url||null;case'PAGE':return pages.includes(block.pageSlug)?`/${slug}/sayfalar/${block.pageSlug}`:null;case'SUBMISSIONS':return modules.SUBMISSIONS?`/${slug}/bildiri-gonder`:null;case'REGISTRATION':return modules.REGISTRATION?`/${slug}/kayit`:null;}}
