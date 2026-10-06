import { apiRoute } from '@/platform/http';
import { certificateFile } from '@/integrations/congress/certificates';
export const GET=apiRoute(async(_request,context:{params:Promise<{id:string}>})=>{const f=await certificateFile((await context.params).id);return new Response(new Uint8Array(f.pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${f.filename}"`,'X-Content-Type-Options':'nosniff'}});});
