import {apiRoute} from '@/platform/http';
import {reviewEvidence} from '@/integrations/congress/reviews';
export const GET=apiRoute(async(_:Request,{params}:{params:Promise<{id:string}>})=>reviewEvidence((await params).id));
