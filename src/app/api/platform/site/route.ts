import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { siteSettings, updateSiteSettings } from '@/modules/site/service';
export const GET=apiRoute(async()=>NextResponse.json(await siteSettings()));
export const PATCH=apiRoute(async request=>NextResponse.json(await updateSiteSettings(await request.json())));
