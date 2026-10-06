import { apiRoute } from '@/platform/http';
import { programPublication } from '@/integrations/congress/program';
export const GET=apiRoute(async(_request,{params}:{params:Promise<{id:string}>})=>{const data=await programPublication((await params).id);return new Response(JSON.stringify(data,null,2),{headers:{'content-type':'application/json; charset=utf-8','content-disposition':`attachment; filename="program-v${data.number}.json"`,'x-content-type-options':'nosniff'}});});
