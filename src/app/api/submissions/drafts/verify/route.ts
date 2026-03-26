import { NextResponse } from "next/server";
import { consumeDraftToken, getSubmissionSnapshot, setDraftAccessCookie } from "@/lib/submission";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: "Token zorunludur." }, { status: 400 });
  }

  const submission = await consumeDraftToken(body.token);
  if (!submission) {
    return NextResponse.json({ error: "Gecersiz veya suresi dolmus link." }, { status: 400 });
  }

  await setDraftAccessCookie(submission.id);

  return NextResponse.json({
    submission: await getSubmissionSnapshot(submission.id),
  });
}
