import {z} from 'zod';
const text=(max:number)=>z.string().trim().max(max).refine(v=>!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v),'Kontrol karakteri kullanmayın.');
const email=z.string().trim().toLowerCase().email().max(254),version=z.number().int().min(0);
export const approval={reason:text(2000).min(8),confirmed:z.literal(true)};
export const preferencesSchema=z.object({abstractBook:z.boolean(),fullTextBook:z.boolean(),journalRequest:z.boolean()}).strict();
export const defaultPreferences={abstractBook:false,fullTextBook:false,journalRequest:false};
export const calendarSchema=z.object({deliveryDeadline:z.iso.datetime(),revisionDeadline:z.iso.datetime()}).strict().refine(v=>new Date(v.revisionDeadline)>=new Date(v.deliveryDeadline),'Revizyon süresi teslim süresinden önce olamaz.');
export const calendarInput=z.object({...approval,version,calendar:calendarSchema}).strict();
export const authorSchema=z.object({name:text(200).min(2),email,institution:text(300)}).strict();
export const sourceSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('SUBMISSION'),submissionId:text(100).min(1),correctionVersion:version,ownerEmail:email}).strict(),
 z.object({type:z.literal('MANUAL'),reference:text(120).min(2),title:text(500).min(3),abstract:text(20000).min(20),authors:z.array(authorSchema).min(1).max(30),ownerEmail:email,locale:z.enum(['tr','en'])}).strict().refine(v=>v.authors.some(a=>a.email===v.ownerEmail),'Yayın sorumlusu yazarlardan biri olmalı.')
]);
export const createInput=z.object({...approval,source:sourceSchema}).strict();
export const itemInput=z.object({...approval,itemId:z.string().uuid(),version}).strict();
export const sourceInput=itemInput.extend({source:sourceSchema}).strict();
export const preferenceInput=itemInput.extend({preferences:preferencesSchema}).strict();
export const uploadInput=itemInput.extend({kind:z.enum(['FULL_TEXT','PROOF'])}).strict();
export const proofInput=itemInput.extend({fileId:z.string().uuid()}).strict();
export const authorInput=itemInput.extend({proofId:z.string().uuid(),proofHash:z.string().regex(/^[a-f0-9]{64}$/),approved:z.boolean()}).strict();
export const readyInput=itemInput.extend({proofId:z.string().uuid(),approvalId:z.string().uuid(),ready:z.boolean()}).strict();
export const referralInput=itemInput.extend({proofId:z.string().uuid(),destination:text(300).min(3),reference:text(300)}).strict();
export type Preferences=z.infer<typeof preferencesSchema>;
export type PublicationSource=z.infer<typeof sourceSchema>;
export class PublicationError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function sameVersion(expected:number,actual:number){if(expected!==actual)throw new PublicationError('Yayın kaynağı değişti; güncel kaydı açın.',409);}
export function beforeDeadline(value:string,now=new Date()){if(now>new Date(value))throw new PublicationError('Bu tam metin teslim/revizyon süresi kapalı.',409);}
export function canCompileFullText(f:{current:boolean;approved:boolean;ready:boolean;preferences:Preferences}){return f.current&&f.approved&&f.ready&&f.preferences.fullTextBook;}
