import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getSubmissionSnapshot,
  normalizeParticipation,
  validateParticipation,
} from "@/lib/submission";
import type { SubmissionParticipationInput } from "@/types/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslağa erişim izniniz yok." }, { status: 403 });
  }

  const body = (await request.json()) as SubmissionParticipationInput;
  const normalized = normalizeParticipation(body);
  const errors = validateParticipation(normalized);

  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  const current = await prisma.submission.findUnique({
    where: { id },
    select: {
      presentationMode: true,
      congress: {
        select: {
          galaFeeAmount: true,
          galaFeeCurrency: true,
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  const shouldResetPayment =
    current.presentationMode && current.presentationMode !== normalized.presentationMode;

  await prisma.submission.update({
    where: { id },
    data: {
      presentationMode: normalized.presentationMode,
      galaAttendance: normalized.galaAttendance,
      galaAttendeeCount: normalized.galaAttendeeCount,
      galaFeeAmount: normalized.galaAttendance ? current.congress.galaFeeAmount : null,
      galaFeeCurrency: normalized.galaAttendance ? current.congress.galaFeeCurrency : null,
      tripAttendance: normalized.tripAttendance,
      tripAttendeeCount: normalized.tripAttendeeCount,
      ...(shouldResetPayment
        ? {
            paymentTierId: null,
            attendeeRole: null,
            audience: null,
            onlinePaperCount: null,
            paymentPeriod: null,
            paymentAmount: null,
            paymentCurrency: null,
            paymentDescription: null,
          }
        : {}),
    },
  });

  if (shouldResetPayment) {
    await prisma.submissionPaymentReceipt.deleteMany({ where: { submissionId: id } });
  }

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
