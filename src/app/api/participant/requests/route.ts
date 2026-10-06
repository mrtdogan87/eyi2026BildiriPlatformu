import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { boundedJson } from '@/platform/json';
import { participantAction } from '@/modules/participation/actions';
export const POST = apiRoute(async request => NextResponse.json(await participantAction(await boundedJson(request), 'request', false)));
