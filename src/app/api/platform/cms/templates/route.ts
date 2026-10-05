import {NextResponse} from 'next/server';
import {apiRoute} from '@/platform/http';
import {addStarterPages} from '@/modules/cms/service';
export const POST=apiRoute(async()=>NextResponse.json(await addStarterPages()));
