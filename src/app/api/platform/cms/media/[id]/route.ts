import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {editCmsMedia} from '@/modules/cms/service';
type P={params:Promise<{id:string}>};
export const PATCH=apiRoute(async(request,context:P)=>NextResponse.json(await editCmsMedia((await context.params).id,await request.json())));
