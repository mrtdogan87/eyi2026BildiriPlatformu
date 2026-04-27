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
  SubmissionPaymentInput,
} from "@/types/submission";

export type CongressWithTiers = Congress & { paymentTiers: PaymentTier[] };

const PAYMENT_CLOSED_MESSAGE =
  "Kayıt süresi sona erdiği için yeni ödeme ve gönderim alınmıyor.";

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

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", {
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
    "presentationMode" | "role" | "audience" | "onlinePaperCount" | "period"
  >,
): string {
  const parts: string[] = [];

  if (tier.presentationMode === "IN_PERSON") {
    parts.push("Yüz Yüze");
    if (tier.audience === "ACADEMIC") parts.push("Akademisyen");
    if (tier.audience === "STUDENT") parts.push("Öğrenci");
    parts.push(tier.role === "PRESENTER" ? "Sunumlu" : "Dinleyici");
    if (tier.period === "EARLY") parts.push("Erken Kayıt");
    if (tier.period === "LATE") parts.push("Geç Kayıt");
  } else {
    parts.push("Çevrim İçi");
    if (tier.role === "PRESENTER") {
      parts.push(tier.onlinePaperCount === 2 ? "İki Bildiri" : "Tek Bildiri");
    } else {
      parts.push("Dinleyici");
    }
  }

  return parts.join(" · ");
}

export function tierToOption(tier: PaymentTier): PaymentTierOption {
  return {
    id: tier.id,
    presentationMode: tier.presentationMode,
    role: tier.role,
    audience: tier.audience,
    onlinePaperCount:
      tier.onlinePaperCount === 1 || tier.onlinePaperCount === 2
        ? (tier.onlinePaperCount as 1 | 2)
        : null,
    period: tier.period,
    amount: tier.amount,
    currency: tier.currency,
    label: tierLabel(tier),
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
    onlinePaperCount: number | null;
    period: PaymentPeriod | null;
  },
  options: { onlyActive?: boolean } = {},
): PaymentTier | null {
  const { onlyActive = true } = options;

  return (
    tiers.find((tier) => {
      if (onlyActive && !tier.active) return false;
      if (tier.presentationMode !== selection.presentationMode) return false;
      if (tier.role !== selection.attendeeRole) return false;

      if (selection.presentationMode === "IN_PERSON") {
        if (tier.audience !== selection.audience) return false;
        if (selection.period !== null && tier.period !== selection.period) {
          return false;
        }
        if (selection.period === null && tier.period !== null) return false;
      } else {
        if (tier.audience !== null) return false;
        if (tier.period !== null) return false;
        if (selection.attendeeRole === "PRESENTER") {
          if (tier.onlinePaperCount !== selection.onlinePaperCount) return false;
        } else if (tier.onlinePaperCount !== null) {
          return false;
        }
      }
      return true;
    }) ?? null
  );
}

export function normalizePaymentInput(
  input: SubmissionPaymentInput,
  presentationMode: PresentationMode,
): SubmissionPaymentInput {
  if (presentationMode === "IN_PERSON") {
    return {
      attendeeRole: input.attendeeRole,
      audience: input.audience,
      onlinePaperCount: null,
    };
  }

  if (input.attendeeRole === "LISTENER") {
    return {
      attendeeRole: "LISTENER",
      audience: null,
      onlinePaperCount: null,
    };
  }

  return {
    attendeeRole: input.attendeeRole,
    audience: null,
    onlinePaperCount: input.onlinePaperCount,
  };
}

export function validatePaymentSelection(
  input: SubmissionPaymentInput,
  presentationMode: PresentationMode,
): string[] {
  const errors: string[] = [];
  const normalized = normalizePaymentInput(input, presentationMode);

  if (!normalized.attendeeRole) {
    errors.push("Katılım türü (sunumlu / dinleyici) seçmelisiniz.");
    return errors;
  }

  if (presentationMode === "IN_PERSON" && !normalized.audience) {
    errors.push("Yüz yüze katılım için akademisyen veya öğrenci seçmelisiniz.");
  }

  if (
    presentationMode === "ONLINE" &&
    normalized.attendeeRole === "PRESENTER" &&
    !normalized.onlinePaperCount
  ) {
    errors.push("Çevrim içi sunum için bildiri sayısını seçmelisiniz.");
  }

  return errors;
}

export type ResolvedSubmissionPayment = {
  input: SubmissionPaymentInput;
  presentationMode: PresentationMode;
  tier: PaymentTier;
  paymentPeriod: PaymentPeriod | null;
  paymentAmount: number;
  paymentCurrency: string;
  paymentDescription: string;
};

export function resolveSubmissionPayment(input: {
  congress: CongressWithTiers;
  payment: SubmissionPaymentInput;
  presentationMode: PresentationMode;
  presenterName: string;
  now?: Date;
}): ResolvedSubmissionPayment {
  const now = input.now ?? new Date();

  if (isPaymentClosed(input.congress, now)) {
    throw new Error(PAYMENT_CLOSED_MESSAGE);
  }

  const errors = validatePaymentSelection(input.payment, input.presentationMode);
  if (errors.length) {
    throw new Error(errors[0]);
  }

  const presenterName = input.presenterName.trim();
  if (!presenterName) {
    throw new Error("Ödeme açıklaması için sunan yazar adı zorunludur.");
  }

  const period =
    input.presentationMode === "IN_PERSON"
      ? getCurrentPaymentPeriod(input.congress, now)
      : null;

  if (input.presentationMode === "IN_PERSON" && !period) {
    throw new Error(PAYMENT_CLOSED_MESSAGE);
  }

  const normalized = normalizePaymentInput(input.payment, input.presentationMode);

  const tier = findApplicableTier(input.congress.paymentTiers, {
    presentationMode: input.presentationMode,
    attendeeRole: normalized.attendeeRole as AttendeeRole,
    audience: normalized.audience,
    onlinePaperCount: normalized.onlinePaperCount,
    period,
  });

  if (!tier) {
    throw new Error(
      "Seçtiğiniz katılım için tanımlı bir ücret bulunamadı. Yöneticinizle iletişime geçin.",
    );
  }

  return {
    input: normalized,
    presentationMode: input.presentationMode,
    tier,
    paymentPeriod: tier.period,
    paymentAmount: tier.amount,
    paymentCurrency: tier.currency,
    paymentDescription: `${presenterName} - ${tierLabel(tier)}`,
  };
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

export function mapPaymentPeriod(period: PaymentPeriod | null) {
  switch (period) {
    case "EARLY":
      return "Erken Kayıt";
    case "LATE":
      return "Geç Kayıt";
    default:
      return "-";
  }
}

export function mapAudience(audience: AudienceType | null) {
  switch (audience) {
    case "ACADEMIC":
      return "Akademisyen";
    case "STUDENT":
      return "Öğrenci";
    default:
      return "-";
  }
}

export function mapAttendeeRole(role: AttendeeRole | null) {
  switch (role) {
    case "PRESENTER":
      return "Sunumlu";
    case "LISTENER":
      return "Dinleyici";
    default:
      return "-";
  }
}
