import type {Prisma,PrismaClient} from '@prisma/client';
export function cmsSourceHash(value:unknown):string;
export function scheduledActorRole(user:{active:boolean;platformAdmin:boolean}|null,org:{active:boolean;organizer:boolean}|null,member:{active:boolean;role:string}|null):string|null;
export function scheduledSourceCurrent(schedule:{pageId:string;sourceRevisionId:string;congressId:string;sourceVersion:number;sourceHash:string},page:{id:string;congressId:string;version:number;archived:boolean;draft:unknown}|null,source:{id:string;pageId:string;number:number;content:unknown}|null):boolean;
export function invalidateCmsSchedules(tx:Prisma.TransactionClient,input:{pageId:string;actorId:string;congressId:string;organizationId:string;reason:string;now?:Date}):Promise<number>;
export function processCmsSchedules(input:{prisma:PrismaClient;now?:Date;limit?:number;congressId?:string}):Promise<{scanned:number;results:{id:string;status:'PUBLISHED'|'BLOCKED'}[]}>;
