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
    "presentationMode" | "role" | "audience" | "paperOrder" | "period"
  >,
): string {
  const parts: string[] = [];

  if (tier.role === "PRESENTER") {
    if (tier.audience === "ACADEMIC") parts.push("Akademik Personel");
    if (tier.audience === "STUDENT") parts.push("Öğrenci");
    if (tier.paperOrder === 1) parts.push("Birinci Bildiri");
    if (tier.paperOrder === 2) parts.push("İkinci Bildiri (%50 İndirim)");
    if (tier.period === "EARLY") parts.push("Erken Kayıt");
    if (tier.period === "LATE") parts.push("Geç Kayıt");
    return parts.join(" · ");
  }

  // LISTENER
  if (tier.presentationMode === "IN_PERSON") {
    parts.push("Yüz Yüze Dinleyici");
    if (tier.audience === "ACADEMIC") parts.push("Akademik Personel");
    if (tier.audience === "STUDENT") parts.push("Öğrenci");
    if (tier.period === "EARLY") parts.push("Erken Kayıt");
    if (tier.period === "LATE") parts.push("Geç Kayıt");
  } else {
    parts.push("Çevrim İçi Dinleyici");
  }
  return parts.join(" · ");
}

export function tierToOption(tier: PaymentTier): PaymentTierOption {
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
        // Presenter pricing: presentation mode irrelevant, audience + paperOrder + period.
        if (tier.presentationMode !== null) return false;
        if (tier.audience !== selection.audience) return false;
        if (tier.paperOrder !== selection.paperOrder) return false;
        if (selection.period !== null && tier.period !== selection.period) return false;
        if (selection.period === null && tier.period !== null) return false;
        return true;
      }

      // LISTENER
      if (tier.presentationMode !== selection.presentationMode) return false;
      if (selection.presentationMode === "IN_PERSON") {
        if (tier.audience !== selection.audience) return false;
        if (selection.period !== null && tier.period !== selection.period) return false;
        if (selection.period === null && tier.period !== null) return false;
        return true;
      }
      // ONLINE listener: single tier, audience/period irrelevant
      return tier.audience === null && tier.period === null;
    }) ?? null
  );
}

export function normalizePaymentInput(
  input: SubmissionPaymentInput,
  presentationMode: PresentationMode,
): SubmissionPaymentInput {
  if (input.attendeeRole === "LISTENER") {
    if (presentationMode === "ONLINE") {
      return { attendeeRole: "LISTENER", audience: null, paperOrder: null };
    }
    return {
      attendeeRole: "LISTENER",
      audience: input.audience,
      paperOrder: null,
    };
  }

  if (input.attendeeRole === "PRESENTER") {
    return {
      attendeeRole: "PRESENTER",
      audience: input.audience,
      paperOrder: input.paperOrder,
    };
  }

  return { attendeeRole: null, audience: null, paperOrder: null };
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

  if (normalized.attendeeRole === "PRESENTER") {
    if (!normalized.audience) {
      errors.push("Sunumlu katılım için akademisyen veya öğrenci seçmelisiniz.");
    }
    if (normalized.paperOrder !== 1 && normalized.paperOrder !== 2) {
      errors.push("Sunacağınız bildiri kaçıncı sırada olduğunu seçmelisiniz.");
    }
    return errors;
  }

  // LISTENER
  if (presentationMode === "IN_PERSON" && !normalized.audience) {
    errors.push("Yüz yüze dinleyici katılımı için akademisyen veya öğrenci seçmelisiniz.");
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

  const normalized = normalizePaymentInput(input.payment, input.presentationMode);

  // ONLINE LISTENER pays nothing — no period applied.
  const isOnlineListener =
    normalized.attendeeRole === "LISTENER" && input.presentationMode === "ONLINE";

  const period = isOnlineListener
    ? null
    : getCurrentPaymentPeriod(input.congress, now);

  if (!isOnlineListener && !period) {
    throw new Error(PAYMENT_CLOSED_MESSAGE);
  }

  const tier = findApplicableTier(input.congress.paymentTiers, {
    presentationMode: input.presentationMode,
    attendeeRole: normalized.attendeeRole as AttendeeRole,
    audience: normalized.audience,
    paperOrder: normalized.paperOrder,
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
      return "Akademik Personel";
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

export function mapPaperOrder(order: number | null) {
  if (order === 1) return "Birinci Bildiri";
  if (order === 2) return "İkinci Bildiri (%50 İndirim)";
  return "-";
}
