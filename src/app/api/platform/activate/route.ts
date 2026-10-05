import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { activateAccount } from '@/modules/identity/service';
export const POST = apiRoute(async request => {
  const body = await request.json(); await activateAccount(typeof body.token === 'string' ? body.token : '', typeof body.password === 'string' ? body.password : '');
  return NextResponse.json({ ok: true });
});
