import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { ownRecords } from '@/integrations/congress/own-records';
export const GET = apiRoute(async () => NextResponse.json(await ownRecords()));
