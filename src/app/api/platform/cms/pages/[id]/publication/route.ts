import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {changeCmsPublication} from '@/modules/cms/service';
type P={params:Promise<{id:string}>};
export const POST=apiRoute(async(request,context:P)=>NextResponse.json(await changeCmsPublication((await context.params).id,await request.json())));
