import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {listCmsPages,createCmsPage} from '@/modules/cms/service';
export const GET=apiRoute(async()=>NextResponse.json(await listCmsPages()));
export const POST=apiRoute(async request=>NextResponse.json(await createCmsPage(await request.json()),{status:201}));
