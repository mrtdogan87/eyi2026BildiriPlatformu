import { configuredDetails, configuredAuthors, configuredParticipation, submissionRules } from "@/integrations/congress/submission-rules";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  clearDraftAccessCookie,
  countSubmittedEmailUsage,
  isSubmissionClosedForDraft,
  findPresenter,
  getSubmissionSnapshot,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";
import { isEmailConfigured, sendSubmissionReceivedEmail } from "@/lib/email";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handlePOST(_request: Request, { params }: RouteProps) {
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
  if (await isSubmissionClosedForDraft(id, "SUBMIT")) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
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
    include: { authors: true, file: true, congress: true },
  });

  if (!submission) {
    return NextResponse.json({ error: t("api.submissionNotFound") }, { status: 404 });
  }

  const rules = await submissionRules(id);
  if (submission.status !== 'DRAFT') return NextResponse.json({ error: 'Bildiri zaten gönderilmiş.' }, { status: 409 });
  configuredDetails({ submissionLanguage: submission.submissionLanguage, titleTr: submission.titleTr ?? '', titleEn: submission.titleEn ?? '', abstractTr: rules.fields.abstract === 'HIDDEN' ? '' : submission.abstractTr ?? '', abstractEn: rules.fields.abstract === 'HIDDEN' ? '' : submission.abstractEn ?? '', keywordsTr: rules.fields.keywords === 'HIDDEN' ? '' : submission.keywordsTr ?? '', keywordsEn: rules.fields.keywords === 'HIDDEN' ? '' : submission.keywordsEn ?? '' }, rules);
  configuredAuthors(submission.authors.map(author => ({ fullName: author.fullName, title: rules.fields.authorTitle === 'HIDDEN' ? '' : author.title ?? '', email: author.email, institution: rules.fields.authorInstitution === 'HIDDEN' ? '' : author.institution ?? '', country: rules.fields.authorCountry === 'HIDDEN' ? '' : author.country ?? '', isPresenter: author.isPresenter })), rules);
  configuredParticipation({ presentationMode: rules.fields.presentationMode === 'HIDDEN' ? null : submission.presentationMode, audience: rules.fields.audience === 'HIDDEN' ? null : submission.audience }, rules);
  const presenterAuthor = findPresenter(submission.authors);

  if (!presenterAuthor?.fullName.trim()) {
    return NextResponse.json({ error: t("api.presenterNotFound") }, { status: 400 });
  }

  if (rules.fields.file === "REQUIRED" && !submission.file) {
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

  const changed = await prisma.submission.updateMany({
    where: { id, status:'DRAFT' },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });
  if (!changed.count) return NextResponse.json({ error:'Bildiri zaten gönderilmiş.' }, { status:409 });

  // Tüm yazarlara "bildiriniz alındı" bildirimi (bildirinin dilinde). Hata gönderimi engellemez.
  if (isEmailConfigured()) {
    const emailLocale: "tr" | "en" = submission.submissionLanguage === "EN" ? "en" : "tr";
    const paperTitle =
      submission.submissionLanguage === "EN"
        ? submission.titleEn || submission.titleTr || "Bildiri"
        : submission.titleTr || submission.titleEn || "Bildiri";
    const recipients = [
      ...new Set(
        submission.authors.map((author) => author.email.trim().toLowerCase()).filter(Boolean),
      ),
    ];
    try {
      await Promise.allSettled(
        recipients.map((recipient) =>
          sendSubmissionReceivedEmail({
            to: recipient,
            congressName: submission.congress.name,
            paperTitle,
            locale: emailLocale,
          }),
        ),
      );
    } catch {
      // bildirim hatası bildirinin gönderimini etkilemez
    }
  }

  await clearDraftAccessCookie();

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}

export const POST = apiRoute(handlePOST);
