import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { listDeliveryExceptions, grantDeliveryException } from '@/modules/congress/delivery';
export const GET = apiRoute(async () => NextResponse.json({ exceptions: await listDeliveryExceptions() }));
export const POST = apiRoute(async request => NextResponse.json(await grantDeliveryException(await request.json()), { status: 201 }));
