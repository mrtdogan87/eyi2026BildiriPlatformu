import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateJson } from '@/modules/certificates/http';
import { previewCertificate } from '@/integrations/congress/certificates';
export const POST=apiRoute(async request=>{await requireContext('certificates.read','CERTIFICATES');const result=await previewCertificate(await certificateJson(request));return NextResponse.json({pdfBase64:Buffer.from(result.pdf).toString('base64'),placements:result.placements,width:result.width,height:result.height});});
