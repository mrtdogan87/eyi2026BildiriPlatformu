import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { boundedJson } from '@/platform/json';
import { verifyParticipantAccess } from '@/modules/participation/session';
export const POST = apiRoute(async request => NextResponse.json(await verifyParticipantAccess(await boundedJson(request))));
