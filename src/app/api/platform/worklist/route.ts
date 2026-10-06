import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { createStaffWorkRequest, worklistOverview } from '@/integrations/congress/worklist';
import { worklistJson } from '@/modules/worklist/http';
export const GET = apiRoute(async () => NextResponse.json(await worklistOverview()));
export const POST = apiRoute(async request => NextResponse.json(await createStaffWorkRequest(await worklistJson(request))));
