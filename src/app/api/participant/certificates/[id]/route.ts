import { apiRoute } from '@/platform/http';
import { participantIdentity } from '@/modules/participation/session';
import { certificateFile } from '@/integrations/congress/certificates';
export const GET=apiRoute(async(request,context:{params:Promise<{id:string}>})=>{const i=await participantIdentity(new URL(request.url).searchParams.get('congressSlug')??''),f=await certificateFile((await context.params).id,i);return new Response(new Uint8Array(f.pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${f.filename}"`,'X-Content-Type-Options':'nosniff'}});});
