import {z} from 'zod';
import {recordDocument} from '../content/configuration.ts';
import {participationModeLabels,type InvitationFacts} from '../congress/configuration.ts';
const text=(max:number)=>z.string().trim().max(max).refine(v=>!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),'Kontrol karakteri kullanmayın.');
const safeUrl=text(500).refine(v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Web adresi kullanıcı bilgisi içermeyen HTTPS olmalı.');
const chairSourceSchema=z.object({recordId:text(100).min(1),personId:text(100).min(1)}).strict();
export const settingsSchema=z.object({titleTr:text(300).min(3),titleEn:text(300),subtitleTr:text(300),subtitleEn:text(300),invitationTr:text(8000).min(20),invitationEn:text(8000),venueTr:text(400),venueEn:text(400),signatureTr:text(400),signatureEn:text(400),website:safeUrl,accent:z.string().regex(/^#[a-fA-F0-9]{6}$/),template:z.enum(['ACADEMIC','UPLOADED']),imageFit:z.enum(['CONTAIN','COVER']),chairSource:chairSourceSchema.nullable().default(null)}).strict();
export type PromotionSettings=z.infer<typeof settingsSchema>;
export const defaultSettings:PromotionSettings={titleTr:'{eventName}',titleEn:'{eventName}',subtitleTr:'Bilimsel buluşmaya davet',subtitleEn:'Invitation to an academic gathering',invitationTr:'Değerli meslektaşlarımız,\n\n{organization} tarafından düzenlenen {eventName} etkinliğine davetlisiniz.\n\nTarih: {date}\nYer: {venue}\n\nBilimsel paylaşım ve tartışma için sizlerle bir araya gelmekten mutluluk duyacağız.\n\n{signature}',invitationEn:'Dear colleagues,\n\nYou are invited to {eventName}, organized by {organization}.\n\nDate: {date}\nVenue: {venue}\n\nWe look forward to meeting you for scientific exchange and discussion.\n\n{signature}',venueTr:'',venueEn:'',signatureTr:'Düzenleme Kurulu',signatureEn:'Organizing Committee',website:'',accent:'#164E63',template:'ACADEMIC',imageFit:'CONTAIN',chairSource:null};
export const approval={reason:text(2000).min(8),confirmed:z.literal(true)},version=z.number().int().min(0);
export const saveInput=z.object({...approval,version,id:z.string().uuid().nullable(),settings:settingsSchema,imageId:z.string().uuid().nullable()}).strict();
export const outputInput=z.object({version,kind:z.enum(['INVITATION','POSTER']),format:z.enum(['PRINT','WEB','SQUARE','STORY']),locale:z.enum(['tr','en'])}).strict().refine(v=>v.kind!=='INVITATION'||v.format==='PRINT','Davet mektubu baskı PDF biçimindedir.');
export const generateInput=outputInput.safeExtend({...approval,previewHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const publishInput=z.object({...approval,id:z.string().uuid(),version,published:z.boolean()}).strict();
export const sizes={PRINT:{width:2480,height:3508},WEB:{width:1200,height:675},SQUARE:{width:1080,height:1080},STORY:{width:1080,height:1920}} as const;
export type OutputInput=z.infer<typeof outputInput>;
export class PromotionError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function sameVersion(expected:number,actual:number){if(expected!==actual)throw new PromotionError('Tanıtım kaynağı değişti; yeniden önizleyin.',409);}
export const placeholders=['eventName','organization','date','venue','signature','website','theme','participationMode','chair'] as const;
const sourceLabels:Record<string,string>={theme:'Bilimsel tema',participationMode:'Katılım biçimi',chair:'Başkan'};
export function interpolate(template:string,values:Record<string,string|undefined>){return template.replace(/\{([^{}]+)\}/g,(_m,key:string)=>{if(!placeholders.includes(key as typeof placeholders[number]))throw new PromotionError('Bilinmeyen metin alanı: '+key);if(sourceLabels[key]&&!values[key])throw new PromotionError(sourceLabels[key]+' kaynağını bu çıktı dilinde tamamlayın veya {'+key+'} alanını metinden kaldırın.',422);return values[key]??'';});}
export type PromotionValues={eventName:string;organization:string;date:string;venue:string;signature:string;website:string;theme?:string;participationMode?:string;chair?:string};

export type PromotionChairRecord={id:string;kind:string;archived:boolean;publishedVersion:number|null;published:unknown};
export function resolveChairSource(binding:PromotionSettings['chairSource'],records:PromotionChairRecord[],locale:'tr'|'en'){
 if(!binding)return null;
 const record=records.find(r=>r.id===binding.recordId&&!r.archived&&r.publishedVersion&&['COMMITTEE','TASK'].includes(r.kind));
 const person=records.find(r=>r.id===binding.personId&&!r.archived&&r.publishedVersion&&r.kind==='PERSON');
 if(!record||!person)throw new PromotionError('Başkan için seçilen kurul/görev ve kişi bu kongrede yayımlanmış olmalı.',422);
 const d=recordDocument.parse(record.published),p=recordDocument.parse(person.published),relation=d.people.find(r=>r.personId===person.id);
 if(!relation)throw new PromotionError('Başkanın seçilen kurul/görev ilişkisi değişti; kaynağı yeniden seçin.',422);
 const title=d.translations[locale],name=p.translations[locale],role=relation.role[locale].trim();
 if(!title.enabled||!title.title||!name.enabled||!name.title||!role)throw new PromotionError('Başkan kaynağında '+locale.toUpperCase()+' kurul/görev, kişi adı ve rol çevirisini yayımlayın.',422);
 return {text:name.title+' · '+role,evidence:{recordId:record.id,recordVersion:record.publishedVersion,personId:person.id,personVersion:person.publishedVersion,locale,name:name.title,role}};
}
export function chairSourceOptions(records:PromotionChairRecord[]){
 const options=[];
 for(const r of records){if(r.archived||!r.publishedVersion||!['COMMITTEE','TASK'].includes(r.kind))continue;const d=recordDocument.parse(r.published);
  for(const p of d.people){const binding={recordId:r.id,personId:p.personId},labels:Partial<Record<'tr'|'en',string>>={};
   for(const locale of ['tr','en'] as const){try{const resolved=resolveChairSource(binding,records,locale);if(resolved)labels[locale]=d.translations[locale].title+' — '+resolved.text;}catch(e){if(!(e instanceof PromotionError))throw e;}}
   if(labels.tr||labels.en)options.push({binding,labels});
  }
 }return options;
}
export function linkedPromotionSource(facts:InvitationFacts,binding:PromotionSettings['chairSource'],records:PromotionChairRecord[],locale:'tr'|'en'){
 const chair=resolveChairSource(binding,records,locale),values:Pick<PromotionValues,'theme'|'participationMode'|'chair'>={};
 if(facts.theme[locale])values.theme=facts.theme[locale];
 if(facts.participationMode)values.participationMode=participationModeLabels[facts.participationMode][locale];
 if(chair)values.chair=chair.text;
 const linked=!!(facts.theme.tr||facts.theme.en||facts.participationMode||binding);
 return {values,evidence:linked?{invitationFacts:facts,chair:chair?.evidence??null}:null};
}
// Empty optional bindings must not invalidate pre-existing manually edited outputs.
export function promotionSettingsSnapshot(settings:PromotionSettings){const {chairSource,...legacy}=settings;return chairSource?settings:legacy;}
export function resolvedText(s:PromotionSettings,values:PromotionValues,locale:'tr'|'en'){
 const en=locale==='en';if(en&&(!s.titleEn||!s.invitationEn))throw new PromotionError('İngilizce çıktı için ayrı başlık ve davet metnini tamamlayın.');
 return {title:interpolate(en?s.titleEn:s.titleTr,values),subtitle:interpolate(en?s.subtitleEn:s.subtitleTr,values),invitation:interpolate(en?s.invitationEn:s.invitationTr,values),...values};
}
