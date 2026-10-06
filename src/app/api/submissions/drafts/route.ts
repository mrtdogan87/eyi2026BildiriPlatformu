import { z } from "zod";
import { effectiveConfiguration } from "@/modules/congress/configuration";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const submission = await prisma.submission.findFirst({
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
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`draft-request:${congress.id}:${email}`}))`;
    const existing = await tx.submission.findFirst({ where: { congressId: congress.id, draftOwnerEmail: email, status: 'DRAFT' }, orderBy: { updatedAt: 'desc' } });
    const draft = existing ?? await tx.submission.create({ data: { congressId: congress.id, draftOwnerEmail: email, submissionLanguage } });
    await issueDraftLink(tx, { submissionId: draft.id, email, congressId: congress.id, congressSlug: congress.slug, congressName: congress.name, locale });
  });

  return NextResponse.json({
    message: locale === 'en' ? 'Your access link has been queued for email delivery.' : 'Erişim bağlantınız e-posta gönderim kuyruğuna alındı.',
  });
}

export const POST = apiRoute(handlePOST);
