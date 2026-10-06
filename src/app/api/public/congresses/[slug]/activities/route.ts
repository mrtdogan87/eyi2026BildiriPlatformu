import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { publicActivities } from '@/integrations/congress/activities';
export const GET = apiRoute(async (_request, { params }: { params: Promise<{ slug: string }> }) => NextResponse.json(await publicActivities((await params).slug)));
