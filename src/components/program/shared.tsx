'use client';
import type { FormEvent } from 'react';
import {uiMutationStart,uiMutationEnd} from '@/components/admin-ui/mutation';
import { istanbulDate } from '@/modules/program/core';
export const form=(e:FormEvent<HTMLFormElement>)=>new FormData(e.currentTarget);
export const value=(f:FormData,k:string)=>String(f.get(k)??'');
export const check=(f:FormData,k:string)=>f.get(k)==='on';
export const dateValue=(f:FormData,k:string)=>istanbulDate(value(f,k));
export const displayDate=(v:string,en=false)=>new Date(v).toLocaleString(en?'en-GB':'tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'medium',timeStyle:'short'});
export async function request<T>(url:string,body?:unknown):Promise<T>{const id=uiMutationStart(url,body);try{const r=await fetch(url,{cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw new Error(data.error??'İşlem kaydedilemedi.');uiMutationEnd(id,true);return data;}catch(e){uiMutationEnd(id,false);throw e;}}
export function Confirmation({en=false}:{en?:boolean}){return <label className="checkbox-field"><input name="confirmed" type="checkbox" required/> {en?'I checked the person, context, time and reason; I confirm this action.':'Hedef kişi, oturum, zaman ve gerekçeyi kontrol ettim; işlemi onaylıyorum.'}</label>;}
export function Reason({en=false}:{en?:boolean}){return <label className="field">{en?'Reason for this action':'İşlem gerekçesi'}<textarea name="reason" required minLength={8} maxLength={2000} rows={2}/></label>;}
export function Field({label,name,initial='',type='text',required=true}:{label:string;name:string;initial?:string;type?:string;required?:boolean}){return <label className="field">{label}<input name={name} type={type} placeholder={type==='email'?'ad.soyad@example.com':undefined} autoComplete={type==='email'?'off':undefined} inputMode={type==='email'?'email':undefined} spellCheck={type==='email'?false:undefined} defaultValue={initial} required={required} maxLength={type==='text'?300:undefined}/></label>;}
