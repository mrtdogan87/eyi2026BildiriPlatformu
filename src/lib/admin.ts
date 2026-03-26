import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { AdminSubmissionDetail, AdminSubmissionListItem } from "@/types/admin";

const ADMIN_COOKIE = "admin_session";
const EYI_CONGRESS_SLUG = "eyi-2026";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? null;
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

function signAdminSession(value: string) {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

async function readAdminCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value ?? null;
}

export async function setAdminSessionCookie() {
  const signature = signAdminSession(EYI_CONGRESS_SLUG);
  if (!signature) {
    throw new Error("Admin oturumu için sunucu yapılandırması eksik.");
  }

  const cookieStore = await cookies();
  const value = `${EYI_CONGRESS_SLUG}.${signature}`;
  cookieStore.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated() {
  const value = await readAdminCookie();
  if (!value) {
    return false;
  }

  const [slug, signature] = value.split(".");
  if (!slug || !signature || slug !== EYI_CONGRESS_SLUG) {
    return false;
  }

  const expected = signAdminSession(EYI_CONGRESS_SLUG);
  if (!expected || expected.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

export async function assertAdminApiAccess() {
  return isAdminAuthenticated();
}

export function isValidAdminPassword(password: string) {
  const adminPassword = getAdminPassword();
  return Boolean(adminPassword) && password === adminPassword;
}

function mapPresentationMode(mode: "ONLINE" | "IN_PERSON" | null) {
  return mode === "ONLINE" ? "Online" : "Yüz yüze";
}

export async function getAdminSubmissionList(): Promise<AdminSubmissionListItem[]> {
  const submissions = await prisma.submission.findMany({
    where: {
      status: "SUBMITTED",
      congress: {
        slug: EYI_CONGRESS_SLUG,
      },
    },
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      submissionLanguage: true,
      titleTr: true,
      titleEn: true,
      presentationMode: true,
      galaAttendance: true,
      galaAttendeeCount: true,
      tripAttendance: true,
      tripAttendeeCount: true,
      submittedAt: true,
      authors: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          fullName: true,
          email: true,
          isPresenter: true,
        },
      },
    },
  });

  return submissions.map((submission) => {
    const presenter =
      submission.authors.find((author) => author.isPresenter) ?? submission.authors[0] ?? null;
    const language = submission.submissionLanguage ?? "TR";

    return {
      id: submission.id,
      title: language === "EN" ? submission.titleEn || "-" : submission.titleTr || "-",
      submissionLanguage: language,
      presenterName: presenter?.fullName ?? "-",
      presenterEmail: presenter?.email ?? "-",
      presentationMode: mapPresentationMode(submission.presentationMode),
      galaLabel: submission.galaAttendance ? `Evet (${submission.galaAttendeeCount})` : "Hayır",
      tripLabel: submission.tripAttendance ? `Evet (${submission.tripAttendeeCount})` : "Hayır",
      submittedAt: submission.submittedAt?.toISOString() ?? null,
    };
  });
}

export async function getAdminSubmissionDetail(
  submissionId: string,
): Promise<AdminSubmissionDetail | null> {
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      congress: {
        slug: EYI_CONGRESS_SLUG,
      },
      status: "SUBMITTED",
    },
    select: {
      id: true,
      draftOwnerEmail: true,
      submissionLanguage: true,
      titleTr: true,
      titleEn: true,
      abstractTr: true,
      abstractEn: true,
      keywordsTr: true,
      keywordsEn: true,
      presentationMode: true,
      galaAttendance: true,
      galaAttendeeCount: true,
      tripAttendance: true,
      tripAttendeeCount: true,
      submittedAt: true,
      authors: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          fullName: true,
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
        },
      },
    },
  });

  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    draftOwnerEmail: submission.draftOwnerEmail,
    submissionLanguage: (submission.submissionLanguage ?? "TR") as "TR" | "EN",
    titleTr: submission.titleTr ?? "",
    titleEn: submission.titleEn ?? "",
    abstractTr: submission.abstractTr ?? "",
    abstractEn: submission.abstractEn ?? "",
    keywordsTr: submission.keywordsTr ?? "",
    keywordsEn: submission.keywordsEn ?? "",
    presentationMode: mapPresentationMode(submission.presentationMode),
    galaAttendance: submission.galaAttendance,
    galaAttendeeCount: submission.galaAttendeeCount,
    tripAttendance: submission.tripAttendance,
    tripAttendeeCount: submission.tripAttendeeCount,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    authors: submission.authors.map((author) => ({
      id: author.id,
      fullName: author.fullName,
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
        }
      : null,
  };
}

export async function getAdminDownloadPayload(submissionId: string) {
  return prisma.submissionFile.findFirst({
    where: {
      submissionId,
      submission: {
        status: "SUBMITTED",
        congress: {
          slug: EYI_CONGRESS_SLUG,
        },
      },
    },
    select: {
      originalName: true,
      mimeType: true,
      content: true,
    },
  });
}
