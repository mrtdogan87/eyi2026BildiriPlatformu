import {apiRoute} from '@/platform/http';
import {privateFile} from '@/platform/files';
import {publicPromotionFile} from '@/integrations/congress/promotion';
export const GET=apiRoute(async(_r,{params}:{params:Promise<{slug:string;id:string}>})=>{const {slug,id}=await params,f=await publicPromotionFile(slug,id);return privateFile(f.content,f.mime,f.name);});
