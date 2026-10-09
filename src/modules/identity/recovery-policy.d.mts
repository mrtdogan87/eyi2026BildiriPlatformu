export const recoveryLifetimeMs: number;
export const recoveryRequestNotice: string;
export const recoveryLimits: Record<'address' | 'client' | 'reset', { maximum: number; windowMs: number }>;
export function recoveryClient(headers: Headers, trustedHeader?: string): string;
export function recoveryLimitKey(scope: string, value: string): string;
export function nextRecoveryWindow(record: { windowStartedAt: Date; attempts: number } | null, now: Date, rule: { maximum: number; windowMs: number }): { windowStartedAt: Date; attempts: number; allowed: boolean };
