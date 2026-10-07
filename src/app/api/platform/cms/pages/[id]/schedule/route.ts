import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {changeCmsSchedule,cmsScheduleHistory} from '@/modules/cms/service';
type Params={params:Promise<{id:string}>};
export const GET=apiRoute(async(_request,{params}:Params)=>NextResponse.json({schedules:await cmsScheduleHistory((await params).id)}));
export const POST=apiRoute(async(request,{params}:Params)=>NextResponse.json(await changeCmsSchedule((await params).id,await request.json())));
