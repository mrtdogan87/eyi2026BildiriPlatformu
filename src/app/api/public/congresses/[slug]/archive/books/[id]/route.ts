import {apiRoute} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {archivedBook} from '@/integrations/congress/archive';
export const GET=apiRoute(async(_request,context:{params:Promise<{slug:string;id:string}>})=>{const p=await context.params,f=await archivedBook(p.slug,p.id);return privateFile(f.content,f.mime,f.name);});
