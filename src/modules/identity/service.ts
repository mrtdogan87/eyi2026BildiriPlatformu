import { prisma } from '@/lib/prisma';
import { actorSession, availableContexts, clearSessionCookie, requireContext, setSessionCookie } from '@/platform/context';
import { hashPassword, verifyPassword, newToken, hashToken } from '@/platform/password.mjs';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import type { CongressRole } from '@prisma/client';
import { roleLabels } from '@/platform/policy';
import { enqueueNotification } from '@/platform/notifications';
import { getServerT } from '@/lib/i18n/server';
export async function login(email: string, password: string) {
  if (!email || !password || password.length > 256) throw new AccessError(400, 'E-posta ve parola gerekli.');
  const user = await prisma.platformUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  const valid = verifyPassword(password, user?.passwordHash ?? null);
  if (!user?.active || !valid || (user.lockedUntil && user.lockedUntil > new Date())) {
    if (user) await prisma.$transaction(async tx => {
      const updated = await tx.platformUser.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } } });
      if (updated.failedLogins >= 5 && (!user.lockedUntil || user.lockedUntil <= new Date())) {
        await tx.platformUser.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 10 * 60000) } });
      }
    });
    throw new AccessError(401, 'E-posta veya parola doğrulanamadı.');
  }
  const contexts = await availableContexts(user.id);
  const token = newToken();
  await prisma.$transaction([
    prisma.platformUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } }),
    prisma.platformSession.create({ data: { userId: user.id, tokenHash: hashToken(token), congressId: contexts[0]?.id, expiresAt: new Date(Date.now() + 8 * 3600000) } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: 'session.login' } }),
  ]);
  await setSessionCookie(token);
}
export async function logout() {
  const session = await actorSession();
  if (session) await prisma.$transaction([
    prisma.platformSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: session.userId, action: 'session.logout' } }),
  ]);
  await clearSessionCookie();
}
export async function selectContext(id: string) {
  const session = await actorSession();
  if (!session) throw new AccessError(401, 'Giriş yapın.');
  const congress = (await availableContexts(session.userId)).find(c => c.id === id);
  if (!congress) throw new AccessError(403, 'Bu kongreyi seçemezsiniz.');
  await prisma.$transaction([
    prisma.platformSession.update({ where: { id: session.id }, data: { congressId: congress.id } }),
    prisma.auditLog.create({ data: { actorId: session.userId, organizationId: congress.organizationId, congressId: congress.id, action: 'context.select' } }),
  ]);
}
export async function listMembers() {
  const context = await requireContext('members');
  const members = await prisma.congressMembership.findMany({ where: { congressId: context.congress.id }, select: { id: true, role: true, active: true, user: { select: { id: true, email: true, name: true, active: true, passwordHash: true } } }, orderBy: { user: { email: 'asc' } } });
  return members.map(({ user, ...member }) => ({ ...member, user: { id: user.id, email: user.email, name: user.name, active: user.active }, activationNeeded: !user.passwordHash }));
}
export async function inviteMember(input: { email: string; name: string; role: CongressRole }) {
  const context = await requireContext('members');
  const { locale } = await getServerT();
  const email = input.email.trim().toLowerCase(); const name = input.name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 120 || !Object.hasOwn(roleLabels, input.role)) {
    throw new AccessError(400, 'Geçerli ad, e-posta ve rol gerekli.');
  }
  const token = newToken();
  const result = await prisma.$transaction(async tx => {
    const user = await tx.platformUser.upsert({ where: { email }, update: {}, create: { email, name } });
    const previous = await tx.congressMembership.findUnique({ where: { congressId_userId: { congressId: context.congress.id, userId: user.id } } });
    // An invitation cannot silently overwrite an existing role or reactivate a removed member.
    if (previous) throw new AccessError(409, 'Bu hesap ekipte mevcut; rolü mevcut üyelik üzerinden değiştirin.');
    await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: context.congress.organizationId, userId: user.id } }, update: {}, create: { organizationId: context.congress.organizationId, userId: user.id } });
    const membership = await tx.congressMembership.create({ data: { congressId: context.congress.id, userId: user.id, role: input.role } });
    if (!user.passwordHash) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`activation:${user.id}`}))`;
      await tx.activationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      const activation = await tx.activationToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600000) } });
      await enqueueNotification(tx, {
        congressId: context.congress.id, key: 'ACCOUNT_ACTIVATION', locale, to: email,
        dedupeKey: `activation:${activation.id}`, sourceType: 'activation-token', sourceId: activation.id, expiresAt: activation.expiresAt,
        values: { congressName: context.congress.name, activationLink: `${process.env.APP_BASE_URL}/hesap/etkinlestir?token=${token}` },
      });
    }
    await tx.auditLog.create({ data: auditData(context, 'membership.invite', membership.id, { email, role: input.role }) });
    return { activationNeeded: !user.passwordHash };
  });
  return { ok: true, activationNeeded: result.activationNeeded };
}
export async function updateMember(id: string, input: { role?: CongressRole; active?: boolean }) {
  const context = await requireContext('members');
  if ((input.role !== undefined && !Object.hasOwn(roleLabels, input.role)) || (input.active !== undefined && typeof input.active !== 'boolean')) throw new AccessError(400, 'Geçersiz rol veya üyelik durumu.');
  return prisma.$transaction(async tx => {
    const member = await tx.congressMembership.findFirst({ where: { id, congressId: context.congress.id } });
    if (!member) throw new AccessError(404, 'Üyelik bulunamadı.');
    if (member.userId === context.actor.id) throw new AccessError(400, 'Kendi üyeliğinizi bu ekrandan değiştiremezsiniz.');
    const result = await tx.congressMembership.update({ where: { id }, data: { role: input.role, active: input.active } });
    await tx.auditLog.create({ data: auditData(context, 'membership.update', id, { before: { role: member.role, active: member.active }, after: { role: result.role, active: result.active } }) });
    return { ok: true };
  });
}
export async function activateAccount(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 12 || password.length > 256) throw new AccessError(400, 'Parola en az 12, en çok 256 karakter olmalı.');
  const passwordHash = hashPassword(password);
  await prisma.$transaction(async tx => {
    const record = await tx.activationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || !record.user.active || record.user.passwordHash) throw new AccessError(400, 'Etkinleştirme bağlantısı geçersiz veya kullanılmış.');
    const claimed = await tx.activationToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new AccessError(400, 'Bağlantı kullanılmış.');
    await tx.platformUser.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.auditLog.create({ data: { actorId: record.userId, action: 'account.activate' } });
  });
}

export async function resendActivation(membershipId: string) {
  const context = await requireContext('members');
  const { locale } = await getServerT();
  const member = await prisma.congressMembership.findFirst({ where: { id: membershipId, congressId: context.congress.id, active: true }, include: { user: true } });
  if (!member) throw new AccessError(404, 'Aktif üyelik bulunamadı.');
  if (member.user.passwordHash || !member.user.active) throw new AccessError(400, 'Bu hesap için etkinleştirme gerekmiyor.');
  const token = newToken();
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`activation:${member.userId}`}))`;
    const current = await tx.congressMembership.findFirst({ where: { id: member.id, congressId: context.congress.id, active: true }, include: { user: true } });
    if (!current?.user.active || current.user.passwordHash) throw new AccessError(400, 'Bu hesap için etkinleştirme gerekmiyor.');
    await tx.activationToken.updateMany({ where: { userId: member.userId, usedAt: null }, data: { usedAt: new Date() } });
    const activation = await tx.activationToken.create({ data: { userId: member.userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600000) } });
    await tx.auditLog.create({ data: auditData(context, 'account.activation.resend', member.id) });
    await enqueueNotification(tx, {
      congressId: context.congress.id, key: 'ACCOUNT_ACTIVATION', locale, to: current.user.email,
      dedupeKey: `activation:${activation.id}`, sourceType: 'activation-token', sourceId: activation.id, expiresAt: activation.expiresAt,
      values: { congressName: context.congress.name, activationLink: `${process.env.APP_BASE_URL}/hesap/etkinlestir?token=${token}` },
    });
  });
  return { ok: true, activationNeeded: true };
}
