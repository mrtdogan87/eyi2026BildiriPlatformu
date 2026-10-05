import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { logout } from '@/modules/identity/service';
export const POST = apiRoute(async () => { await logout(); return NextResponse.json({ success: true }); });
