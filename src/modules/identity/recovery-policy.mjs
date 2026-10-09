import { isIP } from 'node:net';
import { createHash } from 'node:crypto';

export const recoveryLifetimeMs = 30 * 60 * 1000;
export const recoveryRequestNotice = 'Adresiniz parola yenilemeye uygun bir hesaba aitse, bağlantı e-postası hazırlanacaktır. Mesaj gelmezse istenmeyen posta klasörünü kontrol edin veya daha sonra yeniden deneyin.';
export const recoveryLimits = {
  address: { maximum: 5, windowMs: 60 * 60 * 1000 },
  client: { maximum: 20, windowMs: 15 * 60 * 1000 },
  reset: { maximum: 30, windowMs: 15 * 60 * 1000 },
};

// Only an explicitly configured, overwriting reverse proxy may supply this header.
// Without one, a shared bucket is safer than trusting attacker-provided XFF values.
export function recoveryClient(headers, trustedHeader = '') {
  if (!['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'].includes(trustedHeader)) return 'direct';
  const candidate = headers.get(trustedHeader)?.trim() ?? '';
  if (!isIP(candidate)) return 'direct';
  // URL canonicalizes IPv6 spelling; otherwise equivalent addresses could evade limits.
  const normalized = isIP(candidate) === 6 ? new URL(`http://[${candidate}]/`).hostname : candidate;
  return `proxy:${normalized}`;
}

export function recoveryLimitKey(scope, value) {
  return `${scope}:${createHash('sha256').update(value).digest('hex')}`;
}

export function nextRecoveryWindow(record, now, rule) {
  const current = record && record.windowStartedAt.getTime() + rule.windowMs > now.getTime();
  return {
    windowStartedAt: current ? record.windowStartedAt : now,
    attempts: current ? Math.min(record.attempts + 1, rule.maximum + 1) : 1,
    allowed: !current || record.attempts < rule.maximum,
  };
}
