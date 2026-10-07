import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { createCongress, creationOptions } from '@/modules/congress/service';
export const GET = apiRoute(async () => NextResponse.json(await creationOptions()));
export const POST = apiRoute(async request => NextResponse.json(await createCongress(await request.json()), { status: 201 }));
