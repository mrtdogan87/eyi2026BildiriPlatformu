import {z} from 'zod';
const text=(max:number)=>z.string().trim().max(max).refine(v=>!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),'Kontrol karakteri kullanmayın.');
const safeUrl=text(500).refine(v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Web adresi kullanıcı bilgisi içermeyen HTTPS olmalı.');
export const settingsSchema=z.object({titleTr:text(300).min(3),titleEn:text(300),subtitleTr:text(300),subtitleEn:text(300),invitationTr:text(8000).min(20),invitationEn:text(8000),venueTr:text(400),venueEn:text(400),signatureTr:text(400),signatureEn:text(400),website:safeUrl,accent:z.string().regex(/^#[a-fA-F0-9]{6}$/),template:z.enum(['ACADEMIC','UPLOADED']),imageFit:z.enum(['CONTAIN','COVER'])}).strict();
export type PromotionSettings=z.infer<typeof settingsSchema>;
export const defaultSettings:PromotionSettings={titleTr:'{eventName}',titleEn:'{eventName}',subtitleTr:'Bilimsel buluşmaya davet',subtitleEn:'Invitation to an academic gathering',invitationTr:'Değerli meslektaşlarımız,\n\n{organization} tarafından düzenlenen {eventName} etkinliğine davetlisiniz.\n\nTarih: {date}\nYer: {venue}\n\nBilimsel paylaşım ve tartışma için sizlerle bir araya gelmekten mutluluk duyacağız.\n\n{signature}',invitationEn:'Dear colleagues,\n\nYou are invited to {eventName}, organized by {organization}.\n\nDate: {date}\nVenue: {venue}\n\nWe look forward to meeting you for scientific exchange and discussion.\n\n{signature}',venueTr:'',venueEn:'',signatureTr:'Düzenleme Kurulu',signatureEn:'Organizing Committee',website:'',accent:'#164E63',template:'ACADEMIC',imageFit:'CONTAIN'};
export const approval={reason:text(2000).min(8),confirmed:z.literal(true)},version=z.number().int().min(0);
export const saveInput=z.object({...approval,version,id:z.string().uuid().nullable(),settings:settingsSchema,imageId:z.string().uuid().nullable()}).strict();
export const outputInput=z.object({version,kind:z.enum(['INVITATION','POSTER']),format:z.enum(['PRINT','WEB','SQUARE','STORY']),locale:z.enum(['tr','en'])}).strict().refine(v=>v.kind!=='INVITATION'||v.format==='PRINT','Davet mektubu baskı PDF biçimindedir.');
export const generateInput=outputInput.safeExtend({...approval,previewHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const publishInput=z.object({...approval,id:z.string().uuid(),version,published:z.boolean()}).strict();
export const sizes={PRINT:{width:2480,height:3508},WEB:{width:1200,height:675},SQUARE:{width:1080,height:1080},STORY:{width:1080,height:1920}} as const;
export type OutputInput=z.infer<typeof outputInput>;
export class PromotionError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function sameVersion(expected:number,actual:number){if(expected!==actual)throw new PromotionError('Tanıtım kaynağı değişti; yeniden önizleyin.',409);}
export const placeholders=['eventName','organization','date','venue','signature','website'] as const;
export function interpolate(template:string,values:Record<string,string>){return template.replace(/\{([^{}]+)\}/g,(_m,key:string)=>{if(!placeholders.includes(key as typeof placeholders[number]))throw new PromotionError('Bilinmeyen metin alanı: '+key);return values[key]??'';});}
export type PromotionValues={eventName:string;organization:string;date:string;venue:string;signature:string;website:string};
export function resolvedText(s:PromotionSettings,values:PromotionValues,locale:'tr'|'en'){
 const en=locale==='en';if(en&&(!s.titleEn||!s.invitationEn))throw new PromotionError('İngilizce çıktı için ayrı başlık ve davet metnini tamamlayın.');
 return {title:interpolate(en?s.titleEn:s.titleTr,values),subtitle:interpolate(en?s.subtitleEn:s.subtitleTr,values),invitation:interpolate(en?s.invitationEn:s.invitationTr,values),...values};
}
