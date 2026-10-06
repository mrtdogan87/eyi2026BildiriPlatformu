import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateUpload } from '@/modules/certificates/http';
import { saveCertificateTemplate,certificateSample } from '@/integrations/congress/certificates';
export const GET=apiRoute(async()=>new Response(new Uint8Array(await certificateSample()),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="sample-certificate-background.pdf"','X-Content-Type-Options':'nosniff'}}));
export const POST=apiRoute(async request=>{await requireContext('certificates.manage','CERTIFICATES');const f=await certificateUpload(request);return NextResponse.json(await saveCertificateTemplate(f.input,f.bytes));});
