export const loginFailureLimit = 5;
export const loginCooldownMs = 10 * 60 * 1000;
export const loginClientLimit = { maximum: 100, windowMs: loginCooldownMs };
export const loginCooldownNotice = 'Çok sayıda başarısız giriş denemesi nedeniyle girişe geçici olarak ara verildi. Bekleme süresi dolunca yeniden deneyebilirsiniz.';

// recoveryClient returns "direct" when no trusted single-client IP is available.
// A shared fallback quota would let one visitor block every user's login.
export const loginClientLimitFor = (client: string) => client === 'direct' ? null : loginClientLimit;

type FailureRecord = { windowStartedAt: Date; attempts: number };

export function loginRetryAt(record: FailureRecord | null, now: Date): Date | null {
  if (!record || record.attempts < loginFailureLimit) return null;
  const until = new Date(record.windowStartedAt.getTime() + loginCooldownMs);
  return until > now ? until : null;
}

export function failedLogin(record: FailureRecord | null, now: Date) {
  const retryAt = loginRetryAt(record, now);
  // Repeated requests during the wait never restart or extend it.
  if (retryAt) return { ...record!, retryAt };
  const expired = !!record && record.attempts >= loginFailureLimit;
  const attempts = (expired ? 0 : record?.attempts ?? 0) + 1;
  const windowStartedAt = attempts >= loginFailureLimit || expired || !record ? now : record.windowStartedAt;
  return { attempts, windowStartedAt, retryAt: attempts >= loginFailureLimit ? new Date(now.getTime() + loginCooldownMs) : null };
}

export function loginCooldownDetails(retryAt: Date, now = new Date()) {
  return { error: loginCooldownNotice, code: 'LOGIN_COOLDOWN' as const, retryAt: retryAt.toISOString(), retryAfterSeconds: Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 1000)) };
}
