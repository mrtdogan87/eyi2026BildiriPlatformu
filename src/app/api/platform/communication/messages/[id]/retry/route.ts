import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { retryCommunicationMessage } from '@/modules/communication/admin';
import { communicationJson } from '@/modules/communication/http';
type Params = { params: Promise<{ id: string }> };
export const POST = apiRoute(async (request, params: Params) => NextResponse.json(await retryCommunicationMessage((await params.params).id, await communicationJson(request))));
