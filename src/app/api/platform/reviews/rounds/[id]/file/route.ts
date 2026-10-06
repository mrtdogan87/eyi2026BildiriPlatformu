import {apiRoute} from '@/platform/http';
import {reviewFile} from '@/integrations/congress/reviews';
export const GET=apiRoute(async(_:Request,{params}:{params:Promise<{id:string}>})=>reviewFile((await params).id,true));
