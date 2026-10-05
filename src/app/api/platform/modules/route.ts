import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { listModules, setModule } from '@/platform/modules';
export const GET = apiRoute(async () => NextResponse.json({ modules: await listModules() }));
export const PATCH = apiRoute(async request => { const body = await request.json(); await setModule(body.key, body.enabled); return NextResponse.json({ ok: true }); });
