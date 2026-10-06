import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext, type CongressContext } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { paymentSummary, activeFacts, assertLedger, amountMinor, expectedMinor, suggestMatch } from '@/modules/payments/core';
import { parseStatement } from '@/modules/payments/csv';
import { paymentInputSchema, statementInputSchema } from '@/modules/payments/configuration';
import { parsePayment, paymentAction, type PaymentBinary } from '@/modules/payments/http';
const factSelect = { id: true, number: true, kind: true, amountMinor: true, currency: true, occurredAt: true, reference: true, bankTransactionId: true, targetId: true, reason: true, actorName: true, createdAt: true, evidenceName: true, evidenceHash: true, registrationSnapshot: true } satisfies Prisma.PaymentEventSelect;
const registrationSelect = { id: true, congressId: true, email: true, totalAmount: true, currency: true, paymentDescription: true, paidAt: true, paymentVersion: true, receipt: { select: { id: true, uploadedAt: true, originalName: true } }, paymentEvents: { orderBy: { number: 'asc' as const }, select: factSelect } } satisfies Prisma.RegistrationSelect;
type RegistrationRow = Prisma.RegistrationGetPayload<{ select: typeof registrationSelect }>;
function summary(r: RegistrationRow) { return paymentSummary({ ...r, receiptReceived: !!r.receipt }, r.paymentEvents); }
function safeRegistration(r: RegistrationRow) {
  return { id: r.id, email: r.email, currency: r.currency, totalAmount: r.totalAmount, paymentDescription: r.paymentDescription, version: r.paymentVersion, receiptReceived: !!r.receipt, paidAt: r.paidAt?.toISOString() ?? null, summary: summary(r),
    events: r.paymentEvents.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), occurredAt: e.occurredAt?.toISOString() ?? null })) };
}
async function lockCongress(tx: Prisma.TransactionClient, c: CongressContext) {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${c.congress.id} FOR UPDATE`;
  if (!(await tx.congressModule.findUnique({ where: { congressId_key: { congressId: c.congress.id, key: 'REGISTRATION' } } }))?.enabled) throw new AccessError(403, 'Kayıt ve ödeme modülü kapalı.');
}
export async function paymentOverview(id: string) {
  const c = await requireContext('payments.read', 'REGISTRATION');
  const r = await prisma.registration.findFirst({ where: { id, congressId: c.congress.id }, select: registrationSelect });
  if (!r) throw new AccessError(404, 'Kayıt bulunamadı.');
  return safeRegistration(r);
}
export type PaymentOverview = Awaited<ReturnType<typeof paymentOverview>>;
export async function recordPayment(id: string, raw: unknown, evidence: PaymentBinary | null) {
  const c = await requireContext('payments.manage', 'REGISTRATION'), input = parsePayment(paymentInputSchema, raw);
  return paymentAction(() => prisma.$transaction(async tx => {
    await lockCongress(tx, c);
    const r = await tx.registration.findFirst({ where: { id, congressId: c.congress.id }, select: registrationSelect });
    if (!r) throw new AccessError(404, 'Kayıt bulunamadı.');
    if (r.paymentVersion !== input.version) throw new AccessError(409, 'Ödeme kaydı değişti. Paneli yenileyip yeniden inceleyin.');
    expectedMinor(r.totalAmount, r.currency);
    const before = summary(r), active = activeFacts(r.paymentEvents);
    let minor = 0, occurredAt: Date | null = null, reference: string | null = null, bankTransactionId: string | null = null, targetId: string | null = null;
    if (input.kind === 'CREDIT' || input.kind === 'REFUND') {
      if (input.targetId) throw new AccessError(400, 'Bu işlemde önceki kayıt seçilmez.');
      if (input.kind === 'CREDIT' && before.exempt) throw new AccessError(409, 'Önce muafiyeti gerekçeyle kaldırın.');
      if (input.bankTransactionId) {
        if (input.kind !== 'CREDIT' || evidence || input.amount || input.currency || input.occurredAt || input.reference) throw new AccessError(400, 'Ekstre onayında tutar, tarih ve kanıt banka hareketinden alınır.');
        const bank = await tx.bankTransaction.findFirst({ where: { id: input.bankTransactionId, congressId: c.congress.id } });
        if (!bank) throw new AccessError(404, 'Banka hareketi bulunamadı.');
        if (bank.currency !== r.currency) throw new AccessError(400, 'Banka hareketi ve kayıt para birimleri farklı.');
        if (await tx.paymentEvent.count({ where: { bankTransactionId: bank.id, kind: 'CREDIT', voidedBy: null } })) throw new AccessError(409, 'Banka hareketi zaten bir kayda onaylanmış.');
        minor = bank.amountMinor; occurredAt = bank.occurredAt; reference = `${bank.accountKey}:${bank.reference}`; bankTransactionId = bank.id;
      } else {
        if (!evidence || !input.reference || !input.amount || !input.occurredAt || input.currency !== r.currency) throw new AccessError(400, 'Elle doğrulama/iade için banka kanıtı, işlem referansı, tutar, tarih ve aynı para birimi gerekli.');
        minor = amountMinor(input.amount, true); occurredAt = new Date(input.occurredAt); reference = input.reference;
        if (!Number.isFinite(occurredAt.getTime()) || occurredAt > new Date() || occurredAt < new Date('2000-01-01')) throw new AccessError(400, 'Gerçekleşmiş banka işleminin geçerli tarihini seçin.');
        if (await tx.paymentEvent.count({ where: { congressId: c.congress.id, kind: input.kind, bankTransactionId: null, reference: { equals: reference, mode: 'insensitive' }, voidedBy: null } })) throw new AccessError(409, 'Bu banka referansı aynı işlem türünde zaten kullanılmış.');
      }
      if (input.kind === 'REFUND' && minor > before.netMinor) throw new AccessError(400, 'İade doğrulanmış kalan ödeme tutarını aşamaz.');
      if (input.kind === 'CREDIT' && minor + before.receivedMinor > 2_000_000_000) throw new AccessError(400, 'Toplam ödeme sınırı aşılıyor.');
    } else {
      if (input.bankTransactionId || input.amount || input.currency || input.occurredAt || input.reference) throw new AccessError(400, 'Bu işlem banka hareketi oluşturmaz.');
      if (input.kind === 'VOID') {
        const target = active.find(e => e.id === input.targetId);
        if (!target) throw new AccessError(409, 'Geçerli, henüz geçersizleştirilmemiş bir önceki işlem seçin.');
        if (target.kind === 'CREDIT' && before.netMinor < target.amountMinor) throw new AccessError(409, 'Bu ödemeye bağlı iade var. Önce hatalı iade kaydını gerekçeyle düzeltin.');
        targetId = target.id;
      } else if (input.targetId) throw new AccessError(400, 'Bu işlemde önceki kayıt seçilmez.');
      if (input.kind === 'EXEMPT' && (before.exempt || before.netMinor > 0)) throw new AccessError(409, 'Muafiyet zaten var veya doğrulanmış ödeme mevcut.');
      if (input.kind === 'REVOKE_EXEMPT' && !before.exempt) throw new AccessError(409, 'Aktif muafiyet yok.');
    }
    assertLedger([...r.paymentEvents, { id: 'new', kind: input.kind, amountMinor: minor, currency: r.currency, targetId, createdAt: new Date() }], r.currency);
    const event = await tx.paymentEvent.create({ data: { congressId: c.congress.id, registrationId: id, number: r.paymentVersion + 1, kind: input.kind, amountMinor: minor, currency: r.currency, occurredAt, reference, bankTransactionId, targetId, reason: input.reason, actorId: c.actor.id, actorName: c.actor.name,
      registrationSnapshot: { email: r.email, totalAmount: r.totalAmount, currency: r.currency, paymentDescription: r.paymentDescription, receiptId: r.receipt?.id ?? null, receiptDate: r.receipt?.uploadedAt.toISOString() ?? null, legacyPaidAt: r.paidAt?.toISOString() ?? null },
      ...(evidence ? { evidenceName: evidence.name, evidenceMime: evidence.mime, evidenceHash: evidence.hash, evidence: evidence.content } : {}) } });
    await tx.registration.update({ where: { id }, data: { paymentVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'payment.record', id, { eventId: event.id, kind: input.kind, number: event.number, amountMinor: minor, currency: r.currency, bankTransactionId, targetId, reason: input.reason }) });
    return { eventId: event.id, version: r.paymentVersion + 1 };
  }));
}
export async function importStatement(raw: unknown, file: PaymentBinary | null) {
  const c = await requireContext('payments.manage', 'REGISTRATION'), input = parsePayment(statementInputSchema, raw);
  if (!file) throw new AccessError(400, 'CSV ekstre gerekli.');
  return paymentAction(async () => {
    const rows = parseStatement(file.content);
    return prisma.$transaction(async tx => {
      await lockCongress(tx, c);
      const previous = await tx.bankStatement.findUnique({ where: { congressId_accountKey_sha256: { congressId: c.congress.id, accountKey: input.accountKey, sha256: file.hash } }, select: { id: true } });
      if (previous) return { id: previous.id, duplicate: true, added: 0, skipped: rows.length };
      const existing = await tx.bankTransaction.findMany({ where: { congressId: c.congress.id, accountKey: input.accountKey, reference: { in: rows.map(r => r.reference) } } });
      for (const row of rows) {
        const old = existing.find(e => e.reference === row.reference);
        if (old && ['amountMinor', 'currency', 'description', 'payerEmail', 'registrationRef'].some(key => old[key as keyof typeof old] !== row[key as keyof typeof row]) || old && old.occurredAt.toISOString() !== row.occurredAt) throw new AccessError(409, `Satır ${row.rowNumber}: aynı banka referansı farklı içerikle daha önce yüklenmiş. Hiçbir satır içe aktarılmadı.`);
      }
      const fresh = rows.filter(row => !existing.some(e => e.reference === row.reference));
      const statement = await tx.bankStatement.create({ data: { congressId: c.congress.id, accountKey: input.accountKey, note: input.note, originalName: file.name, sha256: file.hash, content: file.content, rowCount: rows.length, actorId: c.actor.id, actorName: c.actor.name } });
      if (fresh.length) await tx.bankTransaction.createMany({ data: fresh.map(row => ({ ...row, occurredAt: new Date(row.occurredAt), congressId: c.congress.id, accountKey: input.accountKey, statementId: statement.id })) });
      await tx.auditLog.create({ data: auditData(c, 'payment.statement.import', statement.id, { accountKey: input.accountKey, rows: rows.length, added: fresh.length, skipped: existing.length, sha256: file.hash }) });
      return { id: statement.id, duplicate: false, added: fresh.length, skipped: existing.length };
    }, { timeout: 15000 });
  });
}
export async function bankOverview({ statementId, offset = 0 }: { statementId?: string; offset?: number } = {}) {
  const c = await requireContext('payments.read', 'REGISTRATION');
  if (statementId && !(await prisma.bankStatement.count({ where: { id: statementId, congressId: c.congress.id } }))) throw new AccessError(404, 'Ekstre bulunamadı.');
  const where = { congressId: c.congress.id, ...(statementId ? { statementId } : {}) };
  const [registrations, rows, count, statements] = await Promise.all([
    prisma.registration.findMany({ where: { congressId: c.congress.id }, select: { id: true, email: true, paymentDescription: true, currency: true, totalAmount: true, paymentVersion: true }, orderBy: { id: 'asc' }, take: 5001 }),
    prisma.bankTransaction.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: offset, take: 100, include: { paymentEvents: { where: { kind: 'CREDIT', voidedBy: null }, select: { registrationId: true } } } }),
    prisma.bankTransaction.count({ where }),
    prisma.bankStatement.findMany({ where: { congressId: c.congress.id }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, accountKey: true, originalName: true, note: true, actorName: true, createdAt: true, rowCount: true } }),
  ]);
  if (registrations.length > 5000) throw new AccessError(400, 'İlk sürümde bir kongrede en fazla 5000 kayıt eşleştirilebilir.');
  return { congress: { id: c.congress.id, name: c.congress.name }, registrations: registrations.map(r => ({ ...r, version: r.paymentVersion })), rows: rows.map(row => ({ id: row.id, reference: row.reference, accountKey: row.accountKey, statementId: row.statementId, occurredAt: row.occurredAt.toISOString(), amountMinor: row.amountMinor, currency: row.currency, description: row.description, payerEmail: row.payerEmail, registrationRef: row.registrationRef,
    assignment: row.paymentEvents[0]?.registrationId ?? null, suggestion: suggestMatch({ ...row, occurredAt: row.occurredAt.toISOString() }, registrations) })),
    statements: statements.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })), count, offset, pageSize: 100 };
}
export type BankOverview = Awaited<ReturnType<typeof bankOverview>>;
export async function paymentDownload(type: string, id: string, registrationId?: string) {
  const c = await requireContext('payments.read', 'REGISTRATION');
  if (type === 'statement') {
    const file = await prisma.bankStatement.findFirst({ where: { id, congressId: c.congress.id }, select: { content: true, originalName: true } });
    if (file) return { content: file.content, mime: 'text/csv; charset=utf-8', name: file.originalName };
  } else if (type === 'evidence' && registrationId) {
    const event = await prisma.paymentEvent.findFirst({ where: { id, registrationId, congressId: c.congress.id }, select: { evidence: true, evidenceName: true, evidenceMime: true } });
    if (event?.evidence && event.evidenceName && event.evidenceMime) return { content: event.evidence, mime: event.evidenceMime, name: event.evidenceName };
  }
  throw new AccessError(404, 'Kanıt bulunamadı.');
}
