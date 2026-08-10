import { NextResponse } from "next/server";
import {
  consumeDraftToken,
  getSubmissionSnapshot,
  isSubmissionClosedForDraft,
  setDraftAccessCookie,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

export async function POST(request: Request) {
  const { t } = await getServerT();
  const body = (await request.json()) as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: t("api.verifyLinkMissing") }, { status: 400 });
  }

  const submission = await consumeDraftToken(body.token);
  if (!submission) {
    return NextResponse.json({ error: t("api.invalidOrExpiredLink") }, { status: 400 });
  }

  if (await isSubmissionClosedForDraft(submission.id)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  await setDraftAccessCookie(submission.id);

  return NextResponse.json({
    submission: await getSubmissionSnapshot(submission.id),
  });
}
