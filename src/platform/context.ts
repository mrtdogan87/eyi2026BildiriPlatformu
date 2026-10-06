import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ModuleKey } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sessionCookieName, secureSessionCookie } from '@/lib/environment';
import { hashToken } from './password.mjs';
import { AccessError } from './http';
import { allows, type Action } from './policy';
const cookieName = sessionCookieName('platform_session');
export async function actorSession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const session = await prisma.platformSession.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
  return session;
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: secureSessionCookie(), sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
}
export async function clearSessionCookie() { (await cookies()).delete(cookieName); }
export async function availableContexts(userId: string) {
  const user = await prisma.platformUser.findUniqueOrThrow({ where: { id: userId } });
  if (!user.active) return [];
  return prisma.congress.findMany({ where: user.platformAdmin ? {} : { OR: [
    { memberships: { some: { userId, active: true } }, organization: { memberships: { some: { userId, active: true } } } },
    { organization: { memberships: { some: { userId, active: true, organizer: true } } } },
  ] }, include: { organization: true }, orderBy: [{ organizationId: 'asc' }, { name: 'asc' }] });
}
export async function requireContext(action: Action = 'context', module?: ModuleKey) {
  const session = await actorSession();
  if (!session) throw new AccessError(401, 'Kişisel hesabınızla giriş yapın.');
  if (!session.congressId) throw new AccessError(403, 'Önce bir kongre seçin.');
  return authorizeCongress(session.congressId, action, module);
}
export async function authorizeCongress(congressId: string, action: Action = 'context', module?: ModuleKey) {
  const session = await actorSession();
  if (!session) throw new AccessError(401, 'Kişisel hesabınızla giriş yapın.');
  const congress = await prisma.congress.findUnique({ where: { id: congressId }, include: { organization: true } });
  if (!congress) throw new AccessError(403, 'Kongre erişimi kaldırılmış.');
  const org = await prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: congress.organizationId, userId: session.userId } } });
  const membership = await prisma.congressMembership.findUnique({ where: { congressId_userId: { congressId: congress.id, userId: session.userId } } });
  const role = session.user.platformAdmin ? 'PLATFORM_ADMIN' as const : org?.active && org.organizer ? 'ORGANIZER' as const : org?.active && membership?.active ? membership.role : null;
  if (!role || !allows(role, action)) throw new AccessError(403, 'Bu işlem için kongre yetkiniz yok.');
  if (module) await requireModule(congress.id, module);
  return { actor: session.user, sessionId: session.id, congress, role };
}
export type CongressContext = Awaited<ReturnType<typeof requireContext>>;
export async function requireModule(congressId: string, key: ModuleKey) {
  const congress = await prisma.congress.findUnique({where:{id:congressId},select:{closedAt:true}});
  if (congress?.closedAt && key!=='ARCHIVE') throw new AccessError(403,'Kongre kapandı; yeni modül işlemleri durdu.');
  const setting = await prisma.congressModule.findUnique({ where: { congressId_key: { congressId, key } } });
  if (!setting?.enabled) throw new AccessError(403, 'Bu kongrede modül kapalı.');
}
export async function moduleEnabled(congressId: string, key: ModuleKey) {
  if(key!=='ARCHIVE'&&(await prisma.congress.findUnique({where:{id:congressId},select:{closedAt:true}}))?.closedAt)return false;
  return Boolean((await prisma.congressModule.findUnique({ where: { congressId_key: { congressId, key } } }))?.enabled);
}
export async function requirePage(action: Action = 'context', module?: ModuleKey) {
  try { return await requireContext(action, module); }
  catch (error) {
    if (error instanceof AccessError) redirect(error.status === 401 ? '/admin' : '/admin/panel?denied=1');
    throw error;
  }
}
