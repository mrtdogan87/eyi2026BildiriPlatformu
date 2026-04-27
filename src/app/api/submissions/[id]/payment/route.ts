import { NextResponse } from "next/server";
import {
  getCongressWithTiers,
  resolveSubmissionPayment,
} from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  findPresenter,
  getSubmissionSnapshot,
} from "@/lib/submission";
import type { SubmissionPaymentInput } from "@/types/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslağa erişim izniniz yok." }, { status: 403 });
  }

  const body = (await request.json()) as SubmissionPaymentInput;
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      presentationMode: true,
      paymentTierId: true,
      paymentAmount: true,
      paymentCurrency: true,
      paymentDescription: true,
      attendeeRole: true,
      audience: true,
      onlinePaperCount: true,
      paymentPeriod: true,
      congress: {
        select: { slug: true },
      },
      authors: {
        orderBy: { sortOrder: "asc" },
        select: { fullName: true, isPresenter: true },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  if (!submission.presentationMode) {
    return NextResponse.json(
      { error: "Önce katılım bilgilerini tamamlamalısınız." },
      { status: 400 },
    );
  }

  const presenter = findPresenter(submission.authors);
  if (!presenter?.fullName.trim()) {
    return NextResponse.json(
      { error: "Önce sunan yazar bilgilerini tamamlamalısınız." },
      { status: 400 },
    );
  }

  const congress = await getCongressWithTiers(submission.congress.slug);
  if (!congress) {
    return NextResponse.json({ error: "Kongre bilgisi bulunamadı." }, { status: 404 });
  }

  let resolved;
  try {
    resolved = resolveSubmissionPayment({
      congress,
      payment: body,
      presentationMode: submission.presentationMode,
      presenterName: presenter.fullName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ücret bilgileri kaydedilemedi." },
      { status: 400 },
    );
  }

  const paymentChanged =
    submission.paymentTierId !== resolved.tier.id ||
    submission.paymentAmount !== resolved.paymentAmount ||
    submission.paymentCurrency !== resolved.paymentCurrency ||
    submission.paymentDescription !== resolved.paymentDescription;

  const updateData = {
    paymentTierId: resolved.tier.id,
    attendeeRole: resolved.input.attendeeRole,
    audience: resolved.input.audience,
    onlinePaperCount: resolved.input.onlinePaperCount,
    paymentPeriod: resolved.paymentPeriod,
    paymentAmount: resolved.paymentAmount,
    paymentCurrency: resolved.paymentCurrency,
    paymentDescription: resolved.paymentDescription,
  };

  if (paymentChanged) {
    await prisma.$transaction([
      prisma.submissionPaymentReceipt.deleteMany({ where: { submissionId: id } }),
      prisma.submission.update({ where: { id }, data: updateData }),
    ]);
  } else {
    await prisma.submission.update({ where: { id }, data: updateData });
  }

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
