import { requireModule } from "@/platform/context";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import {
  consumeRegistrationToken,
  inspectRegistrationToken,
  setRegistrationCookie,
} from "@/lib/registration";
import { getServerT } from "@/lib/i18n/server";

async function handlePOST(request: Request) {
  const { t } = await getServerT();
  const body = (await request.json().catch(() => ({}))) as { token?: string; congressSlug?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: t("api.verifyLinkMissing") }, { status: 400 });
  }

  const inspected = await inspectRegistrationToken(token);
  if (body.congressSlug && inspected?.congress.slug !== body.congressSlug) return NextResponse.json({ error: t("api.regLinkInvalid") }, { status: 400 });
  if (inspected) await requireModule(inspected.congressId, "REGISTRATION");
  const record = await consumeRegistrationToken(token);
  if (!record) {
    return NextResponse.json({ error: t("api.regLinkInvalid") }, { status: 400 });
  }

  await requireModule(record.congressId, "REGISTRATION");
  await setRegistrationCookie(record.email, record.congressId, undefined, record.id);

  return NextResponse.json({
    email: record.email,
    congressSlug: record.congress.slug,
  });
}

export const POST = apiRoute(handlePOST);
