import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import {
  consumeDraftToken,
  inspectDraftToken,
  getSubmissionSnapshot,
  canResumeDraft,
  setDraftAccessCookie,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

async function handlePOST(request: Request) {
  const { t } = await getServerT();
  const body = (await request.json()) as { token?: string; congressSlug?: string };
  if (!body.token) {
    return NextResponse.json({ error: t("api.verifyLinkMissing") }, { status: 400 });
  }

  const inspected = await inspectDraftToken(body.token);
  if (body.congressSlug && inspected?.congress.slug !== body.congressSlug) return NextResponse.json({ error: t("api.invalidOrExpiredLink") }, { status: 400 });
  const submission = await consumeDraftToken(body.token);
  if (!submission) {
    return NextResponse.json({ error: t("api.invalidOrExpiredLink") }, { status: 400 });
  }

  if (!(await canResumeDraft(submission.id))) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  await setDraftAccessCookie(submission.id);

  return NextResponse.json({
    submission: await getSubmissionSnapshot(submission.id),
  });
}

export const POST = apiRoute(handlePOST);
