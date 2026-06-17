import { NextResponse } from "next/server";
import { isEmailConfigured, sendRegistrationAccessEmail } from "@/lib/email";
import { issueRegistrationLink } from "@/lib/registration";
import { ensureCongress } from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

export async function POST(request: Request) {
  const { t } = await getServerT();
  const body = (await request.json()) as { congressSlug?: string; email?: string };
  const email = body.email?.trim().toLowerCase();
  const congressSlug = body.congressSlug?.trim();

  if (!email || !congressSlug) {
    return NextResponse.json({ error: t("api.congressEmailRequired") }, { status: 400 });
  }

  const congress = await ensureCongress(congressSlug);
  const magicLink = await issueRegistrationLink({
    congressId: congress.id,
    congressSlug: congress.slug,
    email,
  });

  const isDevelopmentPreview = process.env.NODE_ENV !== "production" && !isEmailConfigured();
  if (isEmailConfigured()) {
    try {
      await sendRegistrationAccessEmail({
        to: email,
        congressName: congress.name,
        magicLink,
      });
    } catch {
      return NextResponse.json({ error: t("api.regLinkEmailFailed") }, { status: 500 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: t("api.regResendMissing") }, { status: 500 });
  }

  return NextResponse.json({
    message: isDevelopmentPreview ? t("api.regLinkSentDev") : t("api.regLinkSent"),
    magicLinkPreview: isDevelopmentPreview ? magicLink : undefined,
  });
}
