import {apiRoute} from '@/platform/http';
import {privateCmsMedia} from '@/modules/cms/service';
type P={params:Promise<{id:string}>};
export const GET=apiRoute(async(_request,context:P)=>privateCmsMedia((await context.params).id));
