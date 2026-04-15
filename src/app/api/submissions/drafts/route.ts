import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResendConfigured, sendDraftAccessEmail } from "@/lib/email";
import {
  ensureCongress,
  getSubmissionSnapshot,
  issueDraftLink,
  setDraftAccessCookie,
} from "@/lib/submission";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    congressSlug?: string;
    email?: string;
    submissionLanguage?: "TR" | "EN";
  };

  const email = body.email?.trim().toLowerCase();
  const congressSlug = body.congressSlug?.trim();
  const submissionLanguage = body.submissionLanguage === "EN" ? "EN" : "TR";

  if (!email || !congressSlug) {
    return NextResponse.json({ error: "Kongre ve e-posta zorunludur." }, { status: 400 });
  }

  const congress = await ensureCongress(congressSlug);
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

  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        congressId: congress.id,
        draftOwnerEmail: email,
        submissionLanguage,
      },
    });
  } else {
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        submissionLanguage,
      },
    });
  }

  const magicLink = await issueDraftLink(submission.id, email, congress.slug);
  await setDraftAccessCookie(submission.id);

  const isDevelopmentPreview = process.env.NODE_ENV !== "production" && !isResendConfigured();
  if (isResendConfigured()) {
    try {
      await sendDraftAccessEmail({
        to: email,
        congressName: congress.name,
        magicLink,
      });
    } catch {
      return NextResponse.json(
        { error: "Taslak oluşturuldu ancak e-posta gönderilemedi. Resend API ayarlarını kontrol edin." },
        { status: 500 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Taslak linki göndermek için Resend API ayarları eksik." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: isDevelopmentPreview
      ? "Taslak oluşturuldu. Geliştirme ortamında bağlantı aşağıda önizleme olarak gösteriliyor."
      : "Taslak oluşturuldu. Güvenli giriş linki e-posta adresinize gönderildi.",
    submissionId: submission.id,
    submission: await getSubmissionSnapshot(submission.id),
    magicLinkPreview: isDevelopmentPreview ? magicLink : undefined,
  });
}
