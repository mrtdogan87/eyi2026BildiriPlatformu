import {NextResponse} from 'next/server';
import {apiRoute,AccessError} from '@/platform/http';
import {publicArchive} from '@/integrations/congress/archive';
export const GET=apiRoute(async(request,context:{params:Promise<{slug:string}>})=>{const raw=new URL(request.url).searchParams.get('version');if(raw&&!/^[1-9]\d{0,2}$/.test(raw))throw new AccessError(400,'Geçerli arşiv sürümü gerekli.');return NextResponse.json(await publicArchive((await context.params).slug,raw?Number(raw):undefined));});
