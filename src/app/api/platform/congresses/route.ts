import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { createCongress, creationOrganizations, creationTemplates } from '@/modules/congress/service';
export const GET = apiRoute(async () => NextResponse.json({ organizations: await creationOrganizations(), templates: await creationTemplates() }));
export const POST = apiRoute(async request => NextResponse.json(await createCongress(await request.json()), { status: 201 }));
