import { NextResponse } from "next/server";
import { consumeDraftToken, getBaseUrl, setDraftAccessCookie } from "@/lib/submission";

type RouteProps = {
  params: Promise<{ congressSlug: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { congressSlug } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const baseUrl = getBaseUrl();

  if (!token) {
    return NextResponse.redirect(new URL(`/${congressSlug}/bildiri-gonder`, baseUrl));
  }

  const submission = await consumeDraftToken(token);
  if (!submission) {
    return NextResponse.redirect(new URL(`/${congressSlug}/bildiri-gonder?invalidToken=1`, baseUrl));
  }

  await setDraftAccessCookie(submission.id);
  return NextResponse.redirect(
    new URL(`/${submission.congress.slug}/bildiri-gonder?draft=${submission.id}`, baseUrl),
  );
}
