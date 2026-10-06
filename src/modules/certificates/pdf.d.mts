import type { Layout, RecipientData } from './core';
export function inspectBackground(bytes:Uint8Array):Promise<{width:number;height:number;hash:string}>;
export function wrapText(text:string,size:number,width:number,measure:(text:string,size:number)=>number):string[];
export function fitText(text:string,slot:Layout[number],measure:(text:string,size:number)=>number):{size:number;lines:string[];shrunk:boolean};
export function renderCertificate(input:{background:Uint8Array;layout:Layout;data:RecipientData;number:string;verificationCode:string;role:string;createdAt?:Date}):Promise<{pdf:Uint8Array<ArrayBuffer>;placements:{field:string;size:number;lines:string[];shrunk:boolean}[];width:number;height:number;checksum:string}>;
export function sampleBackground(width?:number,height?:number):Promise<Uint8Array<ArrayBuffer>>;
