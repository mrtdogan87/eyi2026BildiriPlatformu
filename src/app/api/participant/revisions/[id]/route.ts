import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { participantRevisionGet, participantRevisionPost } from '@/modules/revisions/participant';
type Props = { params: Promise<{ id: string }> };
export const GET = apiRoute(async (request: Request, { params }: Props) => NextResponse.json(await participantRevisionGet(request, (await params).id)));
export const POST = apiRoute(async (request: Request, { params }: Props) => NextResponse.json(await participantRevisionPost(request, (await params).id)));
