import { requireEditableDraft, configuredParticipation, submissionRules } from "@/integrations/congress/submission-rules";
import { apiRoute } from "@/platform/http";
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
  await requireEditableDraft(id);
  if (await isSubmissionClosedForDraft(id)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  const body = configuredParticipation(await request.json(), await submissionRules(id));

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

export const PATCH = apiRoute(handlePATCH);
