import { z } from "zod";
import { effectiveConfiguration } from "@/modules/congress/configuration";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendDraftAccessEmail } from "@/lib/email";
import {
  ensureCongress,
  isSubmissionClosed,
  canResumeDraft,
  issueDraftLink,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

async function handlePOST(request: Request) {
  const { t, locale } = await getServerT();
  const parsed = z.object({ congressSlug:z.string().trim().min(1), email:z.string().trim().toLowerCase().email().max(254), submissionLanguage:z.enum(['TR','EN']).default('TR') }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error:t('api.congressEmailRequired') }, { status:400 });
  const { email, congressSlug, submissionLanguage } = parsed.data;

  const congress = await ensureCongress(congressSlug);
  if (!effectiveConfiguration(congress.configuration).languages.includes(submissionLanguage)) return NextResponse.json({ error: "Bu bildiri dili kongrede açık değil." }, { status: 400 });
  let submission = await prisma.submission.findFirst({
    where: {
      congressId: congress.id,
      draftOwnerEmail: email,
      status: "DRAFT",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (submission ? !(await canResumeDraft(submission.id)) : await isSubmissionClosed(congressSlug, email)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }
  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        congressId: congress.id,
        draftOwnerEmail: email,
        submissionLanguage,
      },
    });
  }

  const magicLink = await issueDraftLink(submission.id, email, congress.slug);

  const isDevelopmentPreview = process.env.NODE_ENV !== "production" && !isEmailConfigured();
  if (isEmailConfigured()) {
    try {
      await sendDraftAccessEmail({
        to: email,
        congressName: congress.name,
        magicLink,
        locale,
      });
    } catch {
      return NextResponse.json({ error: t("api.draftEmailFailed") }, { status: 500 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: t("api.draftResendMissing") }, { status: 500 });
  }

  return NextResponse.json({
    message: isDevelopmentPreview ? t("api.draftCreatedDev") : t("api.draftCreated"),
    magicLinkPreview: isDevelopmentPreview ? magicLink : undefined,
  });
}

export const POST = apiRoute(handlePOST);
