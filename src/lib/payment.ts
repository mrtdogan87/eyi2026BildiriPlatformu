import type {
  InPersonCategory,
  PaymentCategory,
  PaymentPeriod,
  PresentationMode,
  SubmissionPaymentInput,
} from "@/types/submission";

const EARLY_PAYMENT_DEADLINE = new Date(Date.UTC(2026, 7, 1, 20, 59, 59));
const LATE_PAYMENT_DEADLINE = new Date(Date.UTC(2026, 7, 30, 20, 59, 59));
const PAYMENT_CLOSED_MESSAGE = "Kayıt süresi 30 Ağustos 2026 tarihinde sona ermiştir.";

export type ResolvedSubmissionPayment = {
  input: SubmissionPaymentInput;
  paymentCategory: PaymentCategory;
  paymentPeriod: PaymentPeriod;
  paymentAmount: number;
  paymentDescription: string;
};

export function getPaymentClosedMessage() {
  return PAYMENT_CLOSED_MESSAGE;
}

export function normalizePaymentInput(
  input: SubmissionPaymentInput,
  presentationMode: PresentationMode,
): SubmissionPaymentInput {
  if (presentationMode === "IN_PERSON") {
    return {
      inPersonCategory: input.inPersonCategory,
      onlinePaperCount: null,
    };
  }

  return {
    inPersonCategory: null,
    onlinePaperCount: input.onlinePaperCount,
  };
}

export function isPaymentClosed(now = new Date()) {
  return now.getTime() > LATE_PAYMENT_DEADLINE.getTime();
}

export function getCurrentPaymentPeriod(now = new Date()): PaymentPeriod | null {
  if (isPaymentClosed(now)) {
    return null;
  }

  return now.getTime() <= EARLY_PAYMENT_DEADLINE.getTime() ? "EARLY" : "LATE";
}

export function validatePayment(
  input: SubmissionPaymentInput,
  presentationMode: PresentationMode,
  now = new Date(),
) {
  const errors: string[] = [];
  if (isPaymentClosed(now)) {
    errors.push(getPaymentClosedMessage());
    return errors;
  }

  const normalized = normalizePaymentInput(input, presentationMode);
  if (presentationMode === "IN_PERSON" && !normalized.inPersonCategory) {
    errors.push("Yüz yüze katılım için ücret kategorisi seçmelisiniz.");
  }

  if (presentationMode === "ONLINE" && !normalized.onlinePaperCount) {
    errors.push("Çevrim içi katılım için bildiri sayısını seçmelisiniz.");
  }

  return errors;
}

export function derivePaymentInputFromCategory(
  category: PaymentCategory | null,
): SubmissionPaymentInput {
  switch (category) {
    case "ACADEMIC":
      return { inPersonCategory: "ACADEMIC", onlinePaperCount: null };
    case "STUDENT":
      return { inPersonCategory: "STUDENT", onlinePaperCount: null };
    case "ONLINE_ONE":
      return { inPersonCategory: null, onlinePaperCount: 1 };
    case "ONLINE_TWO":
      return { inPersonCategory: null, onlinePaperCount: 2 };
    default:
      return { inPersonCategory: null, onlinePaperCount: null };
  }
}

export function mapPaymentCategory(category: PaymentCategory | null) {
  switch (category) {
    case "ACADEMIC":
      return "Yüz Yüze Akademik Personel";
    case "STUDENT":
      return "Yüz Yüze Öğrenci";
    case "ONLINE_ONE":
      return "Çevrim İçi Tek Bildiri";
    case "ONLINE_TWO":
      return "Çevrim İçi İki Bildiri";
    default:
      return "-";
  }
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

export function resolveSubmissionPayment(input: {
  payment: SubmissionPaymentInput;
  presentationMode: PresentationMode;
  presenterName: string;
  now?: Date;
}): ResolvedSubmissionPayment {
  const now = input.now ?? new Date();
  const errors = validatePayment(input.payment, input.presentationMode, now);
  if (errors.length) {
    throw new Error(errors[0]);
  }

  const period = getCurrentPaymentPeriod(now);
  if (!period) {
    throw new Error(getPaymentClosedMessage());
  }

  const presenterName = input.presenterName.trim();
  if (!presenterName) {
    throw new Error("Ödeme açıklaması için sunan yazar adı zorunludur.");
  }

  const normalized = normalizePaymentInput(input.payment, input.presentationMode);

  if (input.presentationMode === "IN_PERSON") {
    const inPersonCategory = normalized.inPersonCategory as InPersonCategory;
    return {
      input: normalized,
      paymentCategory: inPersonCategory,
      paymentPeriod: period,
      paymentAmount:
        inPersonCategory === "ACADEMIC" ? (period === "EARLY" ? 3000 : 4000) : period === "EARLY" ? 2000 : 3000,
      paymentDescription:
        inPersonCategory === "ACADEMIC"
          ? `${presenterName} - Yüz Yüze Akademik Personel`
          : `${presenterName} - Yüz Yüze Öğrenci`,
    };
  }

  const onlinePaperCount = normalized.onlinePaperCount ?? 1;
  return {
    input: normalized,
    paymentCategory: onlinePaperCount === 1 ? "ONLINE_ONE" : "ONLINE_TWO",
    paymentPeriod: period,
    paymentAmount: onlinePaperCount === 1 ? 2000 : 3000,
    paymentDescription:
      onlinePaperCount === 1
        ? `${presenterName} - Çevrim İçi Tek Bildiri`
        : `${presenterName} - Çevrim İçi İki Bildiri`,
  };
}
