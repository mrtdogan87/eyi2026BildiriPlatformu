import { z } from 'zod';

export const kindLabels: Record<string, [string, string]> = { WORKSHOP: ['Workshop', 'Workshop'], TRIP: ['Gezi', 'Trip'], GALA: ['Gala', 'Gala'] };
export const bookingLabels: Record<string, [string, string]> = { CONFIRMED: ['Yer ayrıldı', 'Reserved'], WAITLISTED: ['Bekleme listesinde', 'Waitlisted'], CANCELLED: ['İptal edildi', 'Cancelled'] };
const id = z.string().min(1).max(100), date = z.string().datetime({ offset: true });
const common = { version: z.number().int().min(0), reason: z.string().trim().min(8).max(2000), confirmed: z.literal(true) };
export const eventSchema = z.object({
  ...common, id: id.optional(), kind: z.enum(['WORKSHOP', 'TRIP', 'GALA']),
  titleTr: z.string().trim().min(2).max(300), titleEn: z.string().trim().max(300),
  descriptionTr: z.string().trim().max(4000), descriptionEn: z.string().trim().max(4000), location: z.string().trim().max(300),
  startsAt: date, endsAt: date, opensAt: date, closesAt: date,
  capacity: z.number().int().min(1).max(10000), published: z.boolean(), bookingOpen: z.boolean(),
  programSessionId: id.nullable().default(null), feeMinor: z.number().int().min(0).max(100000000), currency: z.enum(['TRY', 'EUR', 'USD']),
  notifyParticipants: z.boolean().default(false), acknowledgeParticipants: z.boolean().default(false),
}).strict().superRefine((v, c) => {
  if (Date.parse(v.endsAt) <= Date.parse(v.startsAt) || Date.parse(v.endsAt) - Date.parse(v.startsAt) > 86400000)
    c.addIssue({ code: 'custom', message: 'Etkinlik süresi 0–24 saat aralığında olmalı.' });
  if (Date.parse(v.closesAt) <= Date.parse(v.opensAt) || Date.parse(v.closesAt) > Date.parse(v.startsAt))
    c.addIssue({ code: 'custom', message: 'Katılım aralığı geçerli olmalı ve etkinlik başlangıcında bitmeli.' });
  if (v.bookingOpen && !v.published) c.addIssue({ code: 'custom', message: 'Katılımı açmak için etkinliği yayımlayın.' });
  if (v.kind !== 'WORKSHOP' && v.feeMinor !== 0) c.addIssue({ code: 'custom', message: 'Gezi ücretsizdir; gala mevcut kayıt ücret ayarını kullanır.' });
});
export const joinSchema = z.object({
  ...common, eventId: id, name: z.string().trim().min(2).max(300), seats: z.number().int().min(1).max(10),
  feeMinor: z.number().int().min(0).max(100000000), currency: z.string().regex(/^[A-Z]{3}$/),
  locale: z.enum(['tr', 'en']).default('tr'), registrationId: id.nullable().default(null),
}).strict();
export const cancelSchema = z.object({ ...common, bookingId: id }).strict();
export const closeEventSchema = z.object({ ...common, eventId: id }).strict();
export const importSchema = z.object({ ...common, eventId: id, registrationId: id, name: z.string().trim().min(2).max(300), legacyConfirmed: z.literal(true) }).strict();
export class ActivityError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export function sameVersion(expected: number, actual: number) { if (expected !== actual) throw new ActivityError(409, 'Kayıt değişti. Yenileyip tekrar inceleyin.'); }
export type Availability = { published: boolean; bookingOpen: boolean; cancelledAt: Date | string | null; opensAt: Date | string; closesAt: Date | string; startsAt: Date | string };
export function canBook(e: Availability, now: Date) { return e.published && e.bookingOpen && !e.cancelledAt && new Date(e.opensAt) <= now && now < new Date(e.closesAt) && now < new Date(e.startsAt); }
export type SeatRow = { id: string; seats: number; status: string; queueNumber: number };
export function occupancy(rows: SeatRow[]) { return rows.filter(b => b.status === 'CONFIRMED').reduce((n, b) => n + b.seats, 0); }
export function entryStatus(capacity: number, rows: SeatRow[], seats: number) {
  if (seats > capacity) throw new ActivityError(400, 'Grup kişi sayısı toplam kontenjanı aşamaz.');
  return !rows.some(b => b.status === 'WAITLISTED') && occupancy(rows) + seats <= capacity ? 'CONFIRMED' : 'WAITLISTED';
}
// Groups are indivisible. A smaller later group never jumps the first group.
export function promotionIds(capacity: number, rows: SeatRow[]) {
  let free = capacity - occupancy(rows); const ids: string[] = [];
  for (const row of rows.filter(b => b.status === 'WAITLISTED').sort((a, b) => a.queueNumber - b.queueNumber)) {
    if (row.seats > free) break; ids.push(row.id); free -= row.seats;
  }
  return ids;
}
export function csvCell(value: string | number) { const raw = String(value); return '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw).replaceAll('"', '""') + '"'; }
export function seatLimit(kind: string, seats: number) { if (kind === 'WORKSHOP' && seats !== 1) throw new ActivityError(400, 'Workshop kaydı kişi başına bir yer içindir.'); }
