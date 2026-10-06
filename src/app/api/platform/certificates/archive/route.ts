import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateJson } from '@/modules/certificates/http';
import { certificateArchive } from '@/integrations/congress/certificates';
const response=(bytes:Uint8Array)=>new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="certificates.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const POST=apiRoute(async request=>{await requireContext('certificates.read','CERTIFICATES');return response(await certificateArchive(await certificateJson(request)));});
export const GET=apiRoute(async request=>{await requireContext('certificates.read','CERTIFICATES');return response(await certificateArchive({fileIds:new URL(request.url).searchParams.getAll('fileId')}));});
