import { effectiveRoles } from '@/platform/roles.mjs';
import type { ProgramSnapshot } from '@/modules/program/core';
import { Prisma, type ActivityEvent, type ActivityBooking } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireContext, requireModule, type CongressContext } from '@/platform/context';
import { allows, type Action } from '@/platform/policy';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { enqueueNotification } from '@/platform/notifications';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { eventSchema, joinSchema, cancelSchema, closeEventSchema, importSchema, sameVersion, canBook, occupancy, entryStatus, promotionIds, seatLimit, csvCell, bookingLabels } from '@/modules/activities/core';
import { parsed, activityAction } from '@/modules/activities/http';

type Tx = Prisma.TransactionClient;
type Identity = { congressId: string; email: string; parentSession?: { id: string } };
type EventRow = Prisma.ActivityEventGetPayload<{ include: { programSession: { include: { room: true } }; bookings: true } }>;
const eventInclude = { programSession: { include: { room: true } }, bookings: { orderBy: { queueNumber: 'asc' as const } } };
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
async function moduleIn(tx: Tx, congressId: string, key: 'ACTIVITIES' | 'PROGRAM' | 'REGISTRATION' = 'ACTIVITIES') {
  if (!(await tx.congressModule.findUnique({ where: { congressId_key: { congressId, key } } }))?.enabled) throw new AccessError(403, 'İlgili modül bu kongrede kapalı.');
}
async function lock(tx: Tx, congressId: string, c?: CongressContext, action: Action = 'activities.manage') {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id=${congressId} FOR UPDATE`; await moduleIn(tx, congressId);
  if (!c) return;
  const [user, session, org, member] = await Promise.all([
    tx.platformUser.findUnique({ where: { id: c.actor.id } }), tx.platformSession.findUnique({ where: { id: c.sessionId } }),
    tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: c.congress.organizationId, userId: c.actor.id } } }),
    tx.congressMembership.findUnique({ where: { congressId_userId: { congressId, userId: c.actor.id } } }),
  ]);
  const roles = effectiveRoles(user?.platformAdmin, org, member);
  if (!user?.active || !session || session.revokedAt || session.expiresAt <= new Date() || !roles.includes(c.role) || !allows(roles, action)) throw new AccessError(403, 'Kongre yetkiniz veya oturumunuz değişti.');
}
async function eventIn(tx: Tx, congressId: string, id: string) {
  const e = await tx.activityEvent.findFirst({ where: { id, congressId }, include: eventInclude });
  if (!e) throw new AccessError(404, 'Etkinlik bulunamadı.'); return e;
}
async function sourceReady(tx: Tx, e: EventRow) {
  if (!e.programSessionId) return true;
  return !!(await tx.congressModule.findUnique({ where: { congressId_key: { congressId: e.congressId, key: 'PROGRAM' } } }))?.enabled && !!e.programSession?.active && e.programSourceVersion === e.programSession.version;
}
async function fee(tx: Tx, e: ActivityEvent) {
  if (e.kind === 'TRIP') return { feeMinor: 0, currency: 'TRY', feeSource: 'FREE_TRIP' };
  if (e.kind === 'WORKSHOP') return { feeMinor: e.feeMinor, currency: e.currency, feeSource: 'ACTIVITY' };
  const c = await tx.congress.findUniqueOrThrow({ where: { id: e.congressId }, include: { modules: true } });
  const enabled = c.modules.some(m => m.key === 'REGISTRATION' && m.enabled) && effectiveConfiguration(c.configuration).stages.PAYMENT.enabled;
  const amount = enabled ? c.galaFeeAmount * 100 : 0;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000 || !/^[A-Z]{3}$/.test(c.galaFeeCurrency)) throw new AccessError(409, 'Gala ücret ayarını kontrol edin.');
  return { feeMinor: amount, currency: c.galaFeeCurrency, feeSource: 'GALA_SETTING' };
}
function terms(e: ActivityEvent, b: ActivityBooking) { return { titleTr: e.titleTr, titleEn: e.titleEn, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString(), location: e.location, eventVersion: e.version, bookingVersion: b.version, seats: b.seats, feeMinor: b.feeMinor, currency: b.currency, feeSource: b.feeSource, programSessionId: e.programSessionId }; }
async function record(tx: Tx, e: ActivityEvent, b: ActivityBooking, action: string, fromStatus: string | null, reason: string, c?: CongressContext) {
  const count = await tx.activityBookingEvent.count({ where: { bookingId: b.id } });
  const history = await tx.activityBookingEvent.create({ data: { bookingId: b.id, number: count + 1, action, fromStatus, toStatus: b.status, reason, origin: c ? 'STAFF' : action === 'PROMOTE' ? 'SYSTEM' : 'PARTICIPANT', actorId: c?.actor.id, snapshot: json(terms(e, b)) } });
  const congress = await tx.congress.findUniqueOrThrow({ where: { id: e.congressId } });
  await tx.auditLog.create({ data: { actorId: c?.actor.id, congressId: e.congressId, organizationId: congress.organizationId, action: 'activities.booking.' + action.toLowerCase(), targetId: b.id, detail: { status: b.status, version: b.version, reason } } });
  if (e.notifyParticipants) await enqueueNotification(tx, { congressId: e.congressId, key: 'GENERAL', locale: b.locale === 'en' ? 'en' : 'tr', to: b.email,
    dedupeKey: 'activity-booking:' + b.id + ':' + b.version, module: 'ACTIVITIES', sourceType: 'activity-booking', sourceId: history.id,
    values: { congressName: congress.name, recipientName: b.name, message: `${b.locale === 'en' ? e.titleEn || e.titleTr : e.titleTr}: ${bookingLabels[b.status]?.[b.locale === 'en' ? 1 : 0]} · ${b.seats}\n${new Date(e.startsAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n${process.env.APP_BASE_URL}/${congress.slug}/katilimci\nYer ayrılması ödeme, yoklama veya belge hakkı oluşturmaz. Reservation does not confirm payment, attendance or certificate eligibility.` } });
}
async function promote(tx: Tx, congressId: string, eventId: string, reason: string, c?: CongressContext) {
  const e = await eventIn(tx, congressId, eventId); if (!canBook(e, new Date()) || !await sourceReady(tx, e)) return;
  for (const id of promotionIds(e.capacity, e.bookings)) {
    const b = await tx.activityBooking.update({ where: { id }, data: { status: 'CONFIRMED', version: { increment: 1 } } });
    await record(tx, e, b, 'PROMOTE', 'WAITLISTED', reason, c);
  }
}
async function reserve(tx: Tx, e: EventRow, input: z.infer<typeof joinSchema>, email: string, c?: CongressContext, legacyKind?: string) {
  sameVersion(input.version, e.version);
  if (!canBook(e, new Date()) || !await sourceReady(tx, e)) throw new AccessError(409, 'Katılım şu anda kapalı veya bağlı program güncelleme bekliyor.');
  seatLimit(e.kind, input.seats);
  const existing = e.bookings.find(b => b.email === email);
  if (existing && existing.status !== 'CANCELLED') throw new AccessError(409, 'Bu etkinlikte zaten kaydınız var.');
  let price = await fee(tx, e);
  if (input.registrationId) {
    await moduleIn(tx, e.congressId, 'REGISTRATION');
    const r = await tx.registration.findFirst({ where: { id: input.registrationId, congressId: e.congressId, email: { equals: email, mode: 'insensitive' } } });
    if (!r) throw new AccessError(404, 'Kendi kongre kaydınız bulunamadı.');
    if (legacyKind === 'GALA') price = { feeMinor: (r.galaFeeAmount ?? 0) * 100, currency: r.galaFeeCurrency ?? 'EUR', feeSource: 'LEGACY_REGISTRATION' };
    if (legacyKind && await tx.activityBooking.findFirst({ where: { registrationId: r.id, legacyKind, ...(existing ? { id: { not: existing.id } } : {}) } })) throw new AccessError(409, 'Bu eski tercih başka etkinlikte zaten eşleştirilmiş.');
  }
  if (price.feeMinor !== input.feeMinor || price.currency !== input.currency) throw new AccessError(409, 'Ücret bilgisi değişti. Yenileyip tekrar onaylayın.');
  if (!existing && await tx.activityBooking.count({ where: { event: { congressId: e.congressId } } }) >= 5000) throw new AccessError(400, 'İlk sürümde toplam 5000 katılım kaydı desteklenir.');
  if (existing?.legacyKind && (input.registrationId !== existing.registrationId || legacyKind !== existing.legacyKind)) throw new AccessError(409, 'Eski tercih bağlantısını koruyarak sekreteryadan yeniden eşleştirin.');
  const data = { name: input.name, seats: input.seats, status: entryStatus(e.capacity, e.bookings, input.seats), queueNumber: e.nextQueue + 1, locale: input.locale,
    ...price, registrationId: input.registrationId, legacyKind: legacyKind ?? null };
  const b = existing ? await tx.activityBooking.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } }) : await tx.activityBooking.create({ data: { ...data, email, eventId: e.id } });
  await tx.activityEvent.update({ where: { id: e.id }, data: { nextQueue: { increment: 1 } } });
  await record(tx, e, b, legacyKind ? 'LEGACY_LINK' : 'JOIN', existing?.status ?? null, input.reason, c); return { id: b.id, version: b.version, status: b.status };
}
async function cancel(tx: Tx, congressId: string, raw: unknown, email?: string, c?: CongressContext) {
  const v = parsed(cancelSchema, raw);
  const b = await tx.activityBooking.findFirst({ where: { id: v.bookingId, event: { congressId }, ...(email ? { email } : {}) } });
  if (!b) throw new AccessError(404, 'Katılım kaydınız bulunamadı.'); sameVersion(v.version, b.version);
  if (b.status === 'CANCELLED') throw new AccessError(409, 'Kayıt zaten iptal edilmiş.');
  const e = await eventIn(tx, congressId, b.eventId);
  if (!c && e.startsAt <= new Date()) throw new AccessError(409, 'Etkinlik başladı. Sekreteryaya başvurun.');
  const changed = await tx.activityBooking.update({ where: { id: b.id }, data: { status: 'CANCELLED', version: { increment: 1 } } });
  await record(tx, e, changed, 'CANCEL', b.status, v.reason, c); await promote(tx, congressId, e.id, 'Boşalan kontenjan için bekleme sırasından yer ayrıldı.', c);
  return { id: changed.id, version: changed.version, status: changed.status };
}
export async function manageActivities(raw: unknown) {
  const c = await requireContext('activities.manage', 'ACTIVITIES');
  const envelope = parsed(z.object({ action: z.enum(['EVENT', 'CANCEL_EVENT', 'CANCEL_BOOKING', 'IMPORT']), input: z.unknown() }).strict(), raw);
  return activityAction(() => prisma.$transaction(async tx => {
    await lock(tx, c.congress.id, c);
    if (envelope.action === 'CANCEL_BOOKING') return cancel(tx, c.congress.id, envelope.input, undefined, c);
    if (envelope.action === 'CANCEL_EVENT') {
      const v = parsed(closeEventSchema, envelope.input), e = await eventIn(tx, c.congress.id, v.eventId); sameVersion(v.version, e.version);
      if (e.cancelledAt) throw new AccessError(409, 'Etkinlik zaten iptal edilmiş.');
      const changed = await tx.activityEvent.update({ where: { id: e.id }, data: { cancelledAt: new Date(), bookingOpen: false, version: { increment: 1 } } });
      for (const b of e.bookings.filter(b => b.status !== 'CANCELLED')) { const next = await tx.activityBooking.update({ where: { id: b.id }, data: { status: 'CANCELLED', version: { increment: 1 } } }); await record(tx, changed, next, 'CANCEL_EVENT', b.status, v.reason, c); }
      await tx.auditLog.create({ data: auditData(c, 'activities.event.cancel', e.id, { reason: v.reason, version: changed.version }) }); return { id: changed.id, version: changed.version };
    }
    if (envelope.action === 'IMPORT') {
      const v = parsed(importSchema, envelope.input); await moduleIn(tx, c.congress.id, 'REGISTRATION');
      const e = await eventIn(tx, c.congress.id, v.eventId), r = await tx.registration.findFirst({ where: { id: v.registrationId, congressId: c.congress.id } });
      if (!r || !['TRIP', 'GALA'].includes(e.kind) || !(e.kind === 'GALA' ? r.galaAttendance : r.tripAttendance)) throw new AccessError(404, 'Eşleşen eski sosyal tercih bulunamadı.');
      const seats = e.kind === 'GALA' ? r.galaAttendeeCount : r.tripAttendeeCount;
      if (seats < 1 || seats > 10) throw new AccessError(400, 'Eski tercih kişi sayısını sekreterya incelemeli (1–10).');
      const price = e.kind === 'GALA' ? { feeMinor: (r.galaFeeAmount ?? 0) * 100, currency: r.galaFeeCurrency ?? 'EUR' } : { feeMinor: 0, currency: 'TRY' };
      return reserve(tx, e, parsed(joinSchema, { version: v.version, reason: v.reason, confirmed: v.confirmed, eventId: v.eventId, registrationId: v.registrationId, name: v.name, seats, locale: 'tr', ...price }), r.email.toLowerCase(), c, e.kind);
    }
    const v = parsed(eventSchema, envelope.input), old = v.id ? await eventIn(tx, c.congress.id, v.id) : null;
    sameVersion(v.version, old?.version ?? 0);
    if (old?.cancelledAt) throw new AccessError(409, 'İptal edilmiş etkinliğin geçmişi değişmez. Yeni etkinlik oluşturun.');
    if (!old && await tx.activityEvent.count({ where: { congressId: c.congress.id } }) >= 100) throw new AccessError(400, 'İlk sürümde 100 etkinlik desteklenir.');
    if (old?.bookings.length && old.kind !== v.kind) throw new AccessError(409, 'Katılım geçmişi olan etkinliğin türü değişmez.');
    if (old && occupancy(old.bookings) > v.capacity) throw new AccessError(409, 'Kontenjan ayrılmış yer sayısının altına inemez.');
    let changedTerms = !!old && ['startsAt', 'endsAt', 'location', 'programSessionId', 'feeMinor', 'currency', 'published'].some(key => String(old[key as keyof ActivityEvent]) !== String(['startsAt', 'endsAt'].includes(key) ? new Date(v[key as 'startsAt' | 'endsAt']) : v[key as keyof typeof v]));
    let programSourceVersion: number | null = null;
    if (v.programSessionId) { await moduleIn(tx, c.congress.id, 'PROGRAM'); const s = await tx.programSession.findFirst({ where: { id: v.programSessionId, congressId: c.congress.id, active: true } }); if (!s) throw new AccessError(404, 'Aktif program oturumu bulunamadı.'); programSourceVersion = s.version; }
    changedTerms ||= !!old && old.programSourceVersion !== programSourceVersion;
    if (changedTerms && old?.bookings.some(b => b.status !== 'CANCELLED') && !v.acknowledgeParticipants) throw new AccessError(409, 'Mevcut katılımcıları ve değişen koşulları ayrıca onaylayın.');
    if (v.notifyParticipants && !(await tx.emailSettings.findUnique({ where: { congressId: c.congress.id } }))?.replyTo) throw new AccessError(400, 'E-posta bildirimi için izlenen Reply-To ayarlayın.');
    const data = { kind: v.kind, titleTr: v.titleTr, titleEn: v.titleEn, descriptionTr: v.descriptionTr, descriptionEn: v.descriptionEn, location: v.location,
      startsAt: new Date(v.startsAt), endsAt: new Date(v.endsAt), opensAt: new Date(v.opensAt), closesAt: new Date(v.closesAt), capacity: v.capacity,
      published: v.published, bookingOpen: v.bookingOpen, programSessionId: v.programSessionId, programSourceVersion, feeMinor: v.feeMinor, currency: v.currency, notifyParticipants: v.notifyParticipants };
    const e = old ? await tx.activityEvent.update({ where: { id: old.id }, data: { ...data, version: { increment: 1 } } }) : await tx.activityEvent.create({ data: { ...data, congressId: c.congress.id } });
    if (changedTerms && old) for (const b of old.bookings.filter(b => b.status !== 'CANCELLED')) { const next = await tx.activityBooking.update({ where: { id: b.id }, data: { version: { increment: 1 } } }); await record(tx, e, next, 'UPDATE_TERMS', b.status, v.reason, c); }
    await tx.auditLog.create({ data: auditData(c, 'activities.event.save', e.id, { reason: v.reason, version: e.version }) });
    await promote(tx, c.congress.id, e.id, 'Kontenjan/katılım ayarı sonrası bekleme sırasından yer ayrıldı.', c); return { id: e.id, version: e.version };
  }, { timeout: 30000 }));
}
export async function ownActivityAction(raw: unknown, identity?: Identity) {
  const c = identity ? undefined : await requireContext('own', 'ACTIVITIES');
  const congressId = identity?.congressId ?? c!.congress.id, email = (identity?.email ?? c!.actor.email).toLowerCase();
  const envelope = parsed(z.object({ action: z.enum(['JOIN', 'CANCEL']), input: z.unknown() }).strict(), raw);
  return activityAction(() => prisma.$transaction(async tx => {
    await lock(tx, congressId, c, 'own');
    if (identity) { const s = identity.parentSession ? await tx.participantSession.findUnique({ where: { id: identity.parentSession.id } }) : null; if (!s || s.congressId !== congressId || s.email.toLowerCase() !== email || s.revokedAt || s.expiresAt <= new Date()) throw new AccessError(401, 'Katılımcı oturumunuz sona ermiş.'); }
    if (await tx.activityBookingEvent.count({ where: { booking: { email, event: { congressId } }, origin: 'PARTICIPANT', action: { in: ['JOIN', 'CANCEL'] }, createdAt: { gt: new Date(Date.now() - 3600000) } } }) >= 20) throw new AccessError(429, 'Bir saatte en fazla 20 katılım işlemi yapabilirsiniz.');
    if (envelope.action === 'CANCEL') return cancel(tx, congressId, envelope.input, email);
    const v = parsed(joinSchema, envelope.input); return reserve(tx, await eventIn(tx, congressId, v.eventId), v, email);
  }, { timeout: 30000 }));
}
async function view(tx: Tx, e: EventRow) {
  const ready = await sourceReady(tx, e), price = await fee(tx, e);
  const congress = e.programSessionId && ready ? await tx.congress.findUnique({where:{id:e.congressId},include:{programPublished:true}}) : null;
  const published = congress?.programPublished ? (congress.programPublished.snapshot as unknown as ProgramSnapshot).sessions.find(s=>s.id===e.programSessionId && s.version===e.programSourceVersion) : null;
  return { id: e.id, version: e.version, kind: e.kind, titleTr: e.titleTr, titleEn: e.titleEn, descriptionTr: e.descriptionTr, descriptionEn: e.descriptionEn, location: e.location,
    startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString(), opensAt: e.opensAt.toISOString(), closesAt: e.closesAt.toISOString(), capacity: e.capacity,
    reservedSeats: occupancy(e.bookings), waitingSeats: e.bookings.filter(b => b.status === 'WAITLISTED').reduce((n, b) => n + b.seats, 0),
    published: e.published, bookingOpen: e.bookingOpen, cancelled: !!e.cancelledAt, programChanged: !ready, available: canBook(e, new Date()) && ready,
    programSessionId: e.programSessionId, program: published ? { titleTr: published.titleTr, titleEn: published.titleEn, startsAt: published.startsAt, room: published.room } : null, ...price };
}
async function events(tx: Tx, congressId: string, publicOnly = false) { const rows = await tx.activityEvent.findMany({ where: { congressId, ...(publicOnly ? { published: true } : {}) }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], include: eventInclude, take: 101 }); if (rows.length > 100) throw new AccessError(400, 'Etkinlik liste sınırı aşıldı.'); return rows; }
function bookingView(b: ActivityBooking) { return { id: b.id, name: b.name, seats: b.seats, status: b.status, version: b.version, queueNumber: b.queueNumber, feeMinor: b.feeMinor, currency: b.currency, feeSource: b.feeSource, registrationId: b.registrationId, legacyKind: b.legacyKind }; }
export async function ownActivities(congressId: string, email: string) {
  await requireModule(congressId, 'ACTIVITIES'); const rows = await events(prisma, congressId);
  return { events: await Promise.all(rows.filter(e => e.published || e.bookings.some(b => b.email === email.toLowerCase())).map(async e => {
    const b = e.bookings.find(b => b.email === email.toLowerCase());
    const history = b ? await prisma.activityBookingEvent.findMany({ where: { bookingId: b.id }, orderBy: { number: 'desc' }, take: 20, select: { number: true, action: true, fromStatus: true, toStatus: true, reason: true, snapshot: true, createdAt: true } }) : [];
    return { ...await view(prisma, e), booking: b ? { ...bookingView(b), history: history.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })) } : null };
  })) };
}
export type OwnActivities = Awaited<ReturnType<typeof ownActivities>>;
export async function publicActivities(slug: string) {
  const c = await prisma.congress.findUnique({ where: { slug } }); if (!c) throw new AccessError(404, 'Kongre bulunamadı.'); await requireModule(c.id, 'ACTIVITIES');
  return { congressName: c.name, events: await Promise.all((await events(prisma, c.id, true)).map(e => view(prisma, e))) };
}
export async function activitiesManager() {
  const c = await requireContext('activities.read', 'ACTIVITIES'); const rows = await events(prisma, c.congress.id);
  const [modules, legacyPreferences, sessions] = await Promise.all([
    prisma.congressModule.findMany({ where: { congressId: c.congress.id, enabled: true } }),
    prisma.registration.findMany({ where: { congressId: c.congress.id, OR: [{ galaAttendance: true }, { tripAttendance: true }] }, orderBy: { createdAt: 'desc' }, take: 501, select: { id: true, email: true, galaAttendance: true, galaAttendeeCount: true, tripAttendance: true, tripAttendeeCount: true, galaFeeAmount: true, galaFeeCurrency: true } }),
    prisma.programSession.findMany({ where: { congressId: c.congress.id, active: true }, orderBy: { startsAt: 'asc' }, take: 501, select: { id: true, titleTr: true } }),
  ]);
  const registrationOpen = modules.some(m => m.key === 'REGISTRATION'), programOpen = modules.some(m => m.key === 'PROGRAM');
  if (legacyPreferences.length > 500 || sessions.length > 500) throw new AccessError(400, 'Eski tercih/program liste sınırı aşıldı.');
  return { defaults: {startsAt:new Date(Date.now()+10*86400000).toISOString(),endsAt:new Date(Date.now()+10*86400000+3600000).toISOString(),opensAt:new Date().toISOString(),closesAt:new Date(Date.now()+9*86400000).toISOString()}, slug: c.congress.slug, congressName: c.congress.name, legacyPreferences: registrationOpen ? legacyPreferences : [], sessions: programOpen ? sessions : [],
    events: await Promise.all(rows.map(async e => ({ ...await view(prisma, e), notifyParticipants: e.notifyParticipants, configuredFeeMinor: e.feeMinor, configuredCurrency: e.currency,
      bookings: await Promise.all(e.bookings.map(async b => ({ ...bookingView(b), email: b.email, history: (await prisma.activityBookingEvent.findMany({ where: { bookingId: b.id }, orderBy: { number: 'desc' }, take: 20 })).map(h => ({ number: h.number, action: h.action, fromStatus: h.fromStatus, toStatus: h.toStatus, reason: h.reason, snapshot: h.snapshot, createdAt: h.createdAt.toISOString() })) }))) }))) };
}
export type ActivitiesManager = Awaited<ReturnType<typeof activitiesManager>>;
export async function activityParticipantsCsv(id: string) {
  const c = await requireContext('activities.read', 'ACTIVITIES'), e = await eventIn(prisma, c.congress.id, id);
  const header = ['Ad', 'E-posta', 'Durum', 'Kişi sayısı', 'Sıra', 'Kişi başı ücret (minor)', 'Döviz', 'Kongre kayıt bağlantısı'];
  return '\uFEFF' + [header, ...e.bookings.map(b => [b.name, b.email, b.status, b.seats, b.queueNumber, b.feeMinor, b.currency, b.registrationId ?? ''])].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export async function activityFollowup(congressId: string) {
  return (await events(prisma, congressId)).filter(e => e.bookings.some(b => b.status === 'WAITLISTED')).map(e => ({ id: 'ACTIVITY:' + e.id, sourceType: 'ACTIVITY' as const, sourceId: e.id, subject: e.titleTr, email: '', reasons: ['Etkinlik bekleme listesinde katılımcılar var; kontenjan ve sıra kontrolü gerekli.'], href: '/admin/etkinlikler' }));
}
