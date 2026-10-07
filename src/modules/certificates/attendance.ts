import {z} from 'zod';
import {confirmation,roles,certificateRoleSchema} from './core.ts';
export const ruleSettings=z.object({enabled:z.boolean(),paymentRequired:z.boolean(),attendanceRequired:z.boolean()}).strict();
export const ruleInput=z.object({...confirmation,role:certificateRoleSchema,version:z.number().int().min(0),settings:ruleSettings}).strict();
export function eligibilitySourceProblems(v:{sessionId?:string;talkId?:string;dutyId?:string;submissionId?:string;registrationId?:string},role:string){
 const problems:string[]=[];
 if(['PRESENTER','SPEAKER','DUTY'].includes(role)&&!v.sessionId)problems.push('Program oturumu gerekli.');
 if(['PRESENTER','SPEAKER'].includes(role)&&!v.talkId)problems.push('Sunum seçin.');
 if(role==='DUTY'&&!v.dutyId)problems.push('Kabul edilmiş görevi seçin.');
 if(role==='COAUTHOR'&&!v.submissionId)problems.push('Ortak yazar bildirisini seçin.');
 if(['PARTICIPANT','LISTENER'].includes(role)&&!v.registrationId)problems.push('Kongre kaydını seçin.');
 if((!['PRESENTER','SPEAKER'].includes(role)&&v.talkId)||(role!=='DUTY'&&v.dutyId)||(role!=='COAUTHOR'&&v.submissionId))problems.push('Göreve uymayan kaynak alanı.');
 return problems;
}
export const eligibilitySelection=z.object({email:z.string().trim().toLowerCase().email().max(254),role:certificateRoleSchema,sessionId:z.string().uuid().optional(),talkId:z.string().uuid().optional(),dutyId:z.string().uuid().optional(),submissionId:z.string().min(1).max(128).optional(),registrationId:z.string().min(1).max(128).optional(),recipientName:z.string().trim().min(2).max(300).optional(),institution:z.string().trim().max(600).optional()}).strict().superRefine((v,ctx)=>{if((roles as readonly string[]).includes(v.role))for(const message of eligibilitySourceProblems(v,v.role))ctx.addIssue({code:'custom',message});});
export const eligibilityTransfer=z.object({...confirmation,templateId:z.string().uuid(),templateVersion:z.number().int().min(0),selection:eligibilitySelection,previewHash:z.string().length(64),recipientVersion:z.number().int().min(0).optional()}).strict();
export const attendanceInput=z.object({...confirmation,sessionId:z.string().uuid(),sessionVersion:z.number().int().min(0),kind:z.enum(['ATTENDANCE','PRESENTATION','DUTY']),contextKey:z.string().max(128).default(''),email:z.string().trim().toLowerCase().email().max(254),recipientName:z.string().trim().min(2).max(300),version:z.number().int().min(0),status:z.enum(['PRESENT','ABSENT','EXCUSED']),sourceFingerprint:z.string().length(64)}).strict();
