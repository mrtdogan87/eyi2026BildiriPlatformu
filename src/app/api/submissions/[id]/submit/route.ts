import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  clearDraftAccessCookie,
  countSubmittedEmailUsage,
  getSubmissionSnapshot,
  normalizeParticipation,
  validateAuthors,
  validateDetails,
  validateParticipation,
} from "@/lib/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  const body = (await _request.json()) as {
    declarations?: {
      accuracy?: boolean;
      originality?: boolean;
      submissionLimit?: boolean;
      coauthorApproval?: boolean;
      personalDataConsent?: boolean;
      registrationPresentationConsent?: boolean;
    };
  };

  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslağa erişim izniniz yok." }, { status: 403 });
  }

  const declarations = body.declarations;
  if (
    !declarations?.accuracy ||
    !declarations.originality ||
    !declarations.submissionLimit ||
    !declarations.coauthorApproval ||
    !declarations.personalDataConsent ||
    !declarations.registrationPresentationConsent
  ) {
    return NextResponse.json(
      { error: "Bildirinizi gönderebilmek için tüm beyanları onaylamalısınız." },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      authors: true,
      file: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  const detailsErrors = validateDetails({
    submissionLanguage: (submission.submissionLanguage ?? "TR") as "TR" | "EN",
    titleTr: submission.titleTr ?? "",
    titleEn: submission.titleEn ?? "",
    abstractTr: submission.abstractTr ?? "",
    abstractEn: submission.abstractEn ?? "",
    keywordsTr: submission.keywordsTr ?? "",
    keywordsEn: submission.keywordsEn ?? "",
  });

  if (detailsErrors.length) {
    return NextResponse.json({ error: detailsErrors[0] }, { status: 400 });
  }

  const authorErrors = validateAuthors(
    submission.authors.map((author) => ({
      fullName: author.fullName,
      email: author.email,
      institution: author.institution ?? "",
      country: author.country ?? "",
      isPresenter: author.isPresenter,
    })),
  );

  if (authorErrors.length) {
    return NextResponse.json({ error: authorErrors[0] }, { status: 400 });
  }

  const participationErrors = validateParticipation(
    normalizeParticipation({
      presentationMode: (submission.presentationMode ?? "IN_PERSON") as "ONLINE" | "IN_PERSON",
      galaAttendance: submission.galaAttendance,
      galaAttendeeCount: submission.galaAttendeeCount,
      tripAttendance: submission.tripAttendance,
      tripAttendeeCount: submission.tripAttendeeCount,
    }),
  );

  if (participationErrors.length) {
    return NextResponse.json({ error: participationErrors[0] }, { status: 400 });
  }

  if (!submission.file) {
    return NextResponse.json({ error: "DOCX dosyası zorunludur." }, { status: 400 });
  }

  const usage = await countSubmittedEmailUsage(
    submission.congressId,
    submission.authors.map((author) => author.email),
  );

  const blockedEmail = submission.authors.find((author) => (usage[author.email] ?? 0) >= 2)?.email;
  if (blockedEmail) {
    return NextResponse.json(
      { error: `${blockedEmail} adresi daha önce iki kez kullanıldığı için yeni gönderim yapamaz.` },
      { status: 400 },
    );
  }

  await prisma.submission.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  await clearDraftAccessCookie();

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
