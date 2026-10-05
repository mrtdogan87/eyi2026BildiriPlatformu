import {apiRoute} from '@/platform/http';
import {publicCmsMedia} from '@/modules/cms/public';
type P={params:Promise<{slug:string;id:string}>};
export const GET=apiRoute(async(_request,context:P)=>{const {slug,id}=await context.params;return publicCmsMedia(slug,id);});
