import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {publicPromotion} from '@/integrations/congress/promotion';
export const GET=apiRoute(async(_r,{params}:{params:Promise<{slug:string}>})=>NextResponse.json(await publicPromotion((await params).slug)));
