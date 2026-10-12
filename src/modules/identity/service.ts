import { changeAccess } from '@/modules/platform-management/service';
import { membershipRoles } from '@/platform/roles.mjs';
import { prisma } from '@/lib/prisma';
import { actorSession, availableContexts, clearSessionCookie, requireContext, setSessionCookie } from '@/platform/context';
import { hashPassword, verifyPassword, newToken, hashToken } from '@/platform/password.mjs';
import { AccessError } from '@/platform/http';
import type { CongressRole } from '@prisma/client';
import { hasIntervention } from '@/platform/intervention.mjs';
import { effectiveRoles } from '@/platform/roles.mjs';
import { failedLogin, loginClientLimitFor, loginCooldownNotice, loginRetryAt } from './login-policy';
import { nextRecoveryWindow, recoveryLimitKey } from './recovery-policy.mjs';

export class LoginCooldownError extends AccessError {
  constructor(public retryAt: Date) { super(429, loginCooldownNotice); }
}

export async function login(email: string, password: string, client = 'direct') {
  const address = email.trim().toLowerCase();
  if (!address || address.length > 254 || !password || password.length > 256) throw new AccessError(400, 'E-posta ve parola gerekli.');
  const limitKey = recoveryLimitKey('login', address);
  const clientRule = loginClientLimitFor(client);
  const token = newToken();
  const result = await prisma.$transaction<{ retryAt: Date } | { redirectTo: string } | null>(async tx => {
    // Apply the client quota only to a single IP from the configured,
    // overwriting proxy. Unidentified visitors must not share a global lockout.
    if (clientRule) {
      const clientKey = recoveryLimitKey('login-client', client);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`login-limit:${clientKey}`}))`;
      const clientNow = new Date();
      const clientRecord = await tx.recoveryRateLimit.findUnique({ where: { key: clientKey } });
      const clientWindow = nextRecoveryWindow(clientRecord, clientNow, clientRule);
      const clientData = { windowStartedAt: clientWindow.windowStartedAt, attempts: clientWindow.attempts };
      await tx.recoveryRateLimit.upsert({ where: { key: clientKey }, create: { key: clientKey, ...clientData }, update: clientData });
      if (!clientWindow.allowed) return { retryAt: new Date(clientWindow.windowStartedAt.getTime() + clientRule.windowMs) };
    }
    // Unknown and known addresses share the same failure policy and response.
    // Keep only a digest of the address in the existing rate-limit store.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`login-limit:${limitKey}`}))`;
    const existing = await tx.platformUser.findUnique({ where: { email: address }, select: { id: true } });
    // A login using an old password cannot create a session after a concurrent reset.
    if (existing) await tx.$queryRaw`SELECT id FROM "PlatformUser" WHERE id=${existing.id} FOR UPDATE`;
    const user = existing ? await tx.platformUser.findUnique({ where: { id: existing.id } }) : null;
    const valid = verifyPassword(password, user?.passwordHash ?? null);
    const now = new Date();
    const record = await tx.recoveryRateLimit.findUnique({ where: { key: limitKey } });
    const retryAt = loginRetryAt(record, now);
    if (retryAt) return { retryAt };
    // Honor a pre-existing account wait, but disclose it only after credentials
    // are verified. Failed credentials use the uniform address policy below.
    if (user?.active && valid && user.lockedUntil && user.lockedUntil > now) return { retryAt: user.lockedUntil };
    if (!user?.active || !valid) {
      const next = failedLogin(record, now);
      const data = { windowStartedAt: next.windowStartedAt, attempts: next.attempts };
      await tx.recoveryRateLimit.upsert({ where: { key: limitKey }, create: { key: limitKey, ...data }, update: data });
      if (user) {
        await tx.platformUser.update({ where: { id: user.id }, data: { failedLogins: next.attempts, ...(next.retryAt ? { lockedUntil: next.retryAt } : {}) } });
      }
      return next.retryAt ? { retryAt: next.retryAt } : null; // Commit failures before reporting them.
    }
    const contexts = await availableContexts(user.id);
    const institutionManager = !!await tx.organizationMembership.count({ where: { userId: user.id, active: true, organizer: true } });
    await tx.platformUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await tx.recoveryRateLimit.deleteMany({ where: { key: limitKey } });
    await tx.platformSession.create({ data: { userId: user.id, tokenHash: hashToken(token), congressId: user.platformAdmin || contexts.length !== 1 || institutionManager ? null : contexts[0]?.id, expiresAt: new Date(Date.now() + 8 * 3600000) } });
    await tx.auditLog.create({ data: { actorId: user.id, action: 'session.login' } });
    return { redirectTo: user.platformAdmin ? '/admin/platform' : institutionManager ? '/admin/kurumlar' : contexts.length !== 1 ? '/admin/kongreler' : '/admin/panel' };
  });
  // Anonymous addresses cannot log in to clear their counters. Keep only a day
  // of inactive login history, in bounded batches outside authentication locks.
  // SKIP LOCKED avoids blocking or changing a concurrently used counter.
  try {
    const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`DELETE FROM "RecoveryRateLimit" WHERE key IN (SELECT key FROM "RecoveryRateLimit" WHERE (key LIKE 'login:%' OR key LIKE 'login-client:%') AND "updatedAt" < ${staleBefore} ORDER BY "updatedAt" LIMIT 20 FOR UPDATE SKIP LOCKED)`;
  } catch { console.warn('account.login.counter_cleanup_unavailable'); }
  if (!result) throw new AccessError(401, 'E-posta veya parola doğrulanamadı.');
  if ('retryAt' in result) throw new LoginCooldownError(result.retryAt);
  await setSessionCookie(token);
  return result;
}
export async function logout() {
  const session = await actorSession();
  if (session) await prisma.$transaction([
    ...(hasIntervention(session)?[prisma.auditLog.create({data:{actorId:session.userId,congressId:session.congressId,action:'intervention.end',detail:{reason:session.interventionReason,exit:'logout'}}})]:[]),
    prisma.platformSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: session.userId, action: 'session.logout' } }),
  ]);
  await clearSessionCookie();
}
export async function selectContext(id: string, reason?: string) {
  const session = await actorSession();
  if (!session) throw new AccessError(401, 'Giriş yapın.');
  const normalized=typeof reason==='string'?reason.trim():'';
  if(session.user.platformAdmin&&(normalized.length<10||normalized.length>500||/[\u0000-\u001f\u007f]/.test(normalized)))throw new AccessError(400,'Müdahale gerekçesi 10–500 karakter ve tek satır olmalı.');
  const congress = session.user.platformAdmin?await prisma.congress.findUnique({where:{id}}):(await availableContexts(session.userId)).find(c => c.id === id);
  if (!congress) throw new AccessError(403, 'Bu kongreyi seçemezsiniz.');
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "PlatformSession" WHERE id=${session.id} FOR UPDATE`;
    const current=await tx.platformSession.findUnique({where:{id:session.id},include:{user:true}});
    if(!current||current.revokedAt||current.expiresAt<=new Date()||!current.user.active)throw new AccessError(401,'Oturumunuz sona ermiş.');
    if(current.user.platformAdmin!==session.user.platformAdmin)throw new AccessError(409,'Yetkiniz değişti; ekranı yenileyin.');
    if(!current.user.platformAdmin){const org=await tx.organizationMembership.findUnique({where:{organizationId_userId:{organizationId:congress.organizationId,userId:current.userId}}}),member=await tx.congressMembership.findUnique({where:{congressId_userId:{congressId:congress.id,userId:current.userId}}});if(!effectiveRoles(false,org,member).length)throw new AccessError(403,'Kongre erişiminiz kaldırılmış.');}
    if(hasIntervention(current))await tx.auditLog.create({data:{actorId:current.userId,congressId:current.congressId,action:'intervention.end',detail:{reason:current.interventionReason,exit:'switch'}}});
    await tx.platformSession.update({where:{id:session.id},data:{congressId:congress.id,interventionReason:current.user.platformAdmin?normalized:null,interventionStartedAt:current.user.platformAdmin?new Date():null}});
    await tx.auditLog.create({data:{actorId:session.userId,organizationId:congress.organizationId,congressId:congress.id,action:current.user.platformAdmin?'intervention.start':'context.select',detail:current.user.platformAdmin?{reason:normalized}:undefined}});
  });
}
export async function clearContext(){
  const session=await actorSession();if(!session)throw new AccessError(401,'Giriş yapın.');
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "PlatformSession" WHERE id=${session.id} FOR UPDATE`;
    const current=await tx.platformSession.findUnique({where:{id:session.id},include:{user:true}});
    if(!current||current.revokedAt||current.expiresAt<=new Date()||!current.user.active)throw new AccessError(401,'Oturumunuz sona ermiş.');
    if(hasIntervention(current))await tx.auditLog.create({data:{actorId:current.userId,congressId:current.congressId,action:'intervention.end',detail:{reason:current.interventionReason,exit:'return'}}});
    await tx.platformSession.update({where:{id:current.id},data:{congressId:null,interventionReason:null,interventionStartedAt:null}});
  });
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
