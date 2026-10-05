import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {cmsMediaLibrary,uploadCmsMedia} from '@/modules/cms/service';
export const GET=apiRoute(async()=>NextResponse.json(await cmsMediaLibrary()));
export const POST=apiRoute(async request=>NextResponse.json(await uploadCmsMedia(request),{status:201}));
