import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { verifyCertificate } from '@/integrations/congress/certificates';
export const GET=apiRoute(async(_request,context:{params:Promise<{slug:string;code:string}>})=>{const p=await context.params;return NextResponse.json(await verifyCertificate(p.slug,p.code));});
