import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  isManageableSubmissionStatus,
  mapSubmissionStatus,
  updateAdminSubmissionStatus,
} from "@/lib/admin";
import { isResendConfigured, sendSubmissionStatusEmail } from "@/lib/email";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const body = (await request.json()) as { status?: string; note?: string };
  if (!body.status || !isManageableSubmissionStatus(body.status)) {
    return NextResponse.json({ error: "Geçerli bir durum seçmelisiniz." }, { status: 400 });
  }

  const { id } = await params;
  const submission = await updateAdminSubmissionStatus({
    submissionId: id,
    status: body.status,
    note: body.note,
  });

  if (!submission?.submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  let warning: string | undefined;

  if (
    submission.changed &&
    (body.status === "ACCEPTED" || body.status === "REJECTED") &&
    isResendConfigured()
  ) {
    const paperTitle =
      submission.submission.submissionLanguage === "EN"
        ? submission.submission.titleEn || submission.submission.titleTr || "Bildiri"
        : submission.submission.titleTr || submission.submission.titleEn || "Bildiri";

    try {
      await sendSubmissionStatusEmail({
        to: submission.submission.draftOwnerEmail,
        congressName: "EYİ 2026",
        paperTitle,
        statusLabel: mapSubmissionStatus(body.status),
        note: body.note,
      });
    } catch {
      warning = "Durum güncellendi ancak bildirim e-postası gönderilemedi.";
    }
  }

  return NextResponse.json({
    submission: submission.submission,
    warning,
  });
}
