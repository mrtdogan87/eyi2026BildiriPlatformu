import {apiRoute} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {promotionFile} from '@/integrations/congress/promotion';
export const GET=apiRoute(async(_r,{params}:{params:Promise<{id:string}>})=>{const f=await promotionFile((await params).id);return privateFile(f.content,f.mime,f.name);});
