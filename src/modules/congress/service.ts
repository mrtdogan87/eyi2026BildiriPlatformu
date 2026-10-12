import { assignInitialOrganizer } from '@/modules/platform-management/service';
import { membershipRoles } from '@/platform/roles.mjs';
import { initializeCmsTemplates } from '@/integrations/congress/cms-templates';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { actorSession, authorizeCongress, requireContext } from '@/platform/context';
import {hasIntervention} from '@/platform/intervention.mjs';
import { AccessError } from '@/platform/http';
import { requireExpectedCongress } from '@/platform/expected-congress';
import { auditData } from '@/platform/audit';
import { clearTemplateDates, effectiveConfiguration, eventSettingsSchema } from './configuration';
import { createFeeSchedule, copyFeeSchedule } from '@/integrations/congress/setup-fees';
import { copyCongressTeam } from '@/integrations/congress/setup-members';
import { writeModuleSettings } from '@/platform/modules';
import { creationSchema } from './creation';
function parsed<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'Ayarları kontrol edin.'); return result.data; }
function creationOrganizationWhere(userId: string, platformAdmin: boolean): Prisma.OrganizationWhereInput {
  return { id:{not:'legacy-unassigned'},...(platformAdmin?{}:{memberships:{some:{userId,active:true,organizer:true}}}) };
}
export async function creationOrganizations() {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  return prisma.organization.findMany({ where: creationOrganizationWhere(session.userId, session.user.platformAdmin), select: { id: true, name: true }, orderBy: { name: 'asc' } });
}
export async function creationOptions() {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  return { organizations: await creationOrganizations(), templates: await creationTemplates(), canCreateOrganization: session.user.platformAdmin };
}
export async function creationTemplates() {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  return prisma.congress.findMany({where:session.user.platformAdmin?{id:hasIntervention(session)?session.congressId!:'__no_intervention__'}:{organization:{memberships:{some:{userId:session.userId,active:true,organizer:true}}}},select:{id:true,name:true,organizationId:true},orderBy:{name:'asc'}});
}
export async function templatePreview(id: string) {
  let context; try { context = await authorizeCongress(id, 'settings'); } catch (error) { if (error instanceof AccessError && error.status === 403) throw new AccessError(404, 'Şablon bulunamadı.'); throw error; }
  const configuration = effectiveConfiguration(context.congress.configuration);
  const modules = await prisma.congressModule.findMany({ where: { congressId:id } });
  for (const key of ['SUBMISSIONS','REGISTRATION'] as const) configuration.modules[key] = modules.some(m => m.key === key && m.enabled);
  const members = await prisma.congressMembership.findMany({ where: { congressId: id, active: true, user: { active: true, organizations: { some: { organizationId: context.congress.organizationId, active: true } } } }, select: { id: true, role: true, roles:true, user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } });
  const tiers = await prisma.paymentTier.findMany({ where: { congressId: id }, select: { role: true, audience: true, presentationMode: true, paperOrder: true, period: true, amount: true, currency: true, active: true }, orderBy: { sortOrder: 'asc' } });
  return { id, name: context.congress.name, organizationId: context.congress.organizationId, configuration: clearTemplateDates(configuration), members, tiers };
}
export async function createCongress(raw: unknown) {
  const input = parsed(creationSchema, raw); const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  if (input.newOrganization && !session.user.platformAdmin) throw new AccessError(403, 'Yeni kurum yalnız platform yöneticisi tarafından oluşturulabilir.');
  if (input.newOrganization && input.sourceId) throw new AccessError(403, 'Yeni kurumda sıfırdan başlayın; yıl kopyası aynı kurum içinde oluşturulur.');
  if (!input.newOrganization && !(await creationOrganizations()).some(org => org.id === input.organizationId)) throw new AccessError(403, 'Bu kurumda kongre oluşturamazsınız.');
  if(input.sourceId){const sourceOrganization=await prisma.congress.findUnique({where:{id:input.sourceId},select:{organizationId:true}});if(sourceOrganization&&sourceOrganization.organizationId!==input.organizationId)throw new AccessError(403,'Yıl kopyası aynı kurum içinde oluşturulur.');}
  const source = input.sourceId ? await templatePreview(input.sourceId) : null;
  if (source && source.organizationId !== input.organizationId) throw new AccessError(403, 'Yıl kopyası aynı kurum içinde oluşturulur.');
  try {
    return await prisma.$transaction(async tx => {
      // Recheck the current account/session and institutional scope before creating
      // anything. The institution and all congress setup writes roll back together.
      await tx.$queryRaw`SELECT id FROM "PlatformUser" WHERE id=${session.userId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PlatformSession" WHERE id=${session.id} FOR UPDATE`;
      const current = await tx.platformSession.findUnique({ where: { id: session.id }, include: { user: true } });
      if (!current || current.revokedAt || current.expiresAt <= new Date() || !current.user.active) throw new AccessError(401, 'Oturumunuz sona ermiş.');
      if (input.newOrganization && !current.user.platformAdmin) throw new AccessError(403, 'Yeni kurum yalnız platform yöneticisi tarafından oluşturulabilir.');
      if (source) await tx.$queryRaw`SELECT id FROM "Congress" WHERE id=${source.id} FOR UPDATE`;
      if (!current.user.platformAdmin && input.organizationId) {
        await tx.$queryRaw`SELECT id FROM "OrganizationMembership" WHERE "organizationId"=${input.organizationId} AND "userId"=${session.userId} FOR UPDATE`;
        await tx.$queryRaw`SELECT m.id FROM "CongressMembership" m JOIN "Congress" c ON c.id=m."congressId" WHERE c."organizationId"=${input.organizationId} AND m."userId"=${session.userId} FOR UPDATE OF m`;
      }
      const organization = input.newOrganization
        ? await tx.organization.create({ data: { name: input.newOrganization.name } })
        : await tx.organization.findFirst({ where: { AND: [{ id: input.organizationId! }, creationOrganizationWhere(session.userId, current.user.platformAdmin)] } });
      if (!organization) throw new AccessError(403, 'Bu kurumda kongre oluşturamazsınız.');
      if (source && !current.user.platformAdmin) {
        const org = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: organization.id, userId: session.userId } } });
        const member = await tx.congressMembership.findUnique({ where: { congressId_userId: { congressId: source.id, userId: session.userId } } });
        if (!org?.active || !(org.organizer || (member?.active && membershipRoles(member).includes('ORGANIZER')))) throw new AccessError(404, 'Şablon erişiminiz kaldırılmış.');
      }
      const settings = input.settings;
      const congress = await tx.congress.create({ data: { organizationId: organization.id, slug: input.slug, name: settings.name, year: settings.year, eventStartsAt: settings.eventStartsAt, eventEndsAt: settings.eventEndsAt, earlyDeadline: settings.earlyDeadline, lateDeadline: settings.lateDeadline, bankName: settings.bankName || null, bankAccountHolder: settings.bankAccountHolder || null, bankIban: settings.bankIban || null, bankBranch: settings.bankBranch || null, configuration: settings.configuration, configVersion: 1 } });
      await writeModuleSettings(tx, congress.id, settings.configuration.modules);
      // Attendance is opt-in from the module controls, independently of programme use.
      await tx.congressModule.create({data:{congressId:congress.id,key:'ATTENDANCE',enabled:false}});
      await initializeCmsTemplates(tx, congress.id, session.userId);
      if (input.copyFees && source) await copyFeeSchedule(tx, source.id, congress.id); else await createFeeSchedule(tx, congress.id, settings.fees);
      await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: organization.id, userId: session.userId } }, update: {}, create: { organizationId: organization.id, userId: session.userId } });
      await tx.congressMembership.create({ data: { congressId: congress.id, userId: session.userId, role: 'ORGANIZER', roles: ['ORGANIZER'] } });
      const copied = source ? await copyCongressTeam(tx, source.id, congress.id, organization.id, session.userId, input.memberIds) : [];
      if(input.responsible)await assignInitialOrganizer(tx,session.userId,congress,input.responsible);
      if(hasIntervention(current))await tx.auditLog.create({data:{actorId:current.userId,congressId:current.congressId,action:'intervention.end',detail:{reason:current.interventionReason,exit:'creation'}}});
      await tx.platformSession.update({ where: { id: session.id }, data: { congressId:current.user.platformAdmin?null:congress.id,interventionReason:null,interventionStartedAt:null } });
      if (input.newOrganization) await tx.auditLog.create({ data: { actorId: session.userId, organizationId: organization.id, congressId: congress.id, action: 'organization.create', targetId: organization.id, detail: { name: organization.name } } });
      await tx.auditLog.create({ data: { actorId: session.userId, organizationId: congress.organizationId, congressId: congress.id, action: source ? 'congress.year.copy' : 'congress.create', targetId: congress.id, detail: { organizationCreated: !!input.newOrganization, sourceId: source?.id ?? null, profile: settings.configuration.profile, copiedFees: input.copyFees, selectedMembers: copied, cleared: ['sourceDates', 'sourceBank', 'submissions', 'registrations', 'files', 'tokens', 'exceptions', 'auditHistory'] } } });
      return { id: congress.id, slug: congress.slug, organizationId: organization.id };
    }, {timeout:15000});
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AccessError(409, 'Bu kongre adresi kullanılıyor.'); throw error; }
}
export async function congressSettings() {
  const context = await requireContext('settings'); const c = context.congress;
  const configuration = effectiveConfiguration(c.configuration);
  const modules = await prisma.congressModule.findMany({ where: { congressId:c.id } });
  for (const key of ['SUBMISSIONS','REGISTRATION'] as const) configuration.modules[key] = modules.some(m => m.key === key && m.enabled);
  const tier = await prisma.paymentTier.findMany({ where: { congressId: c.id }, orderBy: { sortOrder: 'asc' } });
  const amount = (role: 'PRESENTER' | 'LISTENER', audience: 'ACADEMIC' | 'STUDENT') => tier.find(t => t.role === role && t.audience === audience && t.period === 'EARLY' && (role === 'LISTENER' || t.paperOrder === 1))?.amount ?? 0;
  return { id: c.id, slug: c.slug, configVersion: c.configVersion, settings: { name: c.name, year: c.year ?? new Date().getFullYear(), eventStartsAt: c.eventStartsAt?.toISOString() ?? null, eventEndsAt: c.eventEndsAt?.toISOString() ?? null, earlyDeadline: c.earlyDeadline?.toISOString() ?? null, lateDeadline: c.lateDeadline?.toISOString() ?? null, bankName: c.bankName ?? '', bankAccountHolder: c.bankAccountHolder ?? '', bankIban: c.bankIban ?? '', bankBranch: c.bankBranch ?? '', configuration, fees: { presenter: amount('PRESENTER', 'ACADEMIC'), student: amount('PRESENTER', 'STUDENT'), listener: amount('LISTENER', 'ACADEMIC'), currency: (['TRY', 'EUR', 'USD'].includes(tier[0]?.currency) ? tier[0].currency : 'TRY') as 'TRY' | 'EUR' | 'USD' } } };
}
export async function updateCongressSettings(raw: unknown) {
  const context = await requireContext('settings');
  requireExpectedCongress(raw,context.congress.id);
  const input = parsed(z.object({ congressId: z.string().min(1), configVersion: z.number().int().min(0), settings: eventSettingsSchema }).strict(), raw);
  const data = input.settings;
  const current = await congressSettings();
  if (JSON.stringify(data.fees) !== JSON.stringify(current.settings.fees)) throw new AccessError(400, 'Ücret değişikliklerini Ücretler ekranında yapın.');
  await prisma.$transaction(async tx => {
    const before = await tx.congress.findUniqueOrThrow({ where: { id: context.congress.id } });
    const updated = await tx.congress.updateMany({ where: { id: context.congress.id, configVersion: input.configVersion }, data: { name: data.name, year: data.year, eventStartsAt: data.eventStartsAt, eventEndsAt: data.eventEndsAt, earlyDeadline: data.earlyDeadline, lateDeadline: data.lateDeadline, bankName: data.bankName || null, bankAccountHolder: data.bankAccountHolder || null, bankIban: data.bankIban || null, bankBranch: data.bankBranch || null, configuration: data.configuration, configVersion: { increment: 1 } } });
    if (!updated.count) throw new AccessError(409, 'Ayarlar başka bir işlemde değişti. Sayfayı yenileyin.');
    await writeModuleSettings(tx, context.congress.id, data.configuration.modules);
    await tx.auditLog.create({ data: auditData(context, 'congress.configuration.update', context.congress.id, { before: { name: before.name, configuration: before.configuration, configVersion: before.configVersion }, after: { name: data.name, configuration: data.configuration, configVersion: input.configVersion + 1 } }) });
  });
  // Fees are managed in the existing pricing module; settings must not silently rewrite active tariffs.
  return { ok: true };
}
