import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateFile } from '@/integrations/congress/certificates';
export const GET=apiRoute(async(_request,context:{params:Promise<{id:string}>})=>{const c=await requireContext('own','CERTIFICATES'),f=await certificateFile((await context.params).id,{congressId:c.congress.id,email:c.actor.email});return new Response(new Uint8Array(f.pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${f.filename}"`,'X-Content-Type-Options':'nosniff'}});});
