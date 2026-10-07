import {NextResponse} from 'next/server';import {apiRoute} from '@/platform/http';import {systemSettings,updateSystemSettings} from '@/modules/platform-management/service';
export const GET=apiRoute(async()=>NextResponse.json(await systemSettings()));
export const PATCH=apiRoute(async request=>NextResponse.json(await updateSystemSettings(await request.json())));
