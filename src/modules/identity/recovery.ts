import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { getEnvironment } from '@/lib/environment';
import { AccessError } from '@/platform/http';
import { hashPassword, hashToken, newToken } from '@/platform/password.mjs';
import { defaultTemplate, renderTemplate } from '@/modules/communication/templates';
import { nextRecoveryWindow, recoveryLifetimeMs, recoveryLimitKey, recoveryLimits } from './recovery-policy.mjs';

// This client must not log failed query arguments: an enqueued email contains the
// recovery URL. Its errors are mapped to fixed messages before leaving this module.
const recoveryGlobal = globalThis as unknown as { recoveryPrisma?: PrismaClient };
function database() {
  getEnvironment();
  return recoveryGlobal.recoveryPrisma ??= new PrismaClient({ log: [] });
}

async function allowRequest(client: string, scope: 'request' | 'reset', email?: string) {
  const entries = scope === 'reset'
    ? [{ key: recoveryLimitKey('reset', client), rule: recoveryLimits.reset }]
    : [{ key: recoveryLimitKey('client', client), rule: recoveryLimits.client }, ...(email ? [{ key: recoveryLimitKey('address', email), rule: recoveryLimits.address }] : [])];
  return database().$transaction(async tx => {
    const now = new Date();
    // Always lock client before address. Rejected clients cannot create arbitrary
    // address rows, and all requests share the same lock order.
    for (const { key, rule } of entries) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`recovery-limit:${key}`}))`;
      const existing = await tx.recoveryRateLimit.findUnique({ where: { key } });
      const next = nextRecoveryWindow(existing, now, rule);
      const data = { windowStartedAt: next.windowStartedAt, attempts: next.attempts };
      await tx.recoveryRateLimit.upsert({ where: { key }, create: { key, ...data }, update: data });
      if (!next.allowed) return false;
    }
    return true;
  });
}

export async function requestPasswordRecovery(input: string, client: string) {
  const email = input.trim().toLowerCase().slice(0, 255);
  try {
    // Limits are committed even if the address is unknown or enqueueing later fails.
    const validAddress = z.string().email().max(254).safeParse(email).success;
    if (!await allowRequest(client, 'request', validAddress ? email : undefined) || !validAddress) return;
    const db = database();
    const existing = await db.platformUser.findUnique({ where: { email }, select: { id: true } });
    if (!existing) return;
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "PlatformUser" WHERE id=${existing.id} FOR UPDATE`;
      const user = await tx.platformUser.findUnique({ where: { id: existing.id } });
      // First activation and administrator-closed accounts retain their own flows.
      if (!user?.active || !user.passwordHash || user.email !== email) return;
      const now = new Date();
      await tx.passwordRecoveryToken.updateMany({ where: { userId: user.id, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
      const raw = newToken();
      const token = await tx.passwordRecoveryToken.create({ data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + recoveryLifetimeMs) } });
      const settings = await tx.platformSettings.findUnique({ where: { id: 'platform' }, select: { displayName: true } });
      const rendered = renderTemplate({ ...defaultTemplate('ACCOUNT_PASSWORD_RECOVERY', 'tr'), key: 'ACCOUNT_PASSWORD_RECOVERY', locale: 'tr', values: {
        platformName: settings?.displayName ?? 'Kongre Yönetim Platformu',
        recoveryLink: `${process.env.APP_BASE_URL}/hesap/parola-yenile#token=${raw}`,
      } });
      const message = { congressId: null, dedupeKey: `platform-password-recovery:${token.id}`, templateKey: 'ACCOUNT_PASSWORD_RECOVERY', templateVersion: 1, locale: 'tr', recipient: user.email, ...rendered, sourceType: 'platform-password-recovery', sourceId: token.id, expiresAt: token.expiresAt };
      await tx.emailMessage.create({ data: { id: randomUUID(), ...message, payloadHash: createHash('sha256').update(JSON.stringify(message)).digest('hex') } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'account.password_recovery.request' } });
    });
  } catch {
    // Never return a different result for a known account or log message/token data.
    console.warn('account.password_recovery.request_unavailable');
  }
}

const invalidLink = () => new AccessError(400, 'Parola yenileme bağlantısı geçersiz, süresi dolmuş veya kullanılmış. Yeni bağlantı isteyin.');

export async function resetPassword(token: string, password: string, client: string) {
  if (password.length < 12 || password.length > 256) throw new AccessError(400, 'Parola en az 12, en çok 256 karakter olmalı.');
  if (!/^[a-f0-9]{64}$/.test(token)) throw invalidLink();
  try {
    if (!await allowRequest(client, 'reset')) throw new AccessError(429, 'Çok fazla deneme yapıldı. Lütfen 15 dakika sonra yeniden deneyin.');
    const db = database();
    const existing = await db.passwordRecoveryToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, userId: true } });
    if (!existing) throw invalidLink();
    const passwordHash = hashPassword(password);
    await db.$transaction(async tx => {
      // Serialize reset, new links, account closure and login against the same row.
      await tx.$queryRaw`SELECT id FROM "PlatformUser" WHERE id=${existing.userId} FOR UPDATE`;
      const record = await tx.passwordRecoveryToken.findUnique({ where: { id: existing.id }, include: { user: true } });
      const now = new Date();
      if (!record || record.usedAt || record.revokedAt || record.expiresAt <= now || !record.user.active || !record.user.passwordHash) throw invalidLink();
      const claimed = await tx.passwordRecoveryToken.updateMany({ where: { id: record.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw invalidLink();
      await tx.platformUser.update({ where: { id: record.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } });
      await tx.passwordRecoveryToken.updateMany({ where: { userId: record.userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await tx.platformSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.auditLog.create({ data: { actorId: record.userId, action: 'account.password_reset' } });
    });
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(503, 'Parola şu anda yenilenemiyor. Lütfen daha sonra yeniden deneyin.');
  }
}
