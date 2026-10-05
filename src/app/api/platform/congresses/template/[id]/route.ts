import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { templatePreview } from '@/modules/congress/service';
export const GET = apiRoute(async (_: Request, { params }: { params: Promise<{ id: string }> }) => NextResponse.json(await templatePreview((await params).id)));
