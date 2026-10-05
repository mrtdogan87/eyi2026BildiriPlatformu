import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { revokeDeliveryException } from '@/modules/congress/delivery';
export const DELETE = apiRoute(async (_: Request, { params }: { params: Promise<{ id: string }> }) => NextResponse.json(await revokeDeliveryException((await params).id)));
