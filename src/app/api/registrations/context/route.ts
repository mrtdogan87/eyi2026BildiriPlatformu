import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRegistrationContext,
  readRegistrationSession,
} from "@/lib/registration";
import { getServerT } from "@/lib/i18n/server";

export async function GET() {
  const { locale, t } = await getServerT();
  const session = await readRegistrationSession();
  if (!session) {
    return NextResponse.json({ error: t("api.sessionNotFound") }, { status: 401 });
  }

  const congress = await prisma.congress.findUnique({
    where: { id: session.congressId },
    select: { slug: true },
  });
  if (!congress) {
    return NextResponse.json({ error: t("api.congressNotFound") }, { status: 404 });
  }

  const context = await getRegistrationContext({
    email: session.email,
    congressSlug: congress.slug,
    locale,
  });

  if (!context) {
    return NextResponse.json({ error: t("api.contextFailed") }, { status: 404 });
  }

  return NextResponse.json({ context });
}
