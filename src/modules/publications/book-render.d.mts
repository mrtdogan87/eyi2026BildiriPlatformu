import type {BookSnapshot} from './books';
export function abstractSections(source:{structuredAbstract:unknown;abstract:string},locale:'tr'|'en'):{label:string;text:string}[];
export function wrapText(font:unknown,text:string,size:number,width:number):string[];
export function renderBook(snapshot:BookSnapshot,options?:{files?:Map<string,Uint8Array>;fontData?:Uint8Array}):Promise<{content:Uint8Array;pages:number;contents:{title:string;page:number}[];authorIndex:{name:string;institution:string;localPage:number;page:number}[]}>;
