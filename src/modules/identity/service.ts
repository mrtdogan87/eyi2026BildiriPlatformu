import { changeAccess } from '@/modules/platform-management/service';
import { membershipRoles } from '@/platform/roles.mjs';
import { prisma } from '@/lib/prisma';
import { actorSession, availableContexts, clearSessionCookie, requireContext, setSessionCookie } from '@/platform/context';
import { hashPassword, verifyPassword, newToken, hashToken } from '@/platform/password.mjs';
import { AccessError } from '@/platform/http';
import type { CongressRole } from '@prisma/client';
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
  const institutionManager=!!await prisma.organizationMembership.count({where:{userId:user.id,active:true,organizer:true}});
  const token = newToken();
  await prisma.$transaction([
    prisma.platformUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } }),
    prisma.platformSession.create({ data: { userId: user.id, tokenHash: hashToken(token), congressId: user.platformAdmin || contexts.length !== 1 || institutionManager ? null : contexts[0]?.id, expiresAt: new Date(Date.now() + 8 * 3600000) } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: 'session.login' } }),
  ]);
  await setSessionCookie(token);
  return {redirectTo:user.platformAdmin?'/admin/platform':institutionManager?'/admin/kurumlar':contexts.length!==1?'/admin/kongreler':'/admin/panel'};
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
  const members = await prisma.congressMembership.findMany({ where: { congressId: context.congress.id }, select: { id: true, role: true, roles:true, active: true, user: { select: { id: true, email: true, name: true, active: true, passwordHash: true } } }, orderBy: { user: { email: 'asc' } } });
  return members.map(({ user, ...member }) => ({ ...member, roles:membershipRoles(member), user: { id: user.id, email: user.email, name: user.name, active: user.active }, activationNeeded: !user.passwordHash }));
}
export async function inviteMember(input: {email:string;name:string;role?:CongressRole;roles?:CongressRole[]}) {
 const c=await requireContext('members');
 return changeAccess({action:'INVITE',scope:'CONGRESS',congressId:c.congress.id,email:input.email,name:input.name,roles:input.roles??(input.role?[input.role]:undefined)});
}
export async function updateMember(id:string,input:{role?:CongressRole;roles?:CongressRole[];active?:boolean}) {
 const c=await requireContext('members');const m=await prisma.congressMembership.findFirst({where:{id,congressId:c.congress.id}});if(!m)throw new AccessError(404,'Üyelik bulunamadı.');
 return changeAccess({action:'UPDATE',scope:'CONGRESS',congressId:c.congress.id,userId:m.userId,roles:input.roles??(input.role?[input.role]:undefined),active:input.active});
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

export async function resendActivation(membershipId:string) {
 const c=await requireContext('members');const m=await prisma.congressMembership.findFirst({where:{id:membershipId,congressId:c.congress.id,active:true}});if(!m)throw new AccessError(404,'Aktif üyelik bulunamadı.');
 return changeAccess({action:'RESEND',scope:'CONGRESS',congressId:c.congress.id,userId:m.userId});
}
