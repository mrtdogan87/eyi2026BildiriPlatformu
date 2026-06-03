import type {
  AttendeeRole,
  AudienceType,
  Congress,
  PaymentTier,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CongressBankInfo,
  CongressGalaInfo,
  CongressTripInfo,
  PaymentPeriod,
  PaymentTierOption,
  PresentationMode,
} from "@/types/submission";

export type CongressWithTiers = Congress & { paymentTiers: PaymentTier[] };
type PaymentLabelLocale = "tr" | "en";

const PAYMENT_CLOSED_MESSAGE =
  "Kayıt süresi sona erdiği için yeni ödeme alınmıyor.";

const paymentLabels = {
  tr: {
    academic: "Öğretim Üyesi/Diğer Katılımcı",
    student: "Öğrenci",
    firstPaper: "Birinci Bildiri",
    secondPaperFree: "İkinci Bildiri (Ücretsiz)",
    early: "Erken Kayıt",
    late: "Geç Kayıt",
    inPersonListener: "Yüz Yüze Dinleyici",
    onlineListener: "Çevrim İçi Dinleyici",
    presenter: "Sunumlu",
    listener: "Dinleyici",
  },
  en: {
    academic: "Faculty/Other Participant",
    student: "Student",
    firstPaper: "First Paper",
    secondPaperFree: "Second Paper (Free)",
    early: "Early Registration",
    late: "Late Registration",
    inPersonListener: "In-Person Listener",
    onlineListener: "Online Listener",
    presenter: "Presenter",
    listener: "Listener",
  },
} as const;

function labelsFor(locale: PaymentLabelLocale = "tr") {
  return paymentLabels[locale];
}

export function getPaymentClosedMessage() {
  return PAYMENT_CLOSED_MESSAGE;
}

export function isPaymentClosed(
  congress: Pick<Congress, "lateDeadline">,
  now: Date = new Date(),
): boolean {
  if (!congress.lateDeadline) return false;
  return now.getTime() > congress.lateDeadline.getTime();
}

export function getCurrentPaymentPeriod(
  congress: Pick<Congress, "earlyDeadline" | "lateDeadline">,
  now: Date = new Date(),
): PaymentPeriod | null {
  if (isPaymentClosed(congress, now)) return null;

  const early = congress.earlyDeadline?.getTime() ?? null;
  if (early !== null && now.getTime() <= early) {
    return "EARLY";
  }

  return "LATE";
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  locale: PaymentLabelLocale = "tr",
): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function tierLabel(
  tier: Pick<
    PaymentTier,
    "presentationMode" | "role" | "audience" | "paperOrder" | "period"
  >,
  locale: PaymentLabelLocale = "tr",
): string {
  const parts: string[] = [];
  const label = labelsFor(locale);

  if (tier.role === "PRESENTER") {
    if (tier.audience === "ACADEMIC") parts.push(label.academic);
    if (tier.audience === "STUDENT") parts.push(label.student);
    if (tier.paperOrder === 1) parts.push(label.firstPaper);
    if (tier.paperOrder === 2) parts.push(label.secondPaperFree);
    if (tier.period === "EARLY") parts.push(label.early);
    if (tier.period === "LATE") parts.push(label.late);
    return parts.join(" · ");
  }

  if (tier.presentationMode === "IN_PERSON") {
    parts.push(label.inPersonListener);
    if (tier.audience === "ACADEMIC") parts.push(label.academic);
    if (tier.audience === "STUDENT") parts.push(label.student);
    if (tier.period === "EARLY") parts.push(label.early);
    if (tier.period === "LATE") parts.push(label.late);
  } else {
    parts.push(label.onlineListener);
  }
  return parts.join(" · ");
}

export function tierToOption(
  tier: PaymentTier,
  locale: PaymentLabelLocale = "tr",
): PaymentTierOption {
  return {
    id: tier.id,
    presentationMode: tier.presentationMode,
    role: tier.role,
    audience: tier.audience,
    paperOrder:
      tier.paperOrder === 1 || tier.paperOrder === 2
        ? (tier.paperOrder as 1 | 2)
        : null,
    period: tier.period,
    amount: tier.amount,
    currency: tier.currency,
    label: tierLabel(tier, locale),
  };
}

export function getCongressBankInfo(congress: Congress): CongressBankInfo {
  return {
    bankName: congress.bankName ?? "",
    bankAccountHolder: congress.bankAccountHolder ?? "",
    bankIban: congress.bankIban ?? "",
    bankBranch: congress.bankBranch ?? "",
  };
}

export function getCongressGalaInfo(congress: Congress): CongressGalaInfo {
  return {
    amount: congress.galaFeeAmount,
    currency: congress.galaFeeCurrency,
    note: congress.galaFeeNote ?? "",
  };
}

export function getCongressTripInfo(congress: Congress): CongressTripInfo {
  return {
    note: congress.tripNote ?? "",
  };
}

export function findApplicableTier(
  tiers: PaymentTier[],
  selection: {
    presentationMode: PresentationMode;
    attendeeRole: AttendeeRole;
    audience: AudienceType | null;
    paperOrder: number | null;
    period: PaymentPeriod | null;
  },
  options: { onlyActive?: boolean } = {},
): PaymentTier | null {
  const { onlyActive = true } = options;

  return (
    tiers.find((tier) => {
      if (onlyActive && !tier.active) return false;
      if (tier.role !== selection.attendeeRole) return false;

      if (selection.attendeeRole === "PRESENTER") {
        if (tier.presentationMode !== null) return false;
        if (tier.audience !== selection.audience) return false;
        if (tier.paperOrder !== selection.paperOrder) return false;
        if (selection.period !== null && tier.period !== selection.period) return false;
        if (selection.period === null && tier.period !== null) return false;
        return true;
      }

      if (tier.presentationMode !== selection.presentationMode) return false;
      if (selection.presentationMode === "IN_PERSON") {
        if (tier.audience !== selection.audience) return false;
        if (selection.period !== null && tier.period !== selection.period) return false;
        if (selection.period === null && tier.period !== null) return false;
        return true;
      }
      return tier.audience === null && tier.period === null;
    }) ?? null
  );
}

export async function getCongressWithTiers(
  slug: string,
): Promise<CongressWithTiers | null> {
  return prisma.congress.findUnique({
    where: { slug },
    include: {
      paymentTiers: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export function mapPaymentPeriod(
  period: PaymentPeriod | null,
  locale: PaymentLabelLocale = "tr",
) {
  const label = labelsFor(locale);
  switch (period) {
    case "EARLY":
      return label.early;
    case "LATE":
      return label.late;
    default:
      return "-";
  }
}

export function mapAudience(
  audience: AudienceType | null,
  locale: PaymentLabelLocale = "tr",
) {
  const label = labelsFor(locale);
  switch (audience) {
    case "ACADEMIC":
      return label.academic;
    case "STUDENT":
      return label.student;
    default:
      return "-";
  }
}

export function mapAttendeeRole(
  role: AttendeeRole | null,
  locale: PaymentLabelLocale = "tr",
) {
  const label = labelsFor(locale);
  switch (role) {
    case "PRESENTER":
      return label.presenter;
    case "LISTENER":
      return label.listener;
    default:
      return "-";
  }
}

export function mapPaperOrder(
  order: number | null,
  locale: PaymentLabelLocale = "tr",
) {
  const label = labelsFor(locale);
  if (order === 1) return label.firstPaper;
  if (order === 2) return label.secondPaperFree;
  return "-";
}

export function getEstimatedPresenterFee(
  tiers: PaymentTier[],
  audience: AudienceType | null,
): { earlyAmount: number | null; lateAmount: number | null; currency: string } {
  const early = tiers.find(
    (tier) =>
      tier.role === "PRESENTER" &&
      tier.presentationMode === null &&
      tier.audience === audience &&
      tier.paperOrder === 1 &&
      tier.period === "EARLY" &&
      tier.active,
  );
  const late = tiers.find(
    (tier) =>
      tier.role === "PRESENTER" &&
      tier.presentationMode === null &&
      tier.audience === audience &&
      tier.paperOrder === 1 &&
      tier.period === "LATE" &&
      tier.active,
  );

  return {
    earlyAmount: early?.amount ?? null,
    lateAmount: late?.amount ?? null,
    currency: early?.currency ?? late?.currency ?? "TRY",
  };
}
