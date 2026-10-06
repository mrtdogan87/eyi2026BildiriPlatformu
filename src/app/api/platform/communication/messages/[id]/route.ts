import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { communicationMessage } from '@/modules/communication/admin';
type Params = { params: Promise<{ id: string }> };
export const GET = apiRoute(async (_request, params: Params) => NextResponse.json(await communicationMessage((await params.params).id)));
