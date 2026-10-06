import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { communicationOverview, saveCommunicationSettings } from '@/modules/communication/admin';
import { communicationJson } from '@/modules/communication/http';
export const GET = apiRoute(async () => NextResponse.json((await communicationOverview()).settings));
export const PUT = apiRoute(async request => NextResponse.json(await saveCommunicationSettings(await communicationJson(request))));
