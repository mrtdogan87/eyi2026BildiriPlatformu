import type {PromotionSettings} from './core';
export type PromotionText={title:string;subtitle:string;invitation:string;eventName:string;organization:string;date:string;venue:string;signature:string;website:string};
export function checksum(bytes:Uint8Array):string;
export function fingerprint(value:unknown):string;
export function renderPromotion(input:{text:PromotionText;settings:PromotionSettings;image?:Uint8Array;kind:'INVITATION'|'POSTER';format:'PRINT'|'WEB'|'SQUARE'|'STORY'}):Promise<{content:Uint8Array;preview:Uint8Array|null;mime:string;extension:string;width:number;height:number;pages:number;checksum:string}>;
