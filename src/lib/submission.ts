import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { PresentationMode as PrismaPresentationMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  InPersonCategory,
  PaymentCategory,
  PaymentPeriod,
  SubmissionAuthorInput,
  SubmissionDetailsInput,
  SubmissionParticipationInput,
  SubmissionPaymentInput,
  SubmissionSnapshot,
} from "@/types/submission";
import { slugToTitle } from "@/lib/utils";

const DRAFT_COOKIE = "draft_access";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const RECEIPT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const RECEIPT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const EARLY_PAYMENT_DEADLINE = new Date(Date.UTC(2026, 7, 1, 20, 59, 59));
const LATE_PAYMENT_DEADLINE = new Date(Date.UTC(2026, 7, 30, 20, 59, 59));
const PAYMENT_CLOSED_MESSAGE = "Kayıt süresi 30 Ağustos 2026 tarihinde sona ermiştir.";

type ResolvedSubmissionPayment = {
  input: SubmissionPaymentInput;
  paymentCategory: PaymentCategory;
  paymentPeriod: PaymentPeriod;
  paymentAmount: number;
  paymentDescription: string;
};

export function getBaseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

function getSessionSecret() {
  return process.env.DRAFT_SESSION_SECRET ?? "development-secret";
}

export function isValidDocx(file: File) {
  const hasDocxExtension = file.name.toLowerCase().endsWith(".docx");
  return hasDocxExtension && file.type === DOCX_MIME && file.size <= MAX_FILE_SIZE;
}

export function isValidReceiptFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = RECEIPT_ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasAllowedMimeType = !file.type || RECEIPT_ALLOWED_MIME_TYPES.has(file.type);
  return hasAllowedExtension && hasAllowedMimeType && file.size <= MAX_FILE_SIZE;
}

export function getPaymentClosedMessage() {
  return PAYMENT_CLOSED_MESSAGE;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken() {
  return randomBytes(24).toString("hex");
}

function signDraftSession(submissionId: string) {
  return createHmac("sha256", getSessionSecret()).update(submissionId).digest("hex");
}

export async function setDraftAccessCookie(submissionId: string) {
  const cookieStore = await cookies();
  const signature = signDraftSession(submissionId);
  cookieStore.set(DRAFT_COOKIE, `${submissionId}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearDraftAccessCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DRAFT_COOKIE);
}

export async function canAccessDraft(submissionId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(DRAFT_COOKIE)?.value;
  if (!value) {
    return false;
  }

  const [cookieSubmissionId, signature] = value.split(".");
  if (!cookieSubmissionId || !signature || cookieSubmissionId !== submissionId) {
    return false;
  }

  const expected = signDraftSession(submissionId);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function ensureCongress(slug: string) {
  return prisma.congress.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: slugToTitle(slug) || "Congress",
    },
  });
}

export function buildMagicLink(congressSlug: string, token: string) {
  return `${getBaseUrl()}/${congressSlug}/bildiri-gonder/devam?token=${token}`;
}

export async function issueDraftLink(submissionId: string, email: string, congressSlug: string) {
  const token = generateAccessToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.submissionAccessToken.updateMany({
    where: {
      submissionId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  await prisma.submissionAccessToken.create({
    data: {
      submissionId,
      email,
      tokenHash,
      expiresAt,
    },
  });

  const magicLink = buildMagicLink(congressSlug, token);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[draft-link:${email}] ${magicLink}`);
  }

  return magicLink;
}

export async function consumeDraftToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const record = await prisma.submissionAccessToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      submission: {
        include: {
          congress: true,
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  await prisma.submissionAccessToken.update({
    where: { id: record.id },
    data: {
      usedAt: now,
    },
  });

  return record.submission;
}

export function validateDetails(input: SubmissionDetailsInput) {
  const errors: string[] = [];
  if (!input.submissionLanguage) {
    errors.push("Bildiri dili zorunludur.");
  }

  if (input.submissionLanguage === "TR") {
    if (!input.titleTr.trim()) errors.push("Türkçe başlık zorunludur.");
    if (!input.abstractTr.trim()) errors.push("Türkçe özet zorunludur.");
    if (!input.keywordsTr.trim()) errors.push("Türkçe anahtar kelimeler zorunludur.");
  }

  if (input.submissionLanguage === "EN") {
    if (!input.titleEn.trim()) errors.push("İngilizce başlık zorunludur.");
    if (!input.abstractEn.trim()) errors.push("İngilizce özet zorunludur.");
    if (!input.keywordsEn.trim()) errors.push("İngilizce anahtar kelimeler zorunludur.");
  }

  return errors;
}

export function validateAuthors(authors: SubmissionAuthorInput[]) {
  const errors: string[] = [];
  if (!authors.length) {
    errors.push("En az bir yazar eklemelisiniz.");
    return errors;
  }

  const emailSet = new Set<string>();
  let presenterCount = 0;

  for (const author of authors) {
    if (!author.fullName.trim()) {
      errors.push("Tüm yazarlar için ad soyad zorunludur.");
      break;
    }

    if (!author.email.trim()) {
      errors.push("Tüm yazarlar için e-posta zorunludur.");
      break;
    }

    const normalized = author.email.trim().toLowerCase();
    if (emailSet.has(normalized)) {
      errors.push("Aynı bildiri içinde aynı e-posta birden fazla kez kullanılamaz.");
      break;
    }
    emailSet.add(normalized);

    if (author.isPresenter) {
      presenterCount += 1;
    }
  }

  if (presenterCount !== 1) {
    errors.push("Tam olarak bir sunan yazar seçmelisiniz.");
  }

  return errors;
}

export function findPresenter<T extends { isPresenter: boolean }>(authors: T[]) {
  return authors.find((author) => author.isPresenter) ?? authors[0] ?? null;
}

export function normalizeParticipation(input: SubmissionParticipationInput): SubmissionParticipationInput {
  const galaAttendeeCount = input.galaAttendance
    ? Math.max(0, Number.isFinite(input.galaAttendeeCount) ? input.galaAttendeeCount : 0)
    : 0;
  const tripAttendeeCount = input.tripAttendance
    ? Math.max(0, Number.isFinite(input.tripAttendeeCount) ? input.tripAttendeeCount : 0)
    : 0;

  return {
    presentationMode: input.presentationMode,
    galaAttendance: input.galaAttendance,
    galaAttendeeCount,
    tripAttendance: input.tripAttendance,
    tripAttendeeCount,
  };
}

export function validateParticipation(input: SubmissionParticipationInput) {
  const errors: string[] = [];
  if (!input.presentationMode) {
    errors.push("Sunum şekli zorunludur.");
  }

  if (input.galaAttendance && input.galaAttendeeCount < 1) {
    errors.push("Gala katılımı için kişi sayısı en az 1 olmalıdır.");
  }

  if (input.tripAttendance && input.tripAttendeeCount < 1) {
    errors.push("Gezi katılımı için kişi sayısı en az 1 olmalıdır.");
  }

  return errors;
}

export function normalizePaymentInput(
  input: SubmissionPaymentInput,
  presentationMode: PrismaPresentationMode | "ONLINE" | "IN_PERSON",
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
  presentationMode: PrismaPresentationMode | "ONLINE" | "IN_PERSON",
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
  presentationMode: PrismaPresentationMode | "ONLINE" | "IN_PERSON";
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

export async function getSubmissionSnapshot(
  submissionId: string,
): Promise<SubmissionSnapshot | null> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      congress: true,
      authors: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      file: true,
      paymentReceipt: true,
    },
  });

  if (!submission) {
    return null;
  }

  const paymentInput = derivePaymentInputFromCategory(
    (submission.paymentCategory ?? null) as PaymentCategory | null,
  );

  return {
    id: submission.id,
    congressSlug: submission.congress.slug,
    draftOwnerEmail: submission.draftOwnerEmail,
    status: submission.status,
    submissionLanguage: (submission.submissionLanguage ?? "TR") as "TR" | "EN",
    titleTr: submission.titleTr ?? "",
    titleEn: submission.titleEn ?? "",
    abstractTr: submission.abstractTr ?? "",
    abstractEn: submission.abstractEn ?? "",
    keywordsTr: submission.keywordsTr ?? "",
    keywordsEn: submission.keywordsEn ?? "",
    presentationMode: (submission.presentationMode ?? "IN_PERSON") as "ONLINE" | "IN_PERSON",
    galaAttendance: submission.galaAttendance,
    galaAttendeeCount: submission.galaAttendeeCount,
    tripAttendance: submission.tripAttendance,
    tripAttendeeCount: submission.tripAttendeeCount,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    file: submission.file
      ? {
          originalName: submission.file.originalName,
          fileSize: submission.file.fileSize,
        }
      : null,
    payment: {
      ...paymentInput,
      category: (submission.paymentCategory ?? null) as PaymentCategory | null,
      period: (submission.paymentPeriod ?? null) as PaymentPeriod | null,
      amount: submission.paymentAmount ?? null,
      description: submission.paymentDescription ?? "",
      isClosed: isPaymentClosed(),
    },
    paymentReceipt: submission.paymentReceipt
      ? {
          originalName: submission.paymentReceipt.originalName,
          fileSize: submission.paymentReceipt.fileSize,
          uploadedAt: submission.paymentReceipt.uploadedAt.toISOString(),
        }
      : null,
    authors: submission.authors.map((author) => ({
      id: author.id,
      fullName: author.fullName,
      email: author.email,
      institution: author.institution ?? "",
      country: author.country ?? "",
      isPresenter: author.isPresenter,
    })),
  };
}

export async function countSubmittedEmailUsage(congressId: string, emails: string[]) {
  const normalized = [...new Set(emails.map((email) => email.trim().toLowerCase()))];
  const authors = await prisma.submissionAuthor.findMany({
    where: {
      email: {
        in: normalized,
      },
      submission: {
        congressId,
        submittedAt: {
          not: null,
        },
      },
    },
    select: {
      email: true,
    },
  });

  return authors.reduce<Record<string, number>>((acc, author) => {
    const email = author.email.toLowerCase();
    acc[email] = (acc[email] ?? 0) + 1;
    return acc;
  }, {});
}
