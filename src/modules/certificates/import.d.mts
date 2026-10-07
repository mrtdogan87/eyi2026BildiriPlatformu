import type { RecipientData } from './core';
export type ListTable={headers:string[];rows:{line:number;cells:string[];shapeError:boolean}[]};
export function readCsv(text:string):ListTable;
export function readXlsx(bytes:Uint8Array):Promise<ListTable>;
export function readList(bytes:Uint8Array,name:string):Promise<ListTable>;
export function mapRows(table:ListTable,mapping:Record<string,string|undefined>,defaultEvent?:string,allowedRoleKeys?:readonly string[]):{valid:{line:number;email:string;role:string;contextKey:string;data:RecipientData}[];errors:{line:number;message:string}[];total:number;headers:string[]};
export function importHash(value:unknown):string;
