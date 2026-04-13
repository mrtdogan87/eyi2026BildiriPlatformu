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
    },
  });

  const shouldResetPayment = current?.presentationMode && current.presentationMode !== normalized.presentationMode;

  await prisma.submission.update({
    where: { id },
    data: {
      presentationMode: normalized.presentationMode,
      galaAttendance: normalized.galaAttendance,
      galaAttendeeCount: normalized.galaAttendeeCount,
      tripAttendance: normalized.tripAttendance,
      tripAttendeeCount: normalized.tripAttendeeCount,
      ...(shouldResetPayment
        ? {
            paymentCategory: null,
            paymentPeriod: null,
            paymentAmount: null,
            paymentDescription: null,
          }
        : {}),
    },
  });

  if (shouldResetPayment) {
    await prisma.submissionPaymentReceipt.deleteMany({
      where: {
        submissionId: id,
      },
    });
  }

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
