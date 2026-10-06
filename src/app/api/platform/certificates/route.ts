import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { certificateJson } from '@/modules/certificates/http';
import { certificatesManager,manageCertificates } from '@/integrations/congress/certificates';
export const GET=apiRoute(async()=>NextResponse.json(await certificatesManager()));
export const POST=apiRoute(async request=>{await requireContext('certificates.manage','CERTIFICATES');return NextResponse.json(await manageCertificates(await certificateJson(request)));});
