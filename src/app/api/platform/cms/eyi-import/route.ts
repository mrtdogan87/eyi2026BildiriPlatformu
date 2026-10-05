import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {requireContext} from '@/platform/context';
import {eyiSourceInventory,importEyiSnapshot} from '@/modules/cms/eyi-import';
export const GET=apiRoute(async()=>{await requireContext('cms','CMS');return NextResponse.json(eyiSourceInventory());});
export const POST=apiRoute(async request=>NextResponse.json(await importEyiSnapshot(await request.json())));
