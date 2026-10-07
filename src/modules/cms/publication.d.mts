import type {Prisma} from '@prisma/client';
import type {CmsDocument} from './configuration';
export class CmsPublicationError extends Error{status:number;constructor(message:string,status?:number);}
export function validateCmsPublication(tx:Prisma.TransactionClient,input:{congressId:string;page:{slug:string};doc:CmsDocument;configuration:unknown}):Promise<string[]>;
