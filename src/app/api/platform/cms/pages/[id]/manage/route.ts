import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {manageCmsPage} from '@/modules/cms/service';
type Params={params:Promise<{id:string}>};
export const POST=apiRoute(async(request,context:Params)=>NextResponse.json(await manageCmsPage((await context.params).id,await request.json())));
