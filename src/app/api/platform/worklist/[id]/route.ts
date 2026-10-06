import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { updateStaffWorkRequest, workRequestDetail } from '@/integrations/congress/worklist';
import { worklistJson } from '@/modules/worklist/http';
type Params = { params: Promise<{ id: string }> };
export const GET = apiRoute(async (_request, context: Params) => NextResponse.json(await workRequestDetail((await context.params).id)));
export const PATCH = apiRoute(async (request, context: Params) => NextResponse.json(await updateStaffWorkRequest((await context.params).id, await worklistJson(request))));
