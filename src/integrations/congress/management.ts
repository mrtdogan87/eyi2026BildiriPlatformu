import { paymentSummary, paymentLabels } from '@/modules/payments/core';
import { AccessError } from "@/platform/http";
import { enqueueNotification } from '@/platform/notifications';
import { createHash } from 'node:crypto';
import mammoth from "mammoth";
import type { PaymentPeriod, SubmissionStatus } from "@prisma/client";
import {
  formatCurrencyAmount,
  getCongressWithTiers,
  getCurrentPaymentPeriod,
  mapAudience,
  mapPaymentPeriod,
  tierLabel,
} from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { actorSession, requireContext, requirePage } from "@/platform/context";
import { auditSink } from "@/platform/audit";
import type { Action } from "@/platform/policy";
import type { ModuleKey } from "@prisma/client";
import type {
  AdminCongressSettings,
  AdminPaymentTier,
  AdminPricingPayload,
  AdminRegistrationDetail,
  AdminRegistrationListFilters,
  AdminRegistrationListItem,
  AdminSubmissionDetail,
  AdminSubmissionListFilters,
  AdminSubmissionListItem,
} from "@/types/admin";

type ManageableSubmissionStatus = "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
export async function isAdminAuthenticated() { return Boolean(await actorSession()); }
export async function requireAdminPage(action: Action = 'submissions.read', module?: ModuleKey) { return requirePage(action, module); }
export async function assertAdminApiAccess(action: Action = 'submissions.read', module?: ModuleKey) { await requireContext(action, module); return true; }

function mapPresentationMode(mode: "ONLINE" | "IN_PERSON" | null) {
  return mode === "ONLINE" ? "Çevrim İçi" : mode === "IN_PERSON" ? "Yüz Yüze" : "-";
}

export function mapSubmissionStatus(status: SubmissionStatus) {
  switch (status) {
    case "SUBMITTED":
      return "Gönderildi";
    case "UNDER_REVIEW":
      return "İncelemede";
    case "ACCEPTED":
      return "Kabul Edildi";
    case "REJECTED":
      return "Reddedildi";
    default:
      return "Taslak";
  }
}

function asManageableSubmissionStatus(status: SubmissionStatus): ManageableSubmissionStatus {
  if (status === "DRAFT") return "SUBMITTED";
  return status;
}

export function normalizeAdminSubmissionFilters(
  input?: Partial<AdminSubmissionListFilters> | URLSearchParams,
): AdminSubmissionListFilters {
  const getValue = (key: keyof AdminSubmissionListFilters) => {
    if (!input) return "";
    if (input instanceof URLSearchParams) return input.get(key) ?? "";
    return input[key] ?? "";
  };

  const language = getValue("language");
  const status = getValue("status");
  const presentationMode = getValue("presentationMode");
  const registration = getValue("registration");

  return {
    q: String(getValue("q") ?? "").trim(),
    status:
      status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "ACCEPTED" || status === "REJECTED"
        ? status
        : "ALL",
    language: language === "TR" || language === "EN" ? language : "ALL",
    presentationMode:
      presentationMode === "ONLINE" || presentationMode === "IN_PERSON" ? presentationMode : "ALL",
    registration:
      registration === "PAID" || registration === "PENDING" ? registration : "ALL",
  };
}

export async function getAdminSubmissionList(
  rawFilters?: Partial<AdminSubmissionListFilters> | URLSearchParams,
): Promise<AdminSubmissionListItem[]> {
  const context = await requireContext("submissions.read", "SUBMISSIONS");
  const filters = normalizeAdminSubmissionFilters(rawFilters);
  const submissions = await prisma.submission.findMany({
    where: {
      status: { not: "DRAFT" },
      congressId: context.congress.id,
      ...(filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.language !== "ALL" ? { submissionLanguage: filters.language } : {}),
      ...(filters.presentationMode !== "ALL" ? { presentationMode: filters.presentationMode } : {}),
      ...(filters.registration === "PAID"
        ? { paperItem: { registration: { paidAt: { not: null } } } }
        : filters.registration === "PENDING"
          ? {
              OR: [
                { paperItem: null },
                { paperItem: { registration: { paidAt: null } } },
              ],
            }
          : {}),
      ...(filters.q
        ? {
            OR: [
              { titleTr: { contains: filters.q, mode: "insensitive" } },
              { titleEn: { contains: filters.q, mode: "insensitive" } },
              { authors: { some: { fullName: { contains: filters.q, mode: "insensitive" } } } },
              { authors: { some: { email: { contains: filters.q.toLowerCase() } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      submissionLanguage: true,
      titleTr: true,
      titleEn: true,
      presentationMode: true,
      audience: true,
      submittedAt: true,
      authors: {
        orderBy: { sortOrder: "asc" },
        select: { fullName: true, email: true, isPresenter: true },
      },
      paperItem: {
        select: {
          paperOrder: true,
          registration: { select: { paidAt: true } },
        },
      },
    },
  });

  return submissions.map((submission) => {
    const presenter =
      submission.authors.find((author) => author.isPresenter) ?? submission.authors[0] ?? null;
    const language = submission.submissionLanguage ?? "TR";
    const paid = Boolean(submission.paperItem?.registration?.paidAt);

    return {
      id: submission.id,
      title: language === "EN" ? submission.titleEn || "-" : submission.titleTr || "-",
      status: asManageableSubmissionStatus(submission.status),
      statusLabel: mapSubmissionStatus(submission.status),
      submissionLanguage: language,
      presenterName: presenter?.fullName ?? "-",
      presenterEmail: presenter?.email ?? "-",
      presentationMode: mapPresentationMode(submission.presentationMode),
      audienceLabel: mapAudience(submission.audience),
      registrationStatusLabel: paid
        ? `Kayıt / dekont var (${submission.paperItem?.paperOrder === 2 ? "İkinci" : "Birinci"})`
        : "Bekleniyor",
      submittedAt: submission.submittedAt?.toISOString() ?? null,
    };
  });
}

function escapeCsv(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function buildAdminSubmissionCsv(items: AdminSubmissionListItem[]) {
  const header = [
    "Baslik",
    "Sunan Yazar",
    "E-posta",
    "Durum",
    "Dil",
    "Sunum",
    "Akademik Statu",
    "Kayit",
    "Gonderim Tarihi",
  ];

  const rows = items.map((item) => [
    item.title,
    item.presenterName,
    item.presenterEmail,
    item.statusLabel,
    item.submissionLanguage,
    item.presentationMode,
    item.audienceLabel,
    item.registrationStatusLabel,
    item.submittedAt ?? "",
  ]);

  return [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
}

export async function getAdminSubmissionDetail(
  submissionId: string,
): Promise<AdminSubmissionDetail | null> {
  const context = await requireContext("submissions.read", "SUBMISSIONS");
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      congressId: context.congress.id,
      status: { not: "DRAFT" },
    },
    select: {
      id: true,
      draftOwnerEmail: true,
      status: true,
      submissionLanguage: true,
      titleTr: true,
      titleEn: true,
      abstractTr: true,
      abstractEn: true,
      keywordsTr: true,
      keywordsEn: true,
      presentationMode: true,
      audience: true,
      submittedAt: true,
      authors: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          fullName: true,
          title: true,
          email: true,
          institution: true,
          country: true,
          isPresenter: true,
        },
      },
      file: {
        select: {
          originalName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
          content: true,
        },
      },
      paperItem: {
        include: { registration: true },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        select: { id: true, fromStatus: true, toStatus: true, note: true, changedAt: true },
      },
    },
  });

  if (!submission) return null;

  let previewText: string | null = null;
  if (submission.file?.content) {
    try {
      const extracted = await mammoth.extractRawText({
        buffer: Buffer.from(submission.file.content),
      });
      const normalized = extracted.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
      previewText = normalized || null;
    } catch {
      previewText = null;
    }
  }

  const paperItem = submission.paperItem;
  const registration = paperItem
    ? {
        id: paperItem.registration.id,
        paidAt: paperItem.registration.paidAt?.toISOString() ?? null,
        amount: paperItem.amount,
        currency: paperItem.currency,
        amountLabel: formatCurrencyAmount(paperItem.amount, paperItem.currency),
        description: paperItem.registration.paymentDescription,
        paperOrder: (paperItem.paperOrder === 1 || paperItem.paperOrder === 2
          ? paperItem.paperOrder
          : null) as 1 | 2 | null,
      }
    : null;

  return {
    id: submission.id,
    draftOwnerEmail: submission.draftOwnerEmail,
    status: asManageableSubmissionStatus(submission.status),
    statusLabel: mapSubmissionStatus(submission.status),
    submissionLanguage: (submission.submissionLanguage ?? "TR") as "TR" | "EN",
    titleTr: submission.titleTr ?? "",
    titleEn: submission.titleEn ?? "",
    abstractTr: submission.abstractTr ?? "",
    abstractEn: submission.abstractEn ?? "",
    keywordsTr: submission.keywordsTr ?? "",
    keywordsEn: submission.keywordsEn ?? "",
    presentationMode: mapPresentationMode(submission.presentationMode),
    audienceLabel: mapAudience(submission.audience),
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    registration,
    authors: submission.authors.map((author) => ({
      id: author.id,
      fullName: author.fullName,
      title: author.title ?? "",
      email: author.email,
      institution: author.institution ?? "",
      country: author.country ?? "",
      isPresenter: author.isPresenter,
    })),
    file: submission.file
      ? {
          originalName: submission.file.originalName,
          fileSize: submission.file.fileSize,
          mimeType: submission.file.mimeType,
          uploadedAt: submission.file.uploadedAt.toISOString(),
          previewText,
        }
      : null,
    statusHistory: submission.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus ? mapSubmissionStatus(entry.fromStatus) : null,
      toStatus: mapSubmissionStatus(entry.toStatus),
      note: entry.note ?? "",
      changedAt: entry.changedAt.toISOString(),
    })),
  };
}

export async function getAdminDownloadPayload(submissionId: string) {
  const context = await requireContext("submissions.read", "SUBMISSIONS");
  return prisma.submissionFile.findFirst({
    where: {
      submissionId,
      submission: {
        status: { not: "DRAFT" },
        congressId: context.congress.id,
      },
    },
    select: { originalName: true, mimeType: true, content: true },
  });
}

export async function getAdminRegistrationReceiptPayload(registrationId: string) {
  const context = await requireContext("registrations.read", "REGISTRATION");
  return prisma.registrationReceipt.findFirst({
    where: {
      registrationId,
      registration: { congressId: context.congress.id },
    },
    select: { originalName: true, mimeType: true, content: true },
  });
}

export async function getAdminRegistrationStudentDocumentPayload(registrationId: string) {
  const context = await requireContext("registrations.read", "REGISTRATION");
  return prisma.registrationStudentDocument.findFirst({
    where: {
      registrationId,
      registration: { congressId: context.congress.id },
    },
    select: { originalName: true, mimeType: true, content: true },
  });
}

const MANAGEABLE_STATUSES: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"];

export function isManageableSubmissionStatus(value: string): value is SubmissionStatus {
  return MANAGEABLE_STATUSES.includes(value as SubmissionStatus);
}

export async function updateAdminSubmissionStatus(input: {
  submissionId: string;
  status: SubmissionStatus;
  note?: string;
}) {
  const context = await requireContext("submissions.status", "SUBMISSIONS");
  const current = await prisma.submission.findFirst({
    where: {
      id: input.submissionId,
      congressId: context.congress.id,
      status: { not: "DRAFT" },
    },
    select: { id: true, status: true },
  });

  if (!current) return null;

  const note = input.note?.trim() ?? "";
  if (current.status === input.status) {
    return {
      submission: await getAdminSubmissionDetail(current.id),
      congress: { name: context.congress.name, slug: context.congress.slug },
      changed: false,
      previousStatus: current.status,
    };
  }

  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${context.congress.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Submission" WHERE id = ${current.id} FOR UPDATE`;
    if (await tx.reviewRound.count({ where: { submissionId: current.id } })) throw new AccessError(409, 'Hakemlik geçmişi olan bildirinin kararı Hakemlik ekranından verilir.');
    const changed = await tx.submission.updateMany({ where: { id: current.id, congressId: context.congress.id, status: current.status }, data: { status: input.status } });
    if (changed.count !== 1) throw new AccessError(409, 'Bildiri durumu başka bir işlemde değişti. Sayfayı yenileyin.');
    const history = await tx.submissionStatusHistory.create({ data: { submissionId: current.id, fromStatus: current.status, toStatus: input.status, note: note || null } });
    await auditSink(tx)(context, 'submission.status', current.id, { before: current.status, after: input.status, note });
    if (input.status === 'ACCEPTED' || input.status === 'REJECTED') {
      const paper = await tx.submission.findUniqueOrThrow({ where: { id: current.id }, include: { authors: true } });
      const locale = paper.submissionLanguage === 'EN' ? 'en' : 'tr';
      const paperTitle = locale === 'en' ? paper.titleEn || paper.titleTr || 'Paper' : paper.titleTr || paper.titleEn || 'Bildiri';
      const recipients = [...new Set([paper.draftOwnerEmail, ...paper.authors.map(author => author.email)].map(email => email.trim().toLowerCase()).filter(Boolean))];
      const registration = await tx.congressModule.findUnique({ where: { congressId_key: { congressId: context.congress.id, key: 'REGISTRATION' } } });
      const registrationUrl = input.status === 'ACCEPTED' && registration?.enabled ? `${process.env.APP_BASE_URL}/${context.congress.slug}/kayit` : '';
      for (const recipient of recipients) await enqueueNotification(tx, {
        congressId: context.congress.id, key: 'SUBMISSION_STATUS', locale, to: recipient,
        dedupeKey: `submission-status:${history.id}:${createHash('sha256').update(recipient).digest('hex')}`,
        module: 'SUBMISSIONS', sourceType: 'submission-status-history', sourceId: history.id,
        values: { congressName: context.congress.name, paperTitle, statusLabel: locale === 'en' ? (input.status === 'ACCEPTED' ? 'Accepted' : 'Rejected') : mapSubmissionStatus(input.status), registrationUrl },
      });
    }
  });

  return {
    submission: await getAdminSubmissionDetail(current.id),
    congress: { name: context.congress.name, slug: context.congress.slug },
    changed: true,
    previousStatus: current.status,
  };
}

export async function getAdminPricingPayload(): Promise<AdminPricingPayload | null> {
  const context = await requireContext("settings", "REGISTRATION");
  const congress = await getCongressWithTiers(context.congress.slug);
  if (!congress) return null;

  const tiers: AdminPaymentTier[] = congress.paymentTiers
    .map((tier) => ({
      id: tier.id,
      presentationMode: tier.presentationMode,
      role: tier.role,
      audience: tier.audience,
      paperOrder:
        tier.paperOrder === 1 || tier.paperOrder === 2 ? (tier.paperOrder as 1 | 2) : null,
      period: tier.period,
      amount: tier.amount,
      currency: tier.currency,
      active: tier.active,
      sortOrder: tier.sortOrder,
      label: tierLabel(tier),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const settings: AdminCongressSettings = {
    slug: congress.slug,
    name: congress.name,
    earlyDeadline: congress.earlyDeadline?.toISOString() ?? null,
    lateDeadline: congress.lateDeadline?.toISOString() ?? null,
    galaFeeAmount: congress.galaFeeAmount,
    galaFeeCurrency: congress.galaFeeCurrency,
    galaFeeNote: congress.galaFeeNote ?? "",
    bankName: congress.bankName ?? "",
    bankAccountHolder: congress.bankAccountHolder ?? "",
    bankIban: congress.bankIban ?? "",
    bankBranch: congress.bankBranch ?? "",
    tripNote: congress.tripNote ?? "",
    submissionsClosed: congress.submissionsClosed,
  };

  return {
    congress: settings,
    tiers,
    currentPeriod: getCurrentPaymentPeriod(congress),
  };
}

export async function updateAdminTier(input: {
  id: string;
  amount?: number;
  currency?: string;
  active?: boolean;
}) {
  const context = await requireContext("settings", "REGISTRATION");
  const tier = await prisma.paymentTier.findUnique({
    where: { id: input.id },
    include: { congress: { select: { slug: true } } },
  });
  if (!tier || tier.congressId !== context.congress.id) return null;

  return prisma.$transaction(async tx => {
  const result = await tx.paymentTier.update({
    where: { id: input.id },
    data: {
      amount: input.amount ?? tier.amount,
      currency: input.currency ?? tier.currency,
      active: input.active ?? tier.active,
    },
  });
  await auditSink(tx)(context, 'pricing.tier.update', tier.id, { before: { amount: tier.amount, currency: tier.currency, active: tier.active }, after: { amount: result.amount, currency: result.currency, active: result.active } });
  return result;
  });
}

function parseDeadline(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function updateAdminCongressSettings(input: {
  earlyDeadline?: string | null;
  lateDeadline?: string | null;
  galaFeeAmount?: number;
  galaFeeCurrency?: string;
  galaFeeNote?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankIban?: string;
  bankBranch?: string;
  tripNote?: string;
  submissionsClosed?: boolean;
}) {
  const context = await requireContext("settings", "REGISTRATION");
  const data: Record<string, unknown> = {};
  const earlyDeadline = parseDeadline(input.earlyDeadline);
  const lateDeadline = parseDeadline(input.lateDeadline);
  if (earlyDeadline !== undefined) data.earlyDeadline = earlyDeadline;
  if (lateDeadline !== undefined) data.lateDeadline = lateDeadline;
  if (typeof input.galaFeeAmount === "number" && Number.isFinite(input.galaFeeAmount)) {
    data.galaFeeAmount = Math.max(0, Math.round(input.galaFeeAmount));
  }
  if (typeof input.galaFeeCurrency === "string" && input.galaFeeCurrency.trim()) {
    data.galaFeeCurrency = input.galaFeeCurrency.trim().toUpperCase();
  }
  if (typeof input.galaFeeNote === "string") data.galaFeeNote = input.galaFeeNote.trim() || null;
  if (typeof input.bankName === "string") data.bankName = input.bankName.trim() || null;
  if (typeof input.bankAccountHolder === "string") data.bankAccountHolder = input.bankAccountHolder.trim() || null;
  if (typeof input.bankIban === "string") data.bankIban = input.bankIban.trim() || null;
  if (typeof input.bankBranch === "string") data.bankBranch = input.bankBranch.trim() || null;
  if (typeof input.tripNote === "string") data.tripNote = input.tripNote.trim() || null;
  if (typeof input.submissionsClosed === "boolean") {
    data.submissionsClosed = input.submissionsClosed;
  }

  return prisma.$transaction(async tx => {
  const before = await tx.congress.findUniqueOrThrow({ where: { id: context.congress.id } });
  const result = await tx.congress.update({
    where: { id: context.congress.id },
    data: { ...data, configVersion: { increment: 1 } },
  });
  const keys = Object.keys(data);
  await auditSink(tx)(context, 'congress.settings.update', result.id, JSON.parse(JSON.stringify({ before: Object.fromEntries(keys.map(key => [key, before[key as keyof typeof before]])), after: data })));
  return result;
  });
}

function mapRegistrationKind(kind: "PAPERS" | "LISTENER") {
  return kind === "PAPERS" ? "Bildiri Ödemesi" : "Dinleyici";
}

function mapPeriodLabel(period: PaymentPeriod): string {
  return mapPaymentPeriod(period);
}

export function normalizeAdminRegistrationFilters(
  input?: Partial<AdminRegistrationListFilters> | URLSearchParams,
): AdminRegistrationListFilters {
  const getValue = (key: keyof AdminRegistrationListFilters) => {
    if (!input) return "";
    if (input instanceof URLSearchParams) return input.get(key) ?? "";
    return input[key] ?? "";
  };

  const kind = getValue("kind");
  const status = getValue("status");
  const period = getValue("period");

  return {
    q: String(getValue("q") ?? "").trim(),
    kind: kind === "PAPERS" || kind === "LISTENER" ? kind : "ALL",
    status: status === "PAID" || status === "PENDING" ? status : "ALL",
    period: period === "EARLY" || period === "LATE" ? period : "ALL",
  };
}

export async function getAdminRegistrationList(
  rawFilters?: Partial<AdminRegistrationListFilters> | URLSearchParams,
): Promise<AdminRegistrationListItem[]> {
  const context = await requireContext("registrations.read", "REGISTRATION");
  const filters = normalizeAdminRegistrationFilters(rawFilters);
  const registrations = await prisma.registration.findMany({
    where: {
      congressId: context.congress.id,
      ...(filters.kind !== "ALL" ? { kind: filters.kind } : {}),
      ...(filters.status === "PAID" ? { paidAt: { not: null } } : {}),
      ...(filters.status === "PENDING" ? { paidAt: null } : {}),
      ...(filters.period !== "ALL" ? { paymentPeriod: filters.period } : {}),
      ...(filters.q
        ? {
            OR: [
              { email: { contains: filters.q.toLowerCase() } },
              { paymentDescription: { contains: filters.q, mode: "insensitive" } },
              {
                paperItems: {
                  some: {
                    submission: {
                      OR: [
                        { titleTr: { contains: filters.q, mode: "insensitive" } },
                        { titleEn: { contains: filters.q, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      kind: true,
      totalAmount: true,
      currency: true,
      paymentPeriod: true,
      paidAt: true,
      createdAt: true,
      paperItems: { select: { id: true } },
      receipt: { select: { id: true } },
      paymentEvents: { orderBy: { number: "asc" }, select: { id: true, kind: true, amountMinor: true, currency: true, targetId: true, createdAt: true } },
    },
  });

  return registrations.map((registration) => ({
    id: registration.id,
    email: registration.email,
    kindLabel: mapRegistrationKind(registration.kind),
    paperCount: registration.paperItems.length,
    totalAmountLabel: formatCurrencyAmount(registration.totalAmount, registration.currency),
    paymentPeriodLabel: mapPeriodLabel(registration.paymentPeriod),
    paymentStateLabel: paymentLabels[paymentSummary({ ...registration, receiptReceived: !!registration.receipt }, registration.paymentEvents).state]?.[0] ?? "Kontrol gerekli",
    paidAt: registration.paidAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
  }));
}

export async function getAdminRegistrationDetail(
  registrationId: string,
): Promise<AdminRegistrationDetail | null> {
  const context = await requireContext("registrations.read", "REGISTRATION");
  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, congressId: context.congress.id },
    include: {
      paperItems: {
        include: {
          submission: {
            select: { id: true, titleTr: true, titleEn: true, submissionLanguage: true },
          },
        },
      },
      receipt: true,
      studentDocument: true,
    },
  });

  if (!registration) return null;

  const totalAmountLabel = formatCurrencyAmount(
    registration.totalAmount,
    registration.currency,
  );

  const galaAmountLabel =
    registration.galaAttendance && registration.galaFeeAmount != null && registration.galaFeeCurrency
      ? `${registration.galaAttendeeCount} kişi · ${formatCurrencyAmount(
          registration.galaFeeAmount * registration.galaAttendeeCount,
          registration.galaFeeCurrency,
        )}`
      : registration.galaAttendance
        ? `${registration.galaAttendeeCount} kişi`
        : "Hayır";

  const listenerDaysLabel =
    registration.kind === "LISTENER" || registration.listenerDayOne || registration.listenerDayTwo
      ? registration.listenerDayOne && registration.listenerDayTwo
        ? "1. Gün + 2. Gün"
        : registration.listenerDayOne
          ? "1. Gün"
          : registration.listenerDayTwo
            ? "2. Gün"
            : "-"
      : "-";

  return {
    id: registration.id,
    email: registration.email,
    kind: registration.kind,
    kindLabel: mapRegistrationKind(registration.kind),
    audienceLabel: mapAudience(registration.audience),
    listenerPresentationModeLabel: mapPresentationMode(registration.listenerPresentationMode),
    listenerDaysLabel,
    paymentDescription: registration.paymentDescription,
    paymentPeriod: registration.paymentPeriod,
    paymentPeriodLabel: mapPeriodLabel(registration.paymentPeriod),
    totalAmount: registration.totalAmount,
    currency: registration.currency,
    totalAmountLabel,
    galaAttendance: registration.galaAttendance,
    galaAttendeeCount: registration.galaAttendeeCount,
    galaAmountLabel,
    tripAttendance: registration.tripAttendance,
    tripAttendeeCount: registration.tripAttendeeCount,
    paidAt: registration.paidAt?.toISOString() ?? null,
    createdAt: registration.createdAt.toISOString(),
    receipt: registration.receipt
      ? {
          originalName: registration.receipt.originalName,
          fileSize: registration.receipt.fileSize,
          mimeType: registration.receipt.mimeType,
          uploadedAt: registration.receipt.uploadedAt.toISOString(),
        }
      : null,
    studentDocument: registration.studentDocument
      ? {
          originalName: registration.studentDocument.originalName,
          fileSize: registration.studentDocument.fileSize,
          mimeType: registration.studentDocument.mimeType,
          uploadedAt: registration.studentDocument.uploadedAt.toISOString(),
        }
      : null,
    paperItems: registration.paperItems.map((item) => {
      const language = item.submission.submissionLanguage ?? "TR";
      const title =
        language === "EN"
          ? item.submission.titleEn || item.submission.titleTr || "-"
          : item.submission.titleTr || item.submission.titleEn || "-";
      return {
        submissionId: item.submissionId,
        title,
        paperOrder: (item.paperOrder === 2 ? 2 : 1) as 1 | 2,
        amount: item.amount,
        currency: item.currency,
        amountLabel: formatCurrencyAmount(item.amount, item.currency),
      };
    }),
  };
}

export async function deleteAdminRegistration(registrationId: string) {
  const context = await requireContext("registrations.delete", "REGISTRATION");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${context.congress.id} FOR UPDATE`;
    const registration = await tx.registration.findFirst({
      where: { id: registrationId, congressId: context.congress.id },
      select: { id: true },
  });
  if (!registration) return false;
  if (await tx.certificateRecipient.count({where:{congressId:context.congress.id,OR:[{sourceId:registrationId},{source:'CONGRESS',sourceVersion:{path:['proof','registration','id'],equals:registrationId}}]}})) throw new AccessError(409,"Belge kaynağına bağlı kayıt silinemez; belge geçmişi korunmalı.");
  if (await tx.activityBooking.count({ where: { registrationId } })) throw new AccessError(409, "Etkinlik katılım geçmişine bağlı kayıt silinemez; bağlantı ve geçmiş korunmalı.");
  if (await tx.paymentEvent.count({ where: { registrationId } })) throw new AccessError(409, "Ödeme geçmişi bulunan kayıt silinemez. Gerekçeli ödeme düzeltmesi veya iptal talebi kullanın.");
  await tx.registration.delete({ where: { id: registration.id } });
  await auditSink(tx)(context, "registration.delete", registration.id);
  return true;
  });
}
