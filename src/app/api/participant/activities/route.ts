import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRoute } from '@/platform/http';
import { participantIdentity } from '@/modules/participation/session';
import { activityJson, parsed } from '@/modules/activities/http';
import { ownActivities, ownActivityAction } from '@/integrations/congress/activities';
export const GET = apiRoute(async request => { const i = await participantIdentity(new URL(request.url).searchParams.get('congressSlug') ?? ''); return NextResponse.json(await ownActivities(i.congressId, i.email)); });
export const POST = apiRoute(async request => { const b = parsed(z.object({ congressSlug: z.string().min(1).max(120), action: z.enum(['JOIN', 'CANCEL']), input: z.unknown() }).strict(), await activityJson(request)); const i = await participantIdentity(b.congressSlug); return NextResponse.json(await ownActivityAction({ action: b.action, input: b.input }, i)); });
