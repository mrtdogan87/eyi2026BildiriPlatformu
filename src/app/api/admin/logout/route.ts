import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { logout } from '@/modules/identity/service';
import { participantLogout } from '@/modules/participation/session';
export const POST = apiRoute(async () => { await logout(); await participantLogout(); return NextResponse.json({ success: true }); });
