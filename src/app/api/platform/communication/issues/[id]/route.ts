import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { updateCommunicationIssue } from '@/modules/communication/admin';
import { communicationJson } from '@/modules/communication/http';
type Params = { params: Promise<{ id: string }> };
export const PATCH = apiRoute(async (request, params: Params) => NextResponse.json(await updateCommunicationIssue((await params.params).id, await communicationJson(request))));
