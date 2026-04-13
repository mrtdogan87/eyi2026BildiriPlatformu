import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  findPresenter,
  getSubmissionSnapshot,
  resolveSubmissionPayment,
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
      paymentCategory: true,
      paymentPeriod: true,
      paymentAmount: true,
      paymentDescription: true,
      authors: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          fullName: true,
          isPresenter: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  if (!submission.presentationMode) {
    return NextResponse.json({ error: "Önce katılım bilgilerini tamamlamalısınız." }, { status: 400 });
  }

  const presenter = findPresenter(submission.authors);
  if (!presenter?.fullName.trim()) {
    return NextResponse.json({ error: "Önce sunan yazar bilgilerini tamamlamalısınız." }, { status: 400 });
  }

  let resolved;
  try {
    resolved = resolveSubmissionPayment({
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
    submission.paymentCategory !== resolved.paymentCategory ||
    submission.paymentPeriod !== resolved.paymentPeriod ||
    submission.paymentAmount !== resolved.paymentAmount ||
    submission.paymentDescription !== resolved.paymentDescription;

  if (paymentChanged) {
    await prisma.$transaction([
      prisma.submissionPaymentReceipt.deleteMany({
        where: {
          submissionId: id,
        },
      }),
      prisma.submission.update({
        where: { id },
        data: {
          paymentCategory: resolved.paymentCategory,
          paymentPeriod: resolved.paymentPeriod,
          paymentAmount: resolved.paymentAmount,
          paymentDescription: resolved.paymentDescription,
        },
      }),
    ]);
  } else {
    await prisma.submission.update({
      where: { id },
      data: {
        paymentCategory: resolved.paymentCategory,
        paymentPeriod: resolved.paymentPeriod,
        paymentAmount: resolved.paymentAmount,
        paymentDescription: resolved.paymentDescription,
      },
    });
  }

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
