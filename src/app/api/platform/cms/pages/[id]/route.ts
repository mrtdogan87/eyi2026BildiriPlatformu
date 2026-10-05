import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {cmsPageEditor,saveCmsPage} from '@/modules/cms/service';
type P={params:Promise<{id:string}>};
export const GET=apiRoute(async(_request,context:P)=>NextResponse.json(await cmsPageEditor((await context.params).id)));
export const PATCH=apiRoute(async(request,context:P)=>NextResponse.json(await saveCmsPage((await context.params).id,await request.json())));
