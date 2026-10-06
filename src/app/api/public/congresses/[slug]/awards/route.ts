import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {publicAwards} from '@/integrations/congress/awards';
export const GET=apiRoute(async(_request,{params}:{params:Promise<{slug:string}>})=>NextResponse.json(await publicAwards((await params).slug)));
