import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { participantLogout } from '@/modules/participation/session';
export const POST = apiRoute(async () => NextResponse.json(await participantLogout()));
