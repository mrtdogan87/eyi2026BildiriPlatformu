import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { login } from '@/modules/identity/service';
export const POST = apiRoute(async request => {
  const body = await request.json().catch(() => ({}));
  await login(typeof body.email === 'string' ? body.email : '', typeof body.password === 'string' ? body.password : '');
  return NextResponse.json({ success: true });
});
