import {z} from 'zod';
import {AccessError} from '@/platform/http';
import {PublicationError} from './core';
export function parsed<T>(schema:z.ZodType<T>,input:unknown):T{const r=schema.safeParse(input);if(!r.success)throw new AccessError(400,r.error.issues[0]?.message??'Yayın alanlarını kontrol edin.');return r.data;}
export async function publicationAction<T>(fn:()=>Promise<T>){try{return await fn();}catch(e){if(e instanceof PublicationError)throw new AccessError(e.status,e.message);throw e;}}
export async function publicationJson(request:Request){const reader=request.body?.getReader();if(!reader)throw new AccessError(400,'İstek gerekli.');let size=0;const chunks:Uint8Array[]=[];while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>128000){await reader.cancel();throw new AccessError(413,'İstek en fazla 128 KB.');}chunks.push(r.value);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new AccessError(400,'Geçerli JSON gerekli.');}}
