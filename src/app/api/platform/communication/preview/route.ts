import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { previewCommunicationTemplate } from '@/modules/communication/admin';
import { communicationJson } from '@/modules/communication/http';
export const POST = apiRoute(async request => NextResponse.json(await previewCommunicationTemplate(await communicationJson(request))));
