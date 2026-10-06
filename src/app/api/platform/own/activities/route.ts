import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { activityJson } from '@/modules/activities/http';
import { ownActivities, ownActivityAction } from '@/integrations/congress/activities';
export const GET = apiRoute(async () => { const c = await requireContext('own', 'ACTIVITIES'); return NextResponse.json(await ownActivities(c.congress.id, c.actor.email)); });
export const POST = apiRoute(async request => { await requireContext('own', 'ACTIVITIES'); return NextResponse.json(await ownActivityAction(await activityJson(request))); });
