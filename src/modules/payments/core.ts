// Payment facts are supplied by the host. Receipt upload and bank confirmation
// deliberately remain separate. All amounts use integer hundredths, never floats.
export class PaymentError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export const paymentLabels: Record<string, [string, string]> = {
  AWAITING_RECEIPT: ['Dekont bekleniyor', 'Awaiting receipt'],
  RECEIPT_RECEIVED_UNVERIFIED: ['Dekont alındı · doğrulanmadı', 'Receipt received · unverified'],
  PENDING: ['Kontrol bekliyor', 'Review pending'], VERIFIED: ['Ödeme doğrulandı', 'Payment verified'],
  UNDERPAID: ['Eksik ödeme', 'Underpayment'], OVERPAID: ['Fazla ödeme', 'Overpayment'],
  EXEMPT: ['Davetli / muaf', 'Invited / exempt'], REFUNDED: ['Tam iade kaydı', 'Full refund recorded'],
  PARTIALLY_REFUNDED: ['Kısmi iade kaydı', 'Partial refund recorded'], NO_CHARGE: ['Ücret yok', 'No charge'],
};
export const eventLabels: Record<string, string> = { CREDIT: 'Banka ödemesi doğrulandı', REFUND: 'Yapılmış iade kaydedildi', PENDING: 'İncelemeye alındı', EXEMPT: 'Muafiyet tanımlandı', REVOKE_EXEMPT: 'Muafiyet kaldırıldı', VOID: 'Önceki işlem geçersizleştirildi' };
export type PaymentFact = { id: string; kind: string; amountMinor: number; currency: string; targetId: string | null; createdAt: Date | string };
export function amountMinor(raw: string, positive = false) {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(raw)) throw new PaymentError(400, 'Tutar noktalı ondalık olmalı; binlik ayırıcı kullanmayın (ör. 1250.50).');
  const [major, fraction = ''] = raw.split('.');
  const value = Number(major) * 100 + Number(fraction.padEnd(2, '0'));
  if (value > 2_000_000_000 || (positive && value <= 0)) throw new PaymentError(400, 'Tutar pozitif ve en fazla 20.000.000 olmalı.');
  return value;
}
export const currencyAllowed = (currency: string) => ['TRY', 'EUR', 'USD'].includes(currency);
export function expectedMinor(totalAmount: number, currency: string) {
  if (!currencyAllowed(currency) || !Number.isSafeInteger(totalAmount) || totalAmount < 0 || totalAmount * 100 > 2_000_000_000) throw new PaymentError(400, 'Bu kaydın tutarı/para birimi ilk ödeme biçimiyle uyumlu değil.');
  return totalAmount * 100;
}
export function activeFacts(events: PaymentFact[]) {
  const voided = new Set(events.filter(e => e.kind === 'VOID').map(e => e.targetId));
  return events.filter(e => e.kind !== 'VOID' && !voided.has(e.id));
}
export function assertLedger(events: PaymentFact[], currency: string) {
  const active = activeFacts(events), credits = active.filter(e => e.kind === 'CREDIT'), refunds = active.filter(e => e.kind === 'REFUND');
  const received = credits.reduce((sum, e) => sum + e.amountMinor, 0), returned = refunds.reduce((sum, e) => sum + e.amountMinor, 0);
  if ([...credits, ...refunds].some(e => e.currency !== currency || !Number.isInteger(e.amountMinor) || e.amountMinor <= 0) || received > 2_000_000_000 || returned > received) throw new PaymentError(409, 'İşlem tutarı veya para birimi ödeme/iade geçmişiyle çelişiyor.');
  if (received > returned && [...active].reverse().find(e => ['EXEMPT', 'REVOKE_EXEMPT'].includes(e.kind))?.kind === 'EXEMPT') throw new PaymentError(409, 'Bu düzeltme muafiyetle doğrulanmış ödemeyi çelişkili duruma getirir.');
}
export function paymentSummary(registration: { totalAmount: number; currency: string; receiptReceived: boolean; paidAt?: Date | string | null }, events: PaymentFact[]) {
  const active = activeFacts(events), credits = active.filter(e => e.kind === 'CREDIT'), refunds = active.filter(e => e.kind === 'REFUND');
  const receivedMinor = credits.reduce((sum, e) => sum + e.amountMinor, 0), refundedMinor = refunds.reduce((sum, e) => sum + e.amountMinor, 0), netMinor = receivedMinor - refundedMinor;
  const controls = active.filter(e => ['EXEMPT', 'REVOKE_EXEMPT', 'PENDING', 'CREDIT', 'REFUND'].includes(e.kind)), last = controls.at(-1);
  const exemption = [...active].reverse().find(e => ['EXEMPT', 'REVOKE_EXEMPT'].includes(e.kind))?.kind === 'EXEMPT';
  const dueMinor = registration.totalAmount * 100;
  let state: string;
  if (last?.kind === 'PENDING') state = 'PENDING';
  else if (refundedMinor > 0) state = netMinor === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  else if (exemption) state = 'EXEMPT';
  else if (credits.length) state = netMinor < dueMinor ? 'UNDERPAID' : netMinor > dueMinor ? 'OVERPAID' : 'VERIFIED';
  else if (!dueMinor) state = 'NO_CHARGE';
  else state = registration.receiptReceived || registration.paidAt ? 'RECEIPT_RECEIVED_UNVERIFIED' : 'AWAITING_RECEIPT';
  return { state, expectedMinor: dueMinor, receivedMinor, refundedMinor, netMinor, differenceMinor: netMinor - dueMinor, exempt: exemption, verifiedAt: credits.at(-1)?.createdAt ? new Date(credits.at(-1)!.createdAt).toISOString() : null };
}
export type StatementRow = { reference: string; occurredAt: string; amountMinor: number; currency: string; description: string; payerEmail: string; registrationRef: string; rowNumber: number };
export type MatchRegistration = { id: string; email: string; paymentDescription: string; totalAmount: number; currency: string };
const normalized = (s: string) => s.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
export function suggestMatch(row: StatementRow, registrations: MatchRegistration[]) {
  const byId = row.registrationRef ? registrations.filter(r => r.id === row.registrationRef) : [];
  const byEmail = row.payerEmail ? registrations.filter(r => normalized(r.email) === normalized(row.payerEmail)) : [];
  const byDescription = row.description.length >= 8 ? registrations.filter(r => r.paymentDescription.length >= 8 && normalized(r.paymentDescription) === normalized(row.description)) : [];
  const candidates = [...new Map([...byId, ...byEmail, ...byDescription].map(r => [r.id, r])).values()];
  const conflictingId = Boolean(row.registrationRef && !byId.length);
  const conflictingEmail = Boolean(candidates.length === 1 && row.payerEmail && normalized(candidates[0].email) !== normalized(row.payerEmail));
  if (!candidates.length) return { status: 'UNMATCHED', candidates: [], reason: 'Kayıt kimliği, tam e-posta veya tam havale açıklaması eşleşmedi.' };
  if (candidates.length !== 1 || conflictingId || conflictingEmail) return { status: 'AMBIGUOUS', candidates: candidates.map(r => r.id), reason: 'Birden çok kayıt veya çelişen kimlik bilgisi var; elle kontrol edin.' };
  const registration = candidates[0];
  if (registration.currency !== row.currency) return { status: 'CURRENCY_MISMATCH', candidates: [registration.id], reason: 'Para birimleri farklı; bu hareket bu kayda onaylanamaz.' };
  return { status: row.amountMinor === registration.totalAmount * 100 ? 'SUGGESTED' : 'AMOUNT_DIFFERENCE', candidates: [registration.id], reason: 'Kimlik eşleşmesi öneridir; banka kanıtını ve kayıt tutarını inceleyerek onaylayın.' };
}
