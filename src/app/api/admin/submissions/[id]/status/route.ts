import { NextResponse } from "next/server";
import {
  ADMIN_DEFAULT_CONGRESS_SLUG,
  assertAdminApiAccess,
  isManageableSubmissionStatus,
  mapSubmissionStatus,
  updateAdminSubmissionStatus,
} from "@/lib/admin";
import { isEmailConfigured, sendSubmissionStatusEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/submission";

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
    isEmailConfigured()
  ) {
    const notifyStatus: "ACCEPTED" | "REJECTED" = body.status;
    const emailLocale: "tr" | "en" =
      submission.submission.submissionLanguage === "EN" ? "en" : "tr";
    const paperTitle =
      submission.submission.submissionLanguage === "EN"
        ? submission.submission.titleEn || submission.submission.titleTr || "Bildiri"
        : submission.submission.titleTr || submission.submission.titleEn || "Bildiri";
    // Tüm yazarlara bildir (taslak sahibi + tüm yazar e-postaları, tekilleştirilmiş).
    const recipients = [
      ...new Set(
        [
          submission.submission.draftOwnerEmail,
          ...submission.submission.authors.map((author) => author.email),
        ]
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const registrationUrl =
      notifyStatus === "ACCEPTED"
        ? `${getBaseUrl()}/${ADMIN_DEFAULT_CONGRESS_SLUG}/kayit`
        : undefined;

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        sendSubmissionStatusEmail({
          to: recipient,
          congressName: "EYİ 2026 / ISEOS 2026",
          congressSlug: ADMIN_DEFAULT_CONGRESS_SLUG,
          paperTitle,
          statusLabel: mapSubmissionStatus(notifyStatus),
          status: notifyStatus,
          registrationUrl,
          locale: emailLocale,
        }),
      ),
    );
    if (results.some((result) => result.status === "rejected")) {
      warning = "Durum güncellendi ancak bazı bildirim e-postaları gönderilemedi.";
    }
  }

  return NextResponse.json({
    submission: submission.submission,
    warning,
  });
}
