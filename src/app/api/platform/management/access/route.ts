import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {usersAndAccess,changeAccess} from '@/modules/platform-management/service';
export const GET=apiRoute(async request=>NextResponse.json(await usersAndAccess(new URL(request.url).searchParams.get('q')??'',Number(new URL(request.url).searchParams.get('page')??1),new URL(request.url).searchParams.get('state')??'',new URL(request.url).searchParams.get('organization')??'',new URL(request.url).searchParams.get('user')??'')));
export const POST=apiRoute(async request=>NextResponse.json(await changeAccess(await request.json())));
