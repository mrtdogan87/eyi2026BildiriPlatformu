import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getSubmissionSnapshot,
  validateParticipation,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";
import type { SubmissionParticipationInput } from "@/types/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }

  const body = (await request.json()) as SubmissionParticipationInput;
  const errors = validateParticipation(body, t);

  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  await prisma.submission.update({
    where: { id },
    data: {
      presentationMode: body.presentationMode,
      audience: body.audience,
    },
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
