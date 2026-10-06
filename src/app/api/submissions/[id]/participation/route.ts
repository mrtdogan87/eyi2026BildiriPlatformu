import { lockEditableSubmission, configuredParticipation } from "@/integrations/congress/submission-rules";
import { effectiveConfiguration } from "@/modules/congress/configuration";
import { apiRoute, AccessError } from "@/platform/http";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getSubmissionSnapshot,
  isSubmissionClosedForDraft,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }
  if (await isSubmissionClosedForDraft(id)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  const raw: unknown = await request.json();
  await prisma.$transaction(async tx => {
    const submission = await lockEditableSubmission(tx, id);
    if (await isSubmissionClosedForDraft(id)) throw new AccessError(403, t("api.submissionsClosed"));
    const body = configuredParticipation(raw, effectiveConfiguration(submission.congress.configuration));
    await tx.submission.update({ where: { id }, data: body });
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}

export const PATCH = apiRoute(handlePATCH);
