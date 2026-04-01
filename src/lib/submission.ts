import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { slugToTitle } from "@/lib/utils";
import type {
  SubmissionAuthorInput,
  SubmissionDetailsInput,
  SubmissionParticipationInput,
  SubmissionSnapshot,
} from "@/types/submission";

const DRAFT_COOKIE = "draft_access";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    },
  });

  if (!submission) {
    return null;
  }

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
