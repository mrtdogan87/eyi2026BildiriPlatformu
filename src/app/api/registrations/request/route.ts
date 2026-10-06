import { apiRoute } from "@/platform/http";
import { requireModule } from "@/platform/context";
import { NextResponse } from "next/server";
import { z } from 'zod';
import { issueRegistrationLink } from "@/lib/registration";
import { ensureCongress } from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

async function handlePOST(request: Request) {
  const { t, locale } = await getServerT();
  const parsed = z.object({ congressSlug: z.string().trim().min(1).max(160), email: z.string().trim().toLowerCase().email().max(254) }).strict().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: t("api.congressEmailRequired") }, { status: 400 });
  }
  const { email, congressSlug } = parsed.data;

  const congress = await ensureCongress(congressSlug);
  await requireModule(congress.id, "REGISTRATION");
  await issueRegistrationLink({
    congressId: congress.id,
    congressSlug: congress.slug,
    congressName: congress.name,
    email, locale,
  });

  return NextResponse.json({
    message: locale === 'en' ? 'Your registration link has been queued for email delivery.' : 'Kayıt bağlantınız e-posta gönderim kuyruğuna alındı.',
  });
}

export const POST = apiRoute(handlePOST);
