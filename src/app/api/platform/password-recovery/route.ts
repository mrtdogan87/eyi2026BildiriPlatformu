import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requestPasswordRecovery } from '@/modules/identity/recovery';
import { recoveryClient, recoveryRequestNotice } from '@/modules/identity/recovery-policy.mjs';

export const POST = apiRoute(async request => {
  const started = Date.now();
  const body = await request.json().catch(() => ({}));
  await requestPasswordRecovery(typeof body?.email === 'string' ? body.email : '', recoveryClient(request.headers, process.env.RECOVERY_TRUSTED_IP_HEADER));
  // Keep the common unknown/closed/throttled paths comparable to enqueueing.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 350 + randomInt(100) - (Date.now() - started))));
  return NextResponse.json({ ok: true, message: recoveryRequestNotice });
});
