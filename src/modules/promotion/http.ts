import {z} from 'zod';
import {AccessError} from '@/platform/http';
import {PromotionError} from './core';
export function parsed<T>(schema:z.ZodType<T>,raw:unknown){const result=schema.safeParse(raw);if(!result.success)throw new AccessError(400,result.error.issues[0]?.message??'Tanıtım alanlarını kontrol edin.');return result.data;}
export async function promotionAction<T>(fn:()=>Promise<T>){try{return await fn();}catch(e){if(e instanceof PromotionError)throw new AccessError(e.status,e.message);throw e;}}
export async function promotionJson(request:Request){const reader=request.body?.getReader();if(!reader)throw new AccessError(400,'İstek gerekli.');const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>64000){await reader.cancel();throw new AccessError(413,'İstek en fazla 64 KB olmalı.');}chunks.push(part.value);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{throw new AccessError(400,'Geçerli JSON gerekli.');}}
