import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  findApplicableTier,
  getCongressBankInfo,
  getCongressGalaInfo,
  getCongressTripInfo,
  getCongressWithTiers,
  getCurrentPaymentPeriod,
  isPaymentClosed,
  tierToOption,
} from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/submission";
import type {
  AudienceType,
  PresentationMode,
  RegistrationConfig,
  RegistrationContext,
  RegistrationLineItem,
  RegistrationQuote,
} from "@/types/submission";
import type { Congress, PaymentTier, Submission } from "@prisma/client";

const REGISTRATION_COOKIE = "registration_access";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const TOKEN_GRACE_WINDOW_MS = 5 * 60 * 1000;

function getSessionSecret() {
  return process.env.DRAFT_SESSION_SECRET ?? "development-secret";
}

function signSession(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateAccessToken() {
  return randomBytes(24).toString("hex");
}

export function buildRegistrationMagicLink(slug: string, token: string) {
  return `${getBaseUrl()}/${slug}/kayit/devam?token=${token}`;
}

export async function issueRegistrationLink(input: {
  congressId: string;
  congressSlug: string;
  email: string;
}) {
  const now = new Date();
  const token = generateAccessToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  await prisma.registrationAccessToken.updateMany({
    where: {
      congressId: input.congressId,
      email: input.email,
      expiresAt: { gt: now },
    },
    data: { expiresAt: now },
  });

  await prisma.registrationAccessToken.create({
    data: {
      congressId: input.congressId,
      email: input.email,
      tokenHash,
      expiresAt,
    },
  });

  const magicLink = buildRegistrationMagicLink(input.congressSlug, token);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[registration-link:${input.email}] ${magicLink}`);
  }

  return magicLink;
}

async function findTokenRecord(token: string, now: Date) {
  const tokenHash = hashToken(token);
  return prisma.registrationAccessToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    include: { congress: true },
  });
}

function isTokenUsable(usedAt: Date | null, now: Date) {
  return !usedAt || now.getTime() - usedAt.getTime() <= TOKEN_GRACE_WINDOW_MS;
}

export async function inspectRegistrationToken(token: string) {
  const now = new Date();
  const record = await findTokenRecord(token, now);
  if (!record || !isTokenUsable(record.usedAt, now)) return null;
  return record;
}

export async function consumeRegistrationToken(token: string) {
  const now = new Date();
  const record = await findTokenRecord(token, now);
  if (!record || !isTokenUsable(record.usedAt, now)) return null;

  if (!record.usedAt) {
    await prisma.registrationAccessToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });
  }

  return record;
}

function cookieValue(email: string, congressId: string) {
  const raw = `${email.toLowerCase()}|${congressId}`;
  const signature = signSession(raw);
  return `${raw}|${signature}`;
}

export async function setRegistrationCookie(email: string, congressId: string) {
  const cookieStore = await cookies();
  cookieStore.set(REGISTRATION_COOKIE, cookieValue(email, congressId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearRegistrationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(REGISTRATION_COOKIE);
}

export async function readRegistrationSession(): Promise<{
  email: string;
  congressId: string;
} | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(REGISTRATION_COOKIE)?.value;
  if (!value) return null;

  const parts = value.split("|");
  if (parts.length !== 3) return null;

  const [email, congressId, signature] = parts;
  const expected = signSession(`${email}|${congressId}`);
  if (!signature || expected.length !== signature.length) return null;

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return { email, congressId };
}

export type CongressWithTiers = Congress & { paymentTiers: PaymentTier[] };

function toRegistrationConfig(
  congress: CongressWithTiers,
): RegistrationConfig {
  return {
    congressName: congress.name,
    congressSlug: congress.slug,
    earlyDeadline: congress.earlyDeadline?.toISOString() ?? null,
    lateDeadline: congress.lateDeadline?.toISOString() ?? null,
    currentPeriod: getCurrentPaymentPeriod(congress),
    bank: getCongressBankInfo(congress),
    gala: getCongressGalaInfo(congress),
    trip: getCongressTripInfo(congress),
    tiers: congress.paymentTiers.filter((tier) => tier.active).map(tierToOption),
  };
}

type AcceptedPaperRow = Pick<
  Submission,
  "id" | "titleTr" | "titleEn" | "submissionLanguage" | "presentationMode" | "audience" | "submittedAt"
> & {
  paperItem: { paidAt: Date | null; registration: { paidAt: Date | null } } | null;
};

export async function getRegistrationContext(input: {
  email: string;
  congressSlug: string;
}): Promise<RegistrationContext | null> {
  const congress = await getCongressWithTiers(input.congressSlug);
  if (!congress) return null;

  const normalizedEmail = input.email.toLowerCase();
  const submissions = await prisma.submission.findMany({
    where: {
      congressId: congress.id,
      status: "ACCEPTED",
      OR: [
        { draftOwnerEmail: normalizedEmail },
        { authors: { some: { email: normalizedEmail } } },
      ],
    },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      titleTr: true,
      titleEn: true,
      submissionLanguage: true,
      presentationMode: true,
      audience: true,
      submittedAt: true,
      paperItem: {
        include: { registration: true },
      },
    },
  });

  const acceptedPapers = (submissions as unknown as AcceptedPaperRow[]).map((submission) => {
    const language = submission.submissionLanguage ?? "TR";
    return {
      submissionId: submission.id,
      title:
        language === "EN"
          ? (submission.titleEn || submission.titleTr || "-")
          : (submission.titleTr || submission.titleEn || "-"),
      presentationMode: submission.presentationMode,
      audience: submission.audience,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      alreadyPaid: Boolean(submission.paperItem?.registration?.paidAt),
      paidAt: submission.paperItem?.registration?.paidAt?.toISOString() ?? null,
    };
  });

  return {
    email: input.email,
    congressSlug: input.congressSlug,
    acceptedPapers,
    config: toRegistrationConfig(congress),
  };
}

export type RegistrationCalculationInput = {
  email: string;
  presenterName: string;
  congress: CongressWithTiers;
  selectedPapers: Array<{
    submissionId: string;
    title: string;
    audience: AudienceType | null;
  }>;
  listenerEnabled: boolean;
  listenerPresentationMode: PresentationMode | null;
  listenerAudience: AudienceType | null;
  galaAttendance: boolean;
  galaAttendeeCount: number;
  tripAttendance: boolean;
  tripAttendeeCount: number;
  now?: Date;
};

export type CalculatedRegistration = {
  quote: RegistrationQuote;
  paperAssignments: Array<{
    submissionId: string;
    paperOrder: 1 | 2;
    amount: number;
    currency: string;
    tierId: string;
  }>;
  listenerLine: {
    amount: number;
    currency: string;
    tierId: string | null;
  } | null;
  galaLine: {
    amount: number;
    currency: string;
  } | null;
};

export function calculateRegistration(input: RegistrationCalculationInput): CalculatedRegistration {
  const now = input.now ?? new Date();
  if (isPaymentClosed(input.congress, now)) {
    throw new Error("Kayıt süresi sona erdiği için ödeme alınmıyor.");
  }

  const period = getCurrentPaymentPeriod(input.congress, now);
  if (!period) {
    throw new Error("Kayıt süresi sona erdiği için ödeme alınmıyor.");
  }

  const tiers = input.congress.paymentTiers;
  const lines: RegistrationLineItem[] = [];
  const paperAssignments: CalculatedRegistration["paperAssignments"] = [];
  let total = 0;
  let currency = "TRY";

  for (const [index, paper] of input.selectedPapers.entries()) {
    if (!paper.audience) {
      throw new Error("Bildiriler için akademik statü bilgisi eksik.");
    }
    const order = index === 0 ? 1 : 2;
    const tier = findApplicableTier(tiers, {
      presentationMode: "IN_PERSON",
      attendeeRole: "PRESENTER",
      audience: paper.audience,
      paperOrder: order,
      period,
    });
    if (!tier) {
      throw new Error(`Bildiri için ücret tanımı bulunamadı (${paper.title}).`);
    }
    paperAssignments.push({
      submissionId: paper.submissionId,
      paperOrder: order as 1 | 2,
      amount: tier.amount,
      currency: tier.currency,
      tierId: tier.id,
    });
    lines.push({
      key: `paper:${paper.submissionId}`,
      label: paper.title,
      amount: tier.amount,
      currency: tier.currency,
      detail: order === 1 ? "Birinci Bildiri" : "İkinci Bildiri (%50 İndirim)",
    });
    total += tier.amount;
    currency = tier.currency;
  }

  let listenerLine: CalculatedRegistration["listenerLine"] = null;
  if (input.listenerEnabled) {
    if (!input.listenerPresentationMode) {
      throw new Error("Dinleyici katılımı için sunum şekli seçmelisiniz.");
    }
    if (input.listenerPresentationMode === "IN_PERSON" && !input.listenerAudience) {
      throw new Error("Yüz yüze dinleyici için akademik statü seçmelisiniz.");
    }

    const tier = findApplicableTier(tiers, {
      presentationMode: input.listenerPresentationMode,
      attendeeRole: "LISTENER",
      audience: input.listenerAudience,
      paperOrder: null,
      period: input.listenerPresentationMode === "IN_PERSON" ? period : null,
    });
    if (!tier) {
      throw new Error("Dinleyici katılımı için ücret tanımı bulunamadı.");
    }
    listenerLine = {
      amount: tier.amount,
      currency: tier.currency,
      tierId: tier.id,
    };
    lines.push({
      key: "listener",
      label:
        input.listenerPresentationMode === "IN_PERSON"
          ? "Yüz Yüze Dinleyici"
          : "Çevrim İçi Dinleyici",
      amount: tier.amount,
      currency: tier.currency,
      detail: tier.amount === 0 ? "Ücretsiz" : undefined,
    });
    total += tier.amount;
    if (!currency || tier.amount > 0) currency = tier.currency;
  }

  let galaLine: CalculatedRegistration["galaLine"] = null;
  if (input.galaAttendance && input.galaAttendeeCount > 0) {
    const galaAmount = input.congress.galaFeeAmount * input.galaAttendeeCount;
    galaLine = {
      amount: galaAmount,
      currency: input.congress.galaFeeCurrency,
    };
    lines.push({
      key: "gala",
      label: `Gala Yemeği · ${input.galaAttendeeCount} kişi`,
      amount: galaAmount,
      currency: input.congress.galaFeeCurrency,
      detail: `Kişi başı ${input.congress.galaFeeAmount} ${input.congress.galaFeeCurrency}`,
    });
    // Gala is a separate currency potentially (EUR); do not add to main TRY total.
  }

  if (input.tripAttendance) {
    lines.push({
      key: "trip",
      label: `Gezi · ${input.tripAttendeeCount} kişi`,
      amount: 0,
      currency: "TRY",
      detail: input.congress.tripNote || "Ücretsiz",
    });
  }

  const descriptionParts: string[] = [input.presenterName];
  if (paperAssignments.length === 1) {
    descriptionParts.push("1 Bildiri");
  } else if (paperAssignments.length > 1) {
    descriptionParts.push(`${paperAssignments.length} Bildiri`);
  }
  if (listenerLine) {
    descriptionParts.push("Dinleyici");
  }
  descriptionParts.push(period === "EARLY" ? "Erken Kayıt" : "Geç Kayıt");

  return {
    quote: {
      lines,
      totalAmount: total,
      currency,
      paymentPeriod: period,
      description: descriptionParts.join(" · "),
      presenterName: input.presenterName,
    },
    paperAssignments,
    listenerLine,
    galaLine,
  };
}

export async function getRegistrationByEmail(input: {
  congressId: string;
  email: string;
}) {
  return prisma.registration.findFirst({
    where: { congressId: input.congressId, email: input.email.toLowerCase() },
    orderBy: { updatedAt: "desc" },
    include: {
      paperItems: { include: { submission: true } },
      receipt: true,
    },
  });
}
