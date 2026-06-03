import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  clearDraftAccessCookie,
  countSubmittedEmailUsage,
  findPresenter,
  getSubmissionSnapshot,
  validateAuthors,
  validateDetails,
  validateParticipation,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const body = (await _request.json()) as {
    declarations?: {
      accuracy?: boolean;
      submissionLimit?: boolean;
      coauthorApproval?: boolean;
      personalDataConsent?: boolean;
      registrationPresentationConsent?: boolean;
    };
  };

  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }

  const declarations = body.declarations;
  if (
    !declarations?.accuracy ||
    !declarations.submissionLimit ||
    !declarations.coauthorApproval ||
    !declarations.personalDataConsent ||
    !declarations.registrationPresentationConsent
  ) {
    return NextResponse.json({ error: t("api.declarationsRequired") }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { authors: true, file: true },
  });

  if (!submission) {
    return NextResponse.json({ error: t("api.submissionNotFound") }, { status: 404 });
  }

  const detailsErrors = validateDetails(
    {
      submissionLanguage: (submission.submissionLanguage ?? "TR") as "TR" | "EN",
      titleTr: submission.titleTr ?? "",
      titleEn: submission.titleEn ?? "",
      abstractTr: submission.abstractTr ?? "",
      abstractEn: submission.abstractEn ?? "",
      keywordsTr: submission.keywordsTr ?? "",
      keywordsEn: submission.keywordsEn ?? "",
    },
    t,
  );

  if (detailsErrors.length) {
    return NextResponse.json({ error: detailsErrors[0] }, { status: 400 });
  }

  const authorErrors = validateAuthors(
    submission.authors.map((author) => ({
      fullName: author.fullName,
      title: author.title ?? "",
      email: author.email,
      institution: author.institution ?? "",
      country: author.country ?? "",
      isPresenter: author.isPresenter,
    })),
    t,
  );

  if (authorErrors.length) {
    return NextResponse.json({ error: authorErrors[0] }, { status: 400 });
  }

  // Sunan yazarın e-postası, taslağı başlatan e-posta ile aynı olmalı.
  const presenterAuthor = findPresenter(submission.authors);
  if (
    presenterAuthor &&
    presenterAuthor.email.trim().toLowerCase() !==
      submission.draftOwnerEmail.trim().toLowerCase()
  ) {
    return NextResponse.json({ error: t("api.presenterEmailMismatch") }, { status: 400 });
  }

  if (!submission.presentationMode || !submission.audience) {
    return NextResponse.json({ error: t("api.participationRequiredSubmit") }, { status: 400 });
  }

  const participationErrors = validateParticipation(
    {
      presentationMode: submission.presentationMode,
      audience: submission.audience,
    },
    t,
  );

  if (participationErrors.length) {
    return NextResponse.json({ error: participationErrors[0] }, { status: 400 });
  }

  if (!presenterAuthor?.fullName.trim()) {
    return NextResponse.json({ error: t("api.presenterNotFound") }, { status: 400 });
  }

  if (!submission.file) {
    return NextResponse.json({ error: t("api.docxRequired") }, { status: 400 });
  }

  const usage = await countSubmittedEmailUsage(
    submission.congressId,
    submission.authors.map((author) => author.email),
  );

  const blockedEmail = submission.authors.find((author) => (usage[author.email] ?? 0) >= 2)?.email;
  if (blockedEmail) {
    return NextResponse.json(
      { error: t("api.emailUsedTwice", { email: blockedEmail }) },
      { status: 400 },
    );
  }

  await prisma.submission.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await clearDraftAccessCookie();

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
