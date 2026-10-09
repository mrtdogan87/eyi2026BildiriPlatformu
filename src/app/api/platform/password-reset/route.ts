import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { resetPassword } from '@/modules/identity/recovery';
import { recoveryClient } from '@/modules/identity/recovery-policy.mjs';

export const POST = apiRoute(async request => {
  const body = await request.json().catch(() => ({}));
  await resetPassword(typeof body?.token === 'string' ? body.token : '', typeof body?.password === 'string' ? body.password : '', recoveryClient(request.headers, process.env.RECOVERY_TRUSTED_IP_HEADER));
  return NextResponse.json({ ok: true });
});
