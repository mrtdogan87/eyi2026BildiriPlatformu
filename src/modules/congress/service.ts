import { initializeCmsTemplates } from '@/integrations/congress/cms-templates';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { actorSession, availableContexts, authorizeCongress, requireContext } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { clearTemplateDates, effectiveConfiguration, eventSettingsSchema } from './configuration';
import { createFeeSchedule, copyFeeSchedule } from '@/integrations/congress/setup-fees';
import { copyCongressTeam } from '@/integrations/congress/setup-members';
import { writeModuleSettings } from '@/platform/modules';
function parsed<T>(schema: z.ZodType<T>, input: unknown): T { const result = schema.safeParse(input); if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'Ayarları kontrol edin.'); return result.data; }
export async function creationOrganizations() {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  return prisma.organization.findMany({ where: { id: { not: 'legacy-unassigned' }, ...(session.user.platformAdmin ? {} : { memberships: { some: { userId: session.userId, active: true } }, OR: [
    { memberships: { some: { userId: session.userId, active: true, organizer: true } } },
    { congresses: { some: { memberships: { some: { userId: session.userId, active: true, role: 'ORGANIZER' } } } } },
  ] }) }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
}
export async function creationTemplates() {
  const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  const contexts = await availableContexts(session.userId); const sources = [];
  for (const congress of contexts) { try { await authorizeCongress(congress.id, 'settings'); sources.push({ id: congress.id, name: congress.name, organizationId: congress.organizationId }); } catch (error) { if (!(error instanceof AccessError)) throw error; } }
  return sources;
}
export async function templatePreview(id: string) {
  let context; try { context = await authorizeCongress(id, 'settings'); } catch (error) { if (error instanceof AccessError && error.status === 403) throw new AccessError(404, 'Şablon bulunamadı.'); throw error; }
  const configuration = effectiveConfiguration(context.congress.configuration);
  const modules = await prisma.congressModule.findMany({ where: { congressId:id } });
  for (const key of ['SUBMISSIONS','REGISTRATION'] as const) configuration.modules[key] = modules.some(m => m.key === key && m.enabled);
  const members = await prisma.congressMembership.findMany({ where: { congressId: id, active: true, user: { active: true, organizations: { some: { organizationId: context.congress.organizationId, active: true } } } }, select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } });
  const tiers = await prisma.paymentTier.findMany({ where: { congressId: id }, select: { role: true, audience: true, presentationMode: true, paperOrder: true, period: true, amount: true, currency: true, active: true }, orderBy: { sortOrder: 'asc' } });
  return { id, name: context.congress.name, organizationId: context.congress.organizationId, configuration: clearTemplateDates(configuration), members, tiers };
}
const creationSchema = z.object({ organizationId: z.string().min(1), slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Adres küçük harf, sayı ve tirelerden oluşmalı.').refine(s => !['admin', 'api', 'hesap', 'yeni', 'login'].includes(s), 'Bu adres kullanılamaz.'), settings: eventSettingsSchema, sourceId: z.string().optional(), copyFees: z.boolean().default(false), memberIds: z.array(z.string()).max(100).default([]) }).strict();
export async function createCongress(raw: unknown) {
  const input = parsed(creationSchema, raw); const session = await actorSession(); if (!session) throw new AccessError(401, 'Giriş yapın.');
  if (!(await creationOrganizations()).some(org => org.id === input.organizationId)) throw new AccessError(403, 'Bu kurumda kongre oluşturamazsınız.');
  if (!input.settings.eventStartsAt || !input.settings.eventEndsAt) throw new AccessError(400, 'Yeni kongre için başlangıç ve bitiş tarihi gerekli.');
  if ((input.copyFees || input.memberIds.length) && !input.sourceId) throw new AccessError(400, 'Kopyalama için kaynak kongre seçin.');
  const source = input.sourceId ? await templatePreview(input.sourceId) : null;
  if (source && source.organizationId !== input.organizationId) throw new AccessError(403, 'Yıl kopyası aynı kurum içinde oluşturulur.');
  try {
    return await prisma.$transaction(async tx => {
      const settings = input.settings;
      const congress = await tx.congress.create({ data: { organizationId: input.organizationId, slug: input.slug, name: settings.name, year: settings.year, eventStartsAt: settings.eventStartsAt, eventEndsAt: settings.eventEndsAt, earlyDeadline: settings.earlyDeadline, lateDeadline: settings.lateDeadline, bankName: settings.bankName || null, bankAccountHolder: settings.bankAccountHolder || null, bankIban: settings.bankIban || null, bankBranch: settings.bankBranch || null, configuration: settings.configuration, configVersion: 1 } });
      await writeModuleSettings(tx, congress.id, settings.configuration.modules);
      // Attendance is opt-in from the module controls, independently of programme use.
      await tx.congressModule.create({data:{congressId:congress.id,key:'ATTENDANCE',enabled:false}});
      await initializeCmsTemplates(tx, congress.id, session.userId);
      if (input.copyFees && source) await copyFeeSchedule(tx, source.id, congress.id); else await createFeeSchedule(tx, congress.id, settings.fees);
      await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: input.organizationId, userId: session.userId } }, update: {}, create: { organizationId: input.organizationId, userId: session.userId } });
      await tx.congressMembership.create({ data: { congressId: congress.id, userId: session.userId, role: 'ORGANIZER' } });
      const copied = source ? await copyCongressTeam(tx, source.id, congress.id, input.organizationId, session.userId, input.memberIds) : [];
      await tx.platformSession.update({ where: { id: session.id }, data: { congressId: congress.id } });
      await tx.auditLog.create({ data: { actorId: session.userId, organizationId: congress.organizationId, congressId: congress.id, action: source ? 'congress.year.copy' : 'congress.create', targetId: congress.id, detail: { sourceId: source?.id ?? null, profile: settings.configuration.profile, copiedFees: input.copyFees, selectedMembers: copied, cleared: ['sourceDates', 'sourceBank', 'submissions', 'registrations', 'files', 'tokens', 'exceptions', 'auditHistory'] } } });
      return { id: congress.id, slug: congress.slug };
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
  const context = await requireContext('settings'); const input = parsed(z.object({ configVersion: z.number().int().min(0), settings: eventSettingsSchema }).strict(), raw);
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
