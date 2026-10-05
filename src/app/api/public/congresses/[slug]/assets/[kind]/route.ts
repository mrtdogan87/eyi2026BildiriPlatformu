import { apiRoute } from '@/platform/http';
import { publicSiteAsset } from '@/modules/site/service';
export const GET=apiRoute(async(_:Request,{params}:{params:Promise<{slug:string;kind:string}>})=>{const {slug,kind}=await params;return publicSiteAsset(slug,kind);});
