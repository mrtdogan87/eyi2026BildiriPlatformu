import { deliveryAllowed } from "@/modules/congress/delivery";
import { effectiveConfiguration } from "@/modules/congress/configuration";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionCookieName, secureSessionCookie } from "@/lib/environment";
import {
  getCongressWithTiers,
  getCurrentPaymentPeriod,
  tierToOption,
} from "@/lib/payment";
import type {
  AudienceType,
  PresentationMode,
  SubmissionAuthorInput,
  SubmissionConfig,
  SubmissionDetailsInput,
  SubmissionParticipationInput,
  SubmissionSnapshot,
} from "@/types/submission";
import { AccessError } from "@/platform/http";
import type { Locale, TFunction } from "@/lib/i18n";
import type { Prisma } from '@prisma/client';
import { enqueueNotification } from '@/platform/notifications';
import { declarationDocuments } from '@/modules/participation/declarations';
import { structuredAbstractSchema, emptyStructuredAbstract } from '@/modules/participation/abstract';

const DRAFT_COOKIE = sessionCookieName("draft_access");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DRAFT_TOKEN_GRACE_WINDOW_MS = 5 * 60 * 1000;
const DRAFT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const RECEIPT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const RECEIPT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

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

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAccessToken() {
  return randomBytes(24).toString("hex");
}

export function getDraftTokenWindowMinutes() {
  return DRAFT_TOKEN_GRACE_WINDOW_MS / (60 * 1000);
}

function signDraftSession(submissionId: string) {
  return createHmac("sha256", getSessionSecret()).update(submissionId).digest("hex");
}

export async function setDraftAccessCookie(submissionId: string) {
  const cookieStore = await cookies();
  const payload = `${submissionId}.${Date.now() + DRAFT_SESSION_TTL_MS}`;
  const signature = signDraftSession(payload);
  cookieStore.set(DRAFT_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureSessionCookie(),
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

  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [cookieSubmissionId, expiry, signature] = parts;
  const expiresAt = Number(expiry); const now = Date.now();
  if (!cookieSubmissionId || !/^[a-f0-9]{64}$/.test(signature) || cookieSubmissionId !== submissionId || !/^\d{13}$/.test(expiry) || !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + DRAFT_SESSION_TTL_MS) {
    return false;
  }

  const expected = signDraftSession(`${submissionId}.${expiry}`);
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function ensureCongress(slug: string) {
  const congress = await prisma.congress.findUnique({ where: { slug } });
  if (!congress) throw new AccessError(404, 'Kongre bulunamadı.');
  return congress;
}

export function buildMagicLink(congressSlug: string, token: string) {
  return `${getBaseUrl()}/${congressSlug}/bildiri-gonder/devam?token=${token}`;
}

export async function issueDraftLink(tx: Prisma.TransactionClient, input: {
  submissionId: string; email: string; congressId: string; congressSlug: string; congressName: string; locale: Locale;
}) {
  const { submissionId, email, congressSlug } = input;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`draft-access:${submissionId}`}))`;
  const now = new Date();
  const token = generateAccessToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24);

  await tx.submissionAccessToken.updateMany({
    where: {
      submissionId,
      expiresAt: { gt: now },
    },
    data: { expiresAt: now },
  });

  const record = await tx.submissionAccessToken.create({
    data: {
      submissionId,
      email,
      tokenHash,
      expiresAt,
    },
  });

  const magicLink = buildMagicLink(congressSlug, token);
  await enqueueNotification(tx, {
    congressId: input.congressId, key: 'DRAFT_ACCESS', locale: input.locale, to: email,
    dedupeKey: `draft-access:${record.id}`, module: 'SUBMISSIONS', sourceType: 'submission-access-token', sourceId: record.id, expiresAt,
    values: { congressName: input.congressName, accessLink: magicLink },
  });
}

function isDraftTokenUsable(usedAt: Date | null, now: Date) {
  return !usedAt || now.getTime() - usedAt.getTime() <= DRAFT_TOKEN_GRACE_WINDOW_MS;
}

async function findDraftTokenRecord(token: string, now: Date) {
  const tokenHash = hashToken(token);
  return prisma.submissionAccessToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
    },
    include: {
      submission: { include: { congress: true } },
    },
  });
}

export async function inspectDraftToken(token: string) {
  const now = new Date();
  const record = await findDraftTokenRecord(token, now);
  if (!record || !isDraftTokenUsable(record.usedAt, now)) {
    return null;
  }

  return record.submission;
}

export async function consumeDraftToken(token: string) {
  const now = new Date();
  const record = await findDraftTokenRecord(token, now);

  if (!record || !isDraftTokenUsable(record.usedAt, now)) {
    return null;
  }

  if (!record.usedAt) {
    await prisma.submissionAccessToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });
  }

  return record.submission;
}

export function validateDetails(input: SubmissionDetailsInput, t: TFunction) {
  const errors: string[] = [];
  if (!input.submissionLanguage) {
    errors.push(t("api.langRequired"));
  }

  if (input.submissionLanguage === "TR") {
    if (!input.titleTr.trim()) errors.push(t("api.titleTrRequired"));
    if (!input.abstractTr.trim()) errors.push(t("api.abstractTrRequired"));
    if (!input.keywordsTr.trim()) errors.push(t("api.keywordsTrRequired"));
  }

  if (input.submissionLanguage === "EN") {
    if (!input.titleEn.trim()) errors.push(t("api.titleEnRequired"));
    if (!input.abstractEn.trim()) errors.push(t("api.abstractEnRequired"));
    if (!input.keywordsEn.trim()) errors.push(t("api.keywordsEnRequired"));
  }

  return errors;
}

export function validateAuthors(authors: SubmissionAuthorInput[], t: TFunction) {
  const errors: string[] = [];
  if (!authors.length) {
    errors.push(t("api.atLeastOneAuthor"));
    return errors;
  }

  const emailSet = new Set<string>();
  let presenterCount = 0;

  for (const author of authors) {
    if (!author.fullName.trim()) {
      errors.push(t("api.authorNameRequired"));
      break;
    }

    if (!author.title.trim()) {
      errors.push(t("api.authorTitleRequired"));
      break;
    }

    if (!author.email.trim()) {
      errors.push(t("api.authorEmailRequired"));
      break;
    }

    const normalized = author.email.trim().toLowerCase();
    if (emailSet.has(normalized)) {
      errors.push(t("api.duplicateEmail"));
      break;
    }
    emailSet.add(normalized);

    if (author.isPresenter) {
      presenterCount += 1;
    }
  }

  if (presenterCount !== 1) {
    errors.push(t("api.exactlyOnePresenter"));
  }

  return errors;
}

export function findPresenter<T extends { isPresenter: boolean }>(authors: T[]) {
  return authors.find((author) => author.isPresenter) ?? authors[0] ?? null;
}

export function validateParticipation(input: SubmissionParticipationInput, t: TFunction) {
  const errors: string[] = [];
  if (!input.presentationMode) {
    errors.push(t("api.presentationRequired"));
  }
  if (!input.audience) {
    errors.push(t("api.audienceRequired"));
  }
  return errors;
}

export async function getSubmissionConfig(
  congressSlug: string,
  locale: Locale = "tr",
): Promise<SubmissionConfig | null> {
  const congress = await getCongressWithTiers(congressSlug);
  if (!congress) {
    return null;
  }

  return {
    congressName: congress.name,
    declarations: declarationDocuments(effectiveConfiguration(congress.configuration), 'SUBMISSION'),
    congressSlug: congress.slug,
    earlyDeadline: congress.earlyDeadline?.toISOString() ?? null,
    lateDeadline: congress.lateDeadline?.toISOString() ?? null,
    currentPeriod: getCurrentPaymentPeriod(congress),
    tiers: congress.paymentTiers
      .filter((tier) => tier.active)
      .map((tier) => tierToOption(tier, locale)),
    submissionsClosed: !(await deliveryAllowed(congress.id)),
    workflow: congress.configuration ? effectiveConfiguration(congress.configuration) : null,
  };
}

/**
 * Bildiri gönderiminin kapalı olup olmadığı. Admin panelindeki anahtar ile yönetilir.
 * Sunucu tarafındaki her gönderim yolu bunu kontrol etmek zorundadır; arayüzde butonu
 * gizlemek yeterli değildir çünkü taslak bağlantıları ve API uçları doğrudan çağrılabilir.
 */
export async function isSubmissionClosed(congressSlug: string, email?: string): Promise<boolean> {
  const congress = await prisma.congress.findUnique({ where: { slug: congressSlug }, select: { id: true } });
  return !congress || !(await deliveryAllowed(congress.id, { email }));
}
export async function canResumeDraft(id: string) {
  return !(await isSubmissionClosedForDraft(id)) || !(await isSubmissionClosedForDraft(id, 'FULL_TEXT'));
}
export async function isSubmissionClosedForDraft(submissionId: string, stage?: 'ABSTRACT' | 'FULL_TEXT' | 'SUBMIT'): Promise<boolean> {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, select: { congressId: true, draftOwnerEmail: true } });
  return !submission || !(await deliveryAllowed(submission.congressId, { email: submission.draftOwnerEmail, submissionId, stage }));
}

export async function getSubmissionSnapshot(
  submissionId: string,
): Promise<SubmissionSnapshot | null> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      congress: true,
      authors: { orderBy: { sortOrder: "asc" } },
      file: true,
    },
  });

  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    declarations: declarationDocuments(effectiveConfiguration(submission.congress.configuration), 'SUBMISSION'),
    structuredAbstract: structuredAbstractSchema.safeParse(submission.structuredAbstract).success ? structuredAbstractSchema.parse(submission.structuredAbstract) : emptyStructuredAbstract(),
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
    presentationMode: (submission.presentationMode ?? null) as PresentationMode | null,
    audience: (submission.audience ?? null) as AudienceType | null,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    file: submission.file
      ? {
          originalName: submission.file.originalName,
          fileSize: submission.file.fileSize,
        }
      : null,
    authors: submission.authors.map((author) => ({
      id: author.id,
      fullName: author.fullName,
      title: author.title ?? "",
      email: author.email,
      institution: author.institution ?? "",
      country: author.country ?? "",
      isPresenter: author.isPresenter,
    })),
  };
}

export async function countSubmittedEmailUsage(congressId: string, emails: string[], client: Pick<Prisma.TransactionClient, 'submissionAuthor'> = prisma) {
  const normalized = [...new Set(emails.map((email) => email.trim().toLowerCase()))];
  const authors = await client.submissionAuthor.findMany({
    where: {
      email: { in: normalized },
      submission: {
        congressId,
        submittedAt: { not: null },
      },
    },
    select: { email: true },
  });

  return authors.reduce<Record<string, number>>((acc, author) => {
    const email = author.email.toLowerCase();
    acc[email] = (acc[email] ?? 0) + 1;
    return acc;
  }, {});
}
