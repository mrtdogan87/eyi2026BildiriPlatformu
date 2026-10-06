import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { activityJson } from '@/modules/activities/http';
import { activitiesManager, manageActivities } from '@/integrations/congress/activities';
export const GET = apiRoute(async () => NextResponse.json(await activitiesManager()));
export const POST = apiRoute(async request => { await requireContext('activities.manage', 'ACTIVITIES'); return NextResponse.json(await manageActivities(await activityJson(request))); });
