import {z} from 'zod';
export const recordKinds=['PERSON','ORGANIZATION','COMMITTEE','TASK','SPEAKER','PANEL','VENUE','HOTEL','TRANSFER','TRIP','SPONSOR','ANNOUNCEMENT','NEWS','EVENT','GALLERY'] as const;
export const dynamicSources=[...recordKinds,'DATES','FEES','FEEDBACK'] as const;
export type RecordKind=typeof recordKinds[number];
export type DynamicSource=typeof dynamicSources[number];
export const recordLabels:Record<DynamicSource,string>={PERSON:'Kişiler',ORGANIZATION:'Kurum / organizasyonlar',COMMITTEE:'Kurullar',TASK:'Görevler',SPEAKER:'Konuşmacılar',PANEL:'Paneller',VENUE:'Mekânlar',HOTEL:'Oteller',TRANSFER:'Transferler',TRIP:'Geziler',SPONSOR:'Sponsorlar',ANNOUNCEMENT:'Duyurular',NEWS:'Haberler',EVENT:'Etkinlikler',GALLERY:'Galeri',DATES:'Önemli tarihler (işlem ayarları)',FEES:'Ücretler (kayıt tarifeleri)',FEEDBACK:'Geri bildirim formu'};
const id=z.string().max(100);const pair=(max:number)=>z.object({tr:z.string().trim().max(max),en:z.string().trim().max(max)}).strict();
const date=z.union([z.literal(''),z.string().datetime({offset:true})]);
export const https=z.string().trim().max(500).refine(v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Kullanıcı bilgisi içermeyen HTTPS adresi gerekli.');
const translation=z.object({enabled:z.boolean(),title:z.string().trim().max(180),body:z.string().trim().max(10000)}).strict();
export const recordDocument=z.object({version:z.literal(1),kind:z.enum(recordKinds),sortOrder:z.number().int().min(0).max(10000),translations:z.object({tr:translation,en:translation}).strict(),organizationId:id,venueId:id,
 people:z.array(z.object({personId:id.min(1),role:pair(180),talk:pair(250),pageSlug:z.string().max(70).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict()).max(100),
 images:z.array(z.object({mediaId:id.min(1),alt:pair(250),caption:pair(500)}).strict()).max(24),
 startsAt:date,endsAt:date,address:z.string().trim().max(500),location:z.string().trim().max(500),publicEmail:z.union([z.literal(''),z.email().max(180)]),publicPhone:z.string().trim().max(80),
 link:z.object({target:z.enum(['NONE','PAGE','FILE','EXTERNAL']),label:pair(100),pageSlug:z.string().max(70).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/),url:https,mediaId:id}).strict()
}).strict().superRefine((v,c)=>{
 const issue=(message:string)=>c.addIssue({code:'custom',message});
 if(v.endsAt&&(!v.startsAt||new Date(v.endsAt)<new Date(v.startsAt)))issue('Bitiş için sıralı başlangıç tarihi gerekli.');
 if(new Set(v.people.map(p=>p.personId)).size!==v.people.length)issue('Aynı kişi bu kayda bir kez eklenir; görevleri aynı etiketle belirtin.');
 if(new Set(v.images.map(p=>p.mediaId)).size!==v.images.length)issue('Görsel tekrar edemez.');
 if(v.kind==='PERSON'&&(v.people.length||v.venueId))issue('Kişi kaydı kişi listesi veya mekân içermez.');
 if(v.organizationId&&v.kind==='ORGANIZATION')issue('Organizasyon başka organizasyona bağlanamaz.');
 if(v.venueId&&v.kind==='VENUE')issue('Mekân başka mekâna bağlanamaz.');
 if(JSON.stringify(v).length>150000)issue('Kayıt çok büyük.');
});
export type RecordDocument=z.infer<typeof recordDocument>;
export function emptyRecord(kind:RecordKind):RecordDocument{return {version:1,kind,sortOrder:10,translations:{tr:{enabled:true,title:'',body:''},en:{enabled:false,title:'',body:''}},organizationId:'',venueId:'',people:[],images:[],startsAt:'',endsAt:'',address:'',location:'',publicEmail:'',publicPhone:'',link:{target:'NONE',label:{tr:'',en:''},pageSlug:'',url:'',mediaId:''}};}
export function recordProblems(d:RecordDocument,languages:readonly ('TR'|'EN')[]=['TR','EN']){const issues:string[]=[];if(!languages.some(l=>d.translations[l==='TR'?'tr':'en'].enabled))issues.push('Kongrede açık bir dil seçin.');for(const lang of ['tr','en'] as const){const t=d.translations[lang];if(!t.enabled)continue;if(!t.title)issues.push(lang.toUpperCase()+': halka açık başlık gerekli.');if(d.images.some(i=>!i.alt[lang]))issues.push(lang.toUpperCase()+': görsel alternatif metni gerekli.');if(d.link.target!=='NONE'&&!d.link.label[lang])issues.push(lang.toUpperCase()+': bağlantı etiketi gerekli.');}if(['COMMITTEE','TASK','SPEAKER','PANEL'].includes(d.kind)&&!d.people.length)issues.push('En az bir kişi seçin.');if(d.kind==='GALLERY'&&!d.images.length)issues.push('Galeri için görsel seçin.');if(d.link.target==='PAGE'&&!d.link.pageSlug||d.link.target==='FILE'&&!d.link.mediaId||d.link.target==='EXTERNAL'&&!d.link.url)issues.push('Bağlantı hedefi gerekli.');return issues;}
export function recordMedia(d:RecordDocument){return [...new Set([...d.images.map(i=>i.mediaId),...(d.link.target==='FILE'&&d.link.mediaId?[d.link.mediaId]:[])])];}
export function recordTranslation(d:RecordDocument,lang:'tr'|'en'){const other=lang==='tr'?'en':'tr';const locale=d.translations[lang].enabled&&d.translations[lang].title?lang:other;const t=d.translations[locale];return t.enabled&&t.title?{...t,locale}:null;}
export const feedbackNoticeVersion='feedback-v1';
export const feedbackNotices={tr:'Adınız, e-posta adresiniz ve mesajınız kongre yönetimi tarafından talebinizi incelemek ve yanıtlamak için saklanır. Mesajınız halka açık sitede yayımlanmaz. Parola, ödeme bilgisi veya kişisel belge göndermeyin.',en:'Your name, email address and message are stored by the congress team to review and respond to your request. Your message is not published. Do not send passwords, payment details or personal documents.'};
export const feedbackInput=z.object({requestKey:z.uuid(),senderName:z.string().trim().min(2).max(120),email:z.email().max(180).transform(s=>s.toLowerCase()),subject:z.string().trim().min(3).max(180),message:z.string().trim().min(10).max(5000),noticeVersion:z.literal(feedbackNoticeVersion),acknowledged:z.literal(true),locale:z.enum(['tr','en']),website:z.string().max(100).default('')}).strict();
