import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {cmsHistory} from '@/modules/cms/service';
import {AccessError} from '@/platform/http';
type P={params:Promise<{id:string}>};
export const GET=apiRoute(async(request,context:P)=>{const raw=new URL(request.url).searchParams.get('before');const before=raw?Number(raw):undefined;if(before!==undefined&&(!Number.isInteger(before)||before<1))throw new AccessError(400,'Sürüm aralığı geçersiz.');return NextResponse.json(await cmsHistory((await context.params).id,before));});
