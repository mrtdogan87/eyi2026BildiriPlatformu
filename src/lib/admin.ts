import { createHmac, timingSafeEqual } from "crypto";
import mammoth from "mammoth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AdminSubmissionDetail,
  AdminSubmissionListFilters,
  AdminSubmissionListItem,
} from "@/types/admin";

const ADMIN_COOKIE = "admin_session";
const EYI_CONGRESS_SLUG = "eyi-2026";
type ManageableSubmissionStatus = "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? process.env.DRAFT_SESSION_SECRET?.slice(0, 16) ?? null;
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.DRAFT_SESSION_SECRET ?? null;
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
  if (status === "DRAFT") {
    return "SUBMITTED";
  }

  return status;
}

export function normalizeAdminSubmissionFilters(
  input?: Partial<AdminSubmissionListFilters> | URLSearchParams,
): AdminSubmissionListFilters {
  const getValue = (key: keyof AdminSubmissionListFilters) => {
    if (!input) {
      return "";
    }

    if (input instanceof URLSearchParams) {
      return input.get(key) ?? "";
    }

    return input[key] ?? "";
  };

  const language = getValue("language");
  const status = getValue("status");
  const presentationMode = getValue("presentationMode");
  const gala = getValue("gala");
  const trip = getValue("trip");

  return {
    q: String(getValue("q") ?? "").trim(),
    status:
      status === "SUBMITTED" ||
      status === "UNDER_REVIEW" ||
      status === "ACCEPTED" ||
      status === "REJECTED"
        ? status
        : "ALL",
    language: language === "TR" || language === "EN" ? language : "ALL",
    presentationMode:
      presentationMode === "ONLINE" || presentationMode === "IN_PERSON"
        ? presentationMode
        : "ALL",
    gala: gala === "YES" || gala === "NO" ? gala : "ALL",
    trip: trip === "YES" || trip === "NO" ? trip : "ALL",
  };
}

export async function getAdminSubmissionList(
  rawFilters?: Partial<AdminSubmissionListFilters> | URLSearchParams,
): Promise<AdminSubmissionListItem[]> {
  const filters = normalizeAdminSubmissionFilters(rawFilters);
  const submissions = await prisma.submission.findMany({
    where: {
      status: {
        not: "DRAFT",
      },
      congress: {
        slug: EYI_CONGRESS_SLUG,
      },
      ...(filters.status !== "ALL"
        ? {
            status: filters.status,
          }
        : {}),
      ...(filters.language !== "ALL"
        ? {
            submissionLanguage: filters.language,
          }
        : {}),
      ...(filters.presentationMode !== "ALL"
        ? {
            presentationMode: filters.presentationMode,
          }
        : {}),
      ...(filters.gala !== "ALL"
        ? {
            galaAttendance: filters.gala === "YES",
          }
        : {}),
      ...(filters.trip !== "ALL"
        ? {
            tripAttendance: filters.trip === "YES",
          }
        : {}),
      ...(filters.q
        ? {
            OR: [
              {
                titleTr: {
                  contains: filters.q,
                  mode: "insensitive",
                },
              },
              {
                titleEn: {
                  contains: filters.q,
                  mode: "insensitive",
                },
              },
              {
                authors: {
                  some: {
                    fullName: {
                      contains: filters.q,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                authors: {
                  some: {
                    email: {
                      contains: filters.q.toLowerCase(),
                    },
                  },
                },
              },
            ],
          }
        : {}),
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
      status: true,
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
      status: asManageableSubmissionStatus(submission.status),
      statusLabel: mapSubmissionStatus(submission.status),
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
    "Gala",
    "Gezi",
    "Gonderim Tarihi",
  ];

  const rows = items.map((item) => [
    item.title,
    item.presenterName,
    item.presenterEmail,
    item.statusLabel,
    item.submissionLanguage,
    item.presentationMode,
    item.galaLabel,
    item.tripLabel,
    item.submittedAt ?? "",
  ]);

  return [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
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
      status: {
        not: "DRAFT",
      },
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
          content: true,
        },
      },
      statusHistory: {
        orderBy: {
          changedAt: "desc",
        },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          changedAt: true,
        },
      },
    },
  });

  if (!submission) {
    return null;
  }

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
  return prisma.submissionFile.findFirst({
    where: {
      submissionId,
      submission: {
        status: {
          not: "DRAFT",
        },
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

const MANAGEABLE_STATUSES: SubmissionStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
];

export function isManageableSubmissionStatus(value: string): value is SubmissionStatus {
  return MANAGEABLE_STATUSES.includes(value as SubmissionStatus);
}

export async function updateAdminSubmissionStatus(input: {
  submissionId: string;
  status: SubmissionStatus;
  note?: string;
}) {
  const current = await prisma.submission.findFirst({
    where: {
      id: input.submissionId,
      congress: {
        slug: EYI_CONGRESS_SLUG,
      },
      status: {
        not: "DRAFT",
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!current) {
    return null;
  }

  const note = input.note?.trim() ?? "";
  if (current.status === input.status) {
    return {
      submission: await getAdminSubmissionDetail(current.id),
      changed: false,
      previousStatus: current.status,
    };
  }

  await prisma.$transaction([
    prisma.submission.update({
      where: {
        id: current.id,
      },
      data: {
        status: input.status,
      },
    }),
    prisma.submissionStatusHistory.create({
      data: {
        submissionId: current.id,
        fromStatus: current.status,
        toStatus: input.status,
        note: note || null,
      },
    }),
  ]);

  return {
    submission: await getAdminSubmissionDetail(current.id),
    changed: true,
    previousStatus: current.status,
  };
}
