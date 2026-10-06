import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { participantIdentity } from '@/modules/participation/session';
import { participantRecords } from '@/integrations/congress/participant-records';
export const GET = apiRoute(async request => {
  const identity = await participantIdentity(new URL(request.url).searchParams.get('congressSlug') ?? '');
  return NextResponse.json(await participantRecords(identity.congressId, identity.email));
});
