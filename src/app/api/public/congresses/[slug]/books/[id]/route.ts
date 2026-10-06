import {apiRoute} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {publicBook} from '@/integrations/congress/books';
export const GET=apiRoute(async(_request,context:{params:Promise<{slug:string;id:string}>})=>{const p=await context.params,f=await publicBook(p.slug,p.id);return privateFile(f.content,f.mime,f.name);});
