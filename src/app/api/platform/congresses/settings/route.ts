import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { congressSettings, updateCongressSettings } from '@/modules/congress/service';
export const GET = apiRoute(async () => NextResponse.json(await congressSettings()));
export const PATCH = apiRoute(async request => NextResponse.json(await updateCongressSettings(await request.json())));
