import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { communicationOverview } from '@/modules/communication/admin';
export const GET = apiRoute(async () => NextResponse.json(await communicationOverview()));
