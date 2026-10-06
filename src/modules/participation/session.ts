import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sessionCookieName, secureSessionCookie } from '@/lib/environment';
import { hashToken, newToken } from '@/platform/password.mjs';
import { enqueueNotification } from '@/platform/notifications';
import { AccessError } from '@/platform/http';
import { clearDraftAccessCookie } from '@/lib/submission';
import { clearRegistrationCookie } from '@/lib/registration';

const cookieName = sessionCookieName('participant_session');
const slug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);
export async function participantCongress(congressSlug: string) {
  if (!slug.safeParse(congressSlug).success) throw new AccessError(400, 'Geçerli kongre adresi gerekli.');
  const congress = await prisma.congress.findUnique({ where: { slug: congressSlug }, include: { modules: true } });
  if (!congress) throw new AccessError(404, 'Kongre bulunamadı.');
  return congress;
}
export function participationEnabled(congress: { modules: { key: string; enabled: boolean }[] }) {
  return congress.modules.some(m => ['SUBMISSIONS', 'REGISTRATION'].includes(m.key) && m.enabled);
}
export async function requestParticipantAccess(raw: unknown) {
  const input = z.object({ congressSlug: slug, email: z.string().trim().toLowerCase().email().max(254), locale: z.enum(['tr', 'en']) }).strict().safeParse(raw);
  if (!input.success) throw new AccessError(400, 'E-posta ve kongre bilgilerini kontrol edin.');
  const { email, locale } = input.data;
  const congress = await participantCongress(input.data.congressSlug);
  if (!participationEnabled(congress)) throw new AccessError(403, 'Bu kongrede katılımcı işlemleri kapalı.');
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${congress.id} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`participant-access:${congress.id}`}))`;
    const now = new Date();
    if (await tx.participantAccessToken.count({ where: { congressId: congress.id, email, createdAt: { gt: new Date(now.getTime() - 900000) } } }) >= 3 ||
        await tx.participantAccessToken.count({ where: { congressId: congress.id, createdAt: { gt: new Date(now.getTime() - 60000) } } }) >= 30) throw new AccessError(429, 'Daha önce gönderilen bağlantıyı kullanın veya daha sonra yeniden deneyin.');
    const token = newToken();
    await tx.participantAccessToken.updateMany({ where: { congressId: congress.id, email, usedAt: null }, data: { expiresAt: now } });
    const access = await tx.participantAccessToken.create({ data: { id: randomUUID(), congressId: congress.id, email, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + 86400000) } });
    await enqueueNotification(tx, { congressId: congress.id, key: 'PARTICIPANT_ACCESS', locale, to: email, dedupeKey: `participant-access:${access.id}`, sourceType: 'participant-access-token', sourceId: access.id, expiresAt: access.expiresAt,
      values: { congressName: congress.name, accessLink: `${process.env.APP_BASE_URL}/${congress.slug}/katilimci/devam?token=${token}` } });
  });
  // The same response applies to existing and new participants; no record lookup is disclosed.
  return { queued: true };
}
export async function verifyParticipantAccess(raw: unknown) {
  const input = z.object({ congressSlug: slug, token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(raw);
  if (!input.success) throw new AccessError(400, 'Bağlantı geçersiz.');
  const congress = await participantCongress(input.data.congressSlug);
  if (!participationEnabled(congress)) throw new AccessError(403, 'Katılımcı işlemleri kapalı.');
  const token = newToken();
  const oldToken = (await cookies()).get(cookieName)?.value;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${congress.id} FOR UPDATE`;
    const now = new Date();
    const access = await tx.participantAccessToken.findUnique({ where: { tokenHash: hashToken(input.data.token) } });
    if (!access || access.congressId !== congress.id || access.usedAt || access.expiresAt <= now) throw new AccessError(400, 'Bağlantının süresi dolmuş veya kullanılmış. Yeni bağlantı isteyin.');
    const claim = await tx.participantAccessToken.updateMany({ where: { id: access.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (!claim.count) throw new AccessError(400, 'Bağlantı daha önce kullanılmış.');
    if (oldToken && /^[a-f0-9]{64}$/.test(oldToken)) await tx.participantSession.updateMany({ where: { tokenHash: hashToken(oldToken), revokedAt: null }, data: { revokedAt: now } });
    await tx.participantSession.create({ data: { id: randomUUID(), congressId: congress.id, email: access.email, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + 8 * 3600000) } });
  });
  await clearDraftAccessCookie(); await clearRegistrationCookie();
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: secureSessionCookie(), sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
  return { ok: true };
}
export async function participantIdentity(congressSlug: string) {
  const congress = await participantCongress(congressSlug);
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) throw new AccessError(401, 'Katılımcı paneli için e-posta adresinizi doğrulayın.');
  const session = await prisma.participantSession.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!session || session.congressId !== congress.id || session.revokedAt || session.expiresAt <= new Date()) throw new AccessError(401, 'Katılımcı oturumunuz sona ermiş. E-posta bağlantısıyla yeniden giriş yapın.');
  return { congressId: congress.id, email: session.email, congress, parentSession: { kind: 'PARTICIPANT' as const, id: session.id } };
}
export async function participantLogout() {
  const store = await cookies(), raw = store.get(cookieName)?.value;
  if (raw && /^[a-f0-9]{64}$/.test(raw)) await prisma.participantSession.updateMany({ where: { tokenHash: hashToken(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  store.delete(cookieName); await clearDraftAccessCookie(); await clearRegistrationCookie(); return { ok: true };
}
