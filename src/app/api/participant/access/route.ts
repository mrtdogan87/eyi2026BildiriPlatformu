import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { boundedJson } from '@/platform/json';
import { requestParticipantAccess } from '@/modules/participation/session';
export const POST = apiRoute(async request => NextResponse.json(await requestParticipantAccess(await boundedJson(request)), { status: 202 }));
