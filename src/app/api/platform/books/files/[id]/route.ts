import {apiRoute} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {privateBook} from '@/integrations/congress/books';
export const GET=apiRoute(async(_request,context:{params:Promise<{id:string}>})=>{const f=await privateBook((await context.params).id);return privateFile(f.content,f.mime,f.name);});
