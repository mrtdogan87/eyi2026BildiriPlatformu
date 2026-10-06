import { z } from 'zod';
import type { EmailMessage, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext } from '@/platform/context';
import { allows } from '@/platform/policy';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { getEnvironment } from '@/lib/environment';
import { enqueueMessage } from './queue.mjs';
import { defaultTemplate, templateKeys, templateInputSchema, renderTemplate, sampleTemplateValues, isSafeEmailUrl, type TemplateKey, type TemplateLocale } from './templates';

const version = z.number().int().min(0);
const email = z.string().trim().toLowerCase().email().max(254);
const keyLocale = z.object({ key: z.enum(templateKeys), locale: z.enum(['tr', 'en']) });
const messageAction = z.object({ version: version.min(1) }).strict();
const authTemplates = new Set(['DRAFT_ACCESS', 'REGISTRATION_ACCESS', 'ACCOUNT_ACTIVATION']);
function parsed<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new AccessError(400, result.error.issues[0]?.message || 'Alanları kontrol edin.');
  return result.data;
}
function publicMessage(m: EmailMessage) {
  return { id: m.id, recipient: m.recipient, subject: m.subject, locale: m.locale,
    templateKey: m.templateKey, templateVersion: m.templateVersion, status: m.status,
    attempts: m.attempts, version: m.version, provider: m.provider, providerId: m.providerId,
    replyTo: m.replyTo, sourceType: m.sourceType, sourceId: m.sourceId, module: m.module,
    createdAt: m.createdAt.toISOString(), nextAttemptAt: m.nextAttemptAt?.toISOString() ?? null,
    acceptedAt: m.acceptedAt?.toISOString() ?? null, expiresAt: m.expiresAt?.toISOString() ?? null,
    deliveryConfirmed: false, readConfirmed: false };
}
async function settingsFor(db: Pick<Prisma.TransactionClient, 'emailSettings'>, congressId: string) {
  const row = await db.emailSettings.findUnique({ where: { congressId } });
  return { replyTo: row?.replyTo ?? '', replyUrl: row?.replyUrl ?? '', version: row?.version ?? 0 };
}
async function templateFor(db: Pick<Prisma.TransactionClient, 'emailTemplate'>, congressId: string, key: TemplateKey, locale: TemplateLocale) {
  const row = await db.emailTemplate.findUnique({ where: { congressId_key_locale: { congressId, key, locale } } });
  return { key, locale, ...defaultTemplate(key, locale), ...(row ? { subject: row.subject, body: row.body } : {}), version: row?.version ?? 0 };
}
export async function communicationOverview() {
  const c = await requireContext('communications');
  const [settings, rows, messages, issues] = await Promise.all([
    settingsFor(prisma, c.congress.id),
    prisma.emailTemplate.findMany({ where: { congressId: c.congress.id } }),
    prisma.emailMessage.findMany({ where: { congressId: c.congress.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.emailDeliveryIssue.findMany({ where: { congressId: c.congress.id }, include: { message: true }, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 100 }),
  ]);
  const templates = templateKeys.flatMap(key => (['tr', 'en'] as const).map(locale => {
    const row = rows.find(r => r.key === key && r.locale === locale);
    return { key, locale, ...defaultTemplate(key, locale), ...(row ? { subject: row.subject, body: row.body } : {}), version: row?.version ?? 0 };
  }));
  return { congress: { name: c.congress.name, slug: c.congress.slug }, mode: getEnvironment().mode,
    canManage: allows(c.role, 'communication.manage'), settings, templates,
    messages: messages.map(publicMessage), issues: issues.map(i => ({ id: i.id, messageId: i.messageId, status: i.status, version: i.version, note: i.note, resolution: i.resolution,
      createdAt: i.createdAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null, message: publicMessage(i.message) })) };
}
export async function saveCommunicationSettings(raw: unknown) {
  const c = await requireContext('communication.manage');
  const input = parsed(z.object({ version, replyTo: z.union([z.literal(''), email]), replyUrl: z.string().trim().max(1000) }).strict(), raw);
  if (input.replyUrl) {
    if (!isSafeEmailUrl(input.replyUrl)) throw new AccessError(400, 'İletişim bağlantısı boşluk veya kontrol karakteri içeremez.');
    let url: URL;
    try { url = new URL(input.replyUrl); } catch { throw new AccessError(400, 'Geçerli bir kongre iletişim sayfası adresi girin.'); }
    if (url.origin !== new URL(process.env.APP_BASE_URL!).origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(`/${c.congress.slug}/`) || /%|\\/.test(url.pathname)) {
      throw new AccessError(400, 'İletişim bağlantısı bu kongrenin aynı sitedeki sayfası olmalı; sorgu veya erişim anahtarı içermemeli.');
    }
    input.replyUrl = url.href;
  }
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`communication:${c.congress.id}`}))`;
    const previous = await settingsFor(tx, c.congress.id);
    if (previous.version !== input.version) throw new AccessError(409, 'Ayarlar değişti; sayfayı yenileyin.');
    const data = { replyTo: input.replyTo || null, replyUrl: input.replyUrl || null };
    await tx.emailSettings.upsert({ where: { congressId: c.congress.id }, create: { congressId: c.congress.id, ...data }, update: { ...data, version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'communication.settings', c.congress.id, { version: input.version + 1 }) });
    return settingsFor(tx, c.congress.id);
  });
}
export async function saveCommunicationTemplate(raw: unknown) {
  const c = await requireContext('communication.manage');
  const input = parsed(templateInputSchema.safeExtend({ version }).strict(), raw);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`communication:${c.congress.id}`}))`;
    const previous = await templateFor(tx, c.congress.id, input.key, input.locale);
    if (previous.version !== input.version) throw new AccessError(409, 'Şablon değişti; sayfayı yenileyin.');
    await tx.emailTemplate.upsert({ where: { congressId_key_locale: { congressId: c.congress.id, key: input.key, locale: input.locale } },
      create: { congressId: c.congress.id, key: input.key, locale: input.locale, subject: input.subject, body: input.body, version: 2 },
      update: { subject: input.subject, body: input.body, version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'communication.template', `${input.key}:${input.locale}`, { version: input.version ? input.version + 1 : 2 }) });
    return templateFor(tx, c.congress.id, input.key, input.locale);
  });
}
export async function previewCommunicationTemplate(raw: unknown) {
  const c = await requireContext('communications');
  const input = parsed(templateInputSchema, raw);
  const settings = await settingsFor(prisma, c.congress.id);
  try { return renderTemplate({ ...input, values: { ...sampleTemplateValues(input.key, input.locale), congressName: c.congress.name }, replyTo: settings.replyTo || undefined, replyUrl: settings.replyUrl || undefined }); }
  catch { throw new AccessError(400, 'Şablon alanlarını ve yanıt adresini kontrol edin. Yanıt beklenen şablon için Reply-To gereklidir.'); }
}
export async function sendCommunicationTest(raw: unknown) {
  const c = await requireContext('communications');
  if (getEnvironment().mode === 'production') throw new AccessError(403, 'Örnek gönderim yalnız e-posta yakalama ortamında kullanılabilir.');
  const input = parsed(keyLocale.extend({ recipient: email.refine(v => v.endsWith('.invalid'), 'Örnek alıcı .invalid ile bitmeli.'), requestKey: z.string().uuid() }).strict(), raw);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`communication:${c.congress.id}`}))`;
    const template = await templateFor(tx, c.congress.id, input.key, input.locale);
    const settings = await settingsFor(tx, c.congress.id);
    let rendered;
    try { rendered = renderTemplate({ ...template, values: { ...sampleTemplateValues(input.key, input.locale), congressName: c.congress.name }, replyTo: settings.replyTo || undefined, replyUrl: settings.replyUrl || undefined }); }
    catch { throw new AccessError(400, 'Örnek için şablon alanlarını ve Reply-To ayarını kontrol edin.'); }
    const dedupeKey = `template-test:${input.requestKey}`;
    const previous = await tx.emailMessage.findUnique({ where: { congressId_dedupeKey: { congressId: c.congress.id, dedupeKey } } });
    if (!previous && await tx.emailMessage.count({ where: { congressId: c.congress.id, sourceType: 'TEMPLATE_TEST', createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 20) throw new AccessError(429, 'Bir dakikada en fazla 20 örnek hazırlayabilirsiniz.');
    let message;
    try { message = await enqueueMessage(tx, { congressId: c.congress.id, dedupeKey, templateKey: input.key, templateVersion: template.version || 1, locale: input.locale, recipient: input.recipient, ...rendered, replyTo: settings.replyTo || undefined, sourceType: 'TEMPLATE_TEST', sourceId: input.requestKey }); }
    catch (error) { if ((error as { code?: string }).code === 'EMAIL_DEDUPE_CONFLICT') throw new AccessError(409, 'Bu örnek anahtarı farklı içerik için kullanıldı.'); throw error; }
    if (!previous) await tx.auditLog.create({ data: auditData(c, 'communication.test', message.id, { templateKey: input.key, locale: input.locale }) });
    return { id: message.id, status: message.status };
  });
}
export async function communicationMessage(id: string) {
  const c = await requireContext('communications');
  const message = await prisma.emailMessage.findFirst({ where: { id, congressId: c.congress.id }, include: { history: { orderBy: { number: 'asc' } } } });
  if (!message) throw new AccessError(404, 'İleti bulunamadı.');
  return { message: publicMessage(message), attempts: message.history.map(a => ({ number: a.number, provider: a.provider, outcome: a.outcome, errorCode: a.errorCode, errorSummary: a.errorSummary, startedAt: a.startedAt.toISOString(), finishedAt: a.finishedAt.toISOString() })) };
}
export async function retryCommunicationMessage(id: string, raw: unknown) {
  const c = await requireContext('communications'); const input = parsed(messageAction, raw);
  return prisma.$transaction(async tx => {
    const m = await tx.emailMessage.findFirst({ where: { id, congressId: c.congress.id } });
    if (!m) throw new AccessError(404, 'İleti bulunamadı.');
    if (m.status !== 'RETRY') throw new AccessError(400, 'Yalnız kesin geçici hata yeniden denenebilir. Kalıcı adres hatası ve belirsiz sonuç için teslim sorununu inceleyin.');
    if (m.expiresAt && m.expiresAt <= new Date()) throw new AccessError(400, 'İletinin süresi doldu; ilgili işlemden yeni bağlantı isteyin.');
    const result = await tx.emailMessage.updateMany({ where: { id, congressId: c.congress.id, status: 'RETRY', version: input.version }, data: { nextAttemptAt: new Date(), version: { increment: 1 } } });
    if (!result.count) throw new AccessError(409, 'İleti değişti; listeyi yenileyin.');
    await tx.auditLog.create({ data: auditData(c, 'communication.retry', id) }); return { ok: true };
  });
}
export async function cancelCommunicationMessage(id: string, raw: unknown) {
  const c = await requireContext('communications'); const input = parsed(messageAction.extend({ reason: z.string().trim().min(8).max(1000) }).strict(), raw);
  return prisma.$transaction(async tx => {
    const m = await tx.emailMessage.findFirst({ where: { id, congressId: c.congress.id } });
    if (!m) throw new AccessError(404, 'İleti bulunamadı.');
    if (!['PENDING', 'RETRY', 'UNKNOWN', 'PERMANENT_FAILURE'].includes(m.status)) throw new AccessError(400, 'İşlenmekte olan veya sonucu kesinleşmiş ileti bu işlemle iptal edilemez.');
    const result = await tx.emailMessage.updateMany({ where: { id, congressId: c.congress.id, status: m.status, version: input.version }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    if (!result.count) throw new AccessError(409, 'İleti değişti; listeyi yenileyin.');
    await tx.emailDeliveryIssue.updateMany({ where: { messageId: id, congressId: c.congress.id, status: 'OPEN' }, data: { status: 'RESOLVED', resolution: 'CANCELLED', note: input.reason, resolvedAt: new Date(), updatedById: c.actor.id, version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'communication.cancel', id, { reason: input.reason }) }); return { ok: true };
  });
}
export async function updateCommunicationIssue(id: string, raw: unknown) {
  const c = await requireContext('communications');
  const input = parsed(z.object({ version: version.min(1), action: z.enum(['RESOLVE', 'CORRECT_ADDRESS']), note: z.string().trim().min(8).max(2000), recipient: email.optional() }).strict(), raw);
  return prisma.$transaction(async tx => {
    const issue = await tx.emailDeliveryIssue.findFirst({ where: { id, congressId: c.congress.id }, include: { message: true } });
    if (!issue) throw new AccessError(404, 'Teslim sorunu bulunamadı.');
    if (issue.status !== 'OPEN' || issue.version !== input.version) throw new AccessError(409, 'Teslim sorunu değişti; listeyi yenileyin.');
    const m = issue.message; let replacementId: string | undefined;
    if (input.action === 'CORRECT_ADDRESS') {
      if (authTemplates.has(m.templateKey)) throw new AccessError(400, 'Erişim/etkinleştirme bağlantıları başka adrese taşınamaz. Önce ilgili hesap veya başvuru akışında adresi doğrulayın ve yeni bağlantı oluşturun.');
      if (m.status !== 'PERMANENT_FAILURE' || !input.recipient || input.recipient === m.recipient || (m.expiresAt && m.expiresAt <= new Date())) throw new AccessError(400, 'Kalıcı hata için doğrulanmış farklı alıcı adresi ve geçerli ileti gerekir.');
      const claimed = await tx.emailMessage.updateMany({ where: { id: m.id, status: 'PERMANENT_FAILURE', version: m.version }, data: { version: { increment: 1 } } });
      if (!claimed.count) throw new AccessError(409, 'İleti değişti; listeyi yenileyin.');
      const replacement = await enqueueMessage(tx, { congressId: c.congress.id, dedupeKey: `address-correction:${issue.id}:${issue.version}`, templateKey: m.templateKey, templateVersion: m.templateVersion, locale: m.locale as TemplateLocale, recipient: input.recipient, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo ?? undefined, module: m.module ?? undefined, sourceType: m.sourceType ?? undefined, sourceId: m.sourceId ?? undefined, expiresAt: m.expiresAt ?? undefined });
      replacementId = replacement.id;
    }
    const updated = await tx.emailDeliveryIssue.updateMany({ where: { id, congressId: c.congress.id, version: input.version, status: 'OPEN' }, data: { status: 'RESOLVED', note: input.note, resolution: input.action === 'CORRECT_ADDRESS' ? 'ADDRESS_CORRECTED' : 'REVIEWED', resolvedAt: new Date(), updatedById: c.actor.id, version: { increment: 1 } } });
    if (!updated.count) throw new AccessError(409, 'Teslim sorunu değişti; listeyi yenileyin.');
    await tx.auditLog.create({ data: auditData(c, 'communication.issue.resolve', id, { action: input.action, note: input.note, ...(replacementId ? { replacementId } : {}) }) });
    return { ok: true, replacementId };
  });
}
