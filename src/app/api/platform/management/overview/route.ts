import {NextResponse} from 'next/server';import {apiRoute} from '@/platform/http';import {platformOverview} from '@/modules/platform-management/service';
export const GET=apiRoute(async()=>NextResponse.json(await platformOverview()));
