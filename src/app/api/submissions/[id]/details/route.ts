import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getSubmissionSnapshot,
  isSubmissionClosedForDraft,
  validateDetails,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";
import type { SubmissionDetailsInput } from "@/types/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }
  if (await isSubmissionClosedForDraft(id)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  const body = (await request.json()) as SubmissionDetailsInput;
  const errors = validateDetails(body, t);
  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  await prisma.submission.update({
    where: { id },
    data: {
      submissionLanguage: body.submissionLanguage,
      titleTr: body.titleTr.trim(),
      titleEn: body.titleEn.trim(),
      abstractTr: body.abstractTr.trim(),
      abstractEn: body.abstractEn.trim(),
      keywordsTr: body.keywordsTr.trim(),
      keywordsEn: body.keywordsEn.trim(),
    },
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
