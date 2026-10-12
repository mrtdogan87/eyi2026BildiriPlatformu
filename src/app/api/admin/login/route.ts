import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { login, LoginCooldownError } from '@/modules/identity/service';
import { loginCooldownDetails } from '@/modules/identity/login-policy';
import { recoveryClient } from '@/modules/identity/recovery-policy.mjs';
export const POST = apiRoute(async request => {
  const body = await request.json().catch(() => ({}));
  try {
    const result = await login(typeof body?.email === 'string' ? body.email : '', typeof body?.password === 'string' ? body.password : '', recoveryClient(request.headers, process.env.RECOVERY_TRUSTED_IP_HEADER));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (!(error instanceof LoginCooldownError)) throw error;
    const details = loginCooldownDetails(error.retryAt);
    return NextResponse.json(details, { status: 429, headers: { 'Retry-After': String(details.retryAfterSeconds) } });
  }
});
