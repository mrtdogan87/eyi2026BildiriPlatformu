import { NextResponse } from "next/server";
import {
  consumeRegistrationToken,
  setRegistrationCookie,
} from "@/lib/registration";
import { getServerT } from "@/lib/i18n/server";

export async function POST(request: Request) {
  const { t } = await getServerT();
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: t("api.verifyLinkMissing") }, { status: 400 });
  }

  const record = await consumeRegistrationToken(token);
  if (!record) {
    return NextResponse.json({ error: t("api.regLinkInvalid") }, { status: 400 });
  }

  await setRegistrationCookie(record.email, record.congressId);

  return NextResponse.json({
    email: record.email,
    congressSlug: record.congress.slug,
  });
}
