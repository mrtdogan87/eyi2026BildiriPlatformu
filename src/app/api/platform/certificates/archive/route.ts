import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateJson } from '@/modules/certificates/http';
import { certificateArchive } from '@/integrations/congress/certificates';
export const POST=apiRoute(async request=>{await requireContext('certificates.read','CERTIFICATES');return new Response(new Uint8Array(await certificateArchive(await certificateJson(request))),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="certificates.zip"','X-Content-Type-Options':'nosniff'}});});
