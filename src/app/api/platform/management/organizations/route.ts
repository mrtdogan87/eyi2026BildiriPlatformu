import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {listOrganizations,saveOrganization} from '@/modules/platform-management/service';
export const GET=apiRoute(async()=>NextResponse.json({organizations:await listOrganizations()}));
export const POST=apiRoute(async request=>NextResponse.json(await saveOrganization(await request.json()),{status:201}));
