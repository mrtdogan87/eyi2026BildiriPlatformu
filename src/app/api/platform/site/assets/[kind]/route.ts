import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { putSiteAsset, setSiteAssetActive } from '@/modules/site/service';
type Props={params:Promise<{kind:string}>};
export const PUT=apiRoute(async(request:Request,{params}:Props)=>NextResponse.json(await putSiteAsset((await params).kind,request)));
export const PATCH=apiRoute(async(request:Request,{params}:Props)=>NextResponse.json(await setSiteAssetActive((await params).kind,await request.json())));
