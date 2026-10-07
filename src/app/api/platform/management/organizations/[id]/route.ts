import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {saveOrganization} from '@/modules/platform-management/service';
export const PATCH=apiRoute(async(request,{params}:{params:Promise<{id:string}>})=>NextResponse.json(await saveOrganization(await request.json(),(await params).id)));
