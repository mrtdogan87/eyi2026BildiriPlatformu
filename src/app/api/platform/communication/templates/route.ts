import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { saveCommunicationTemplate } from '@/modules/communication/admin';
import { communicationJson } from '@/modules/communication/http';
export const PUT = apiRoute(async request => NextResponse.json(await saveCommunicationTemplate(await communicationJson(request))));
