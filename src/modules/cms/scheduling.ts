import {z} from 'zod';
const reason=z.string().trim().min(8).max(2000);
const common={version:z.number().int().min(1),reason,confirmed:z.literal(true)};
export const scheduleInputSchema=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('SCHEDULE'),expectedScheduleId:z.string().uuid().nullable(),dueAt:z.string().datetime({offset:true})}).strict(),
 z.object({...common,action:z.literal('CANCEL'),scheduleId:z.string().uuid()}).strict(),
]);
export function futureScheduleDate(value:string,now=new Date()){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime())||date<=now)throw new Error('Yayın zamanı gelecekte olmalı.');
 return date;
}
export function istanbulScheduleInput(value:string|Date){return new Date(new Date(value).getTime()+3*60*60*1000).toISOString().slice(0,16);}
export function istanbulScheduleIso(value:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('İstanbul saatine göre geçerli tarih ve saat girin.');
 const date=new Date(value+':00+03:00');
 if(!Number.isFinite(date.getTime())||istanbulScheduleInput(date)!==value)throw new Error('Geçerli tarih ve saat girin.');
 return date.toISOString();
}
export const scheduleStatusLabels={PENDING:'Zamanı bekleniyor',PUBLISHED:'Yayımlandı',CANCELLED:'İptal edildi',BLOCKED:'Yayımlanmadı; yeni onay gerekli'} as const;
