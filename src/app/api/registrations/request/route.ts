import { NextResponse } from "next/server";
import { isResendConfigured, sendRegistrationAccessEmail } from "@/lib/email";
import { issueRegistrationLink } from "@/lib/registration";
import { ensureCongress } from "@/lib/submission";

export async function POST(request: Request) {
  const body = (await request.json()) as { congressSlug?: string; email?: string };
  const email = body.email?.trim().toLowerCase();
  const congressSlug = body.congressSlug?.trim();

  if (!email || !congressSlug) {
    return NextResponse.json({ error: "Kongre ve e-posta zorunludur." }, { status: 400 });
  }

  const congress = await ensureCongress(congressSlug);
  const magicLink = await issueRegistrationLink({
    congressId: congress.id,
    congressSlug: congress.slug,
    email,
  });

  const isDevelopmentPreview = process.env.NODE_ENV !== "production" && !isResendConfigured();
  if (isResendConfigured()) {
    try {
      await sendRegistrationAccessEmail({
        to: email,
        congressName: congress.name,
        magicLink,
      });
    } catch {
      return NextResponse.json(
        { error: "Bağlantı oluşturuldu ancak e-posta gönderilemedi." },
        { status: 500 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Kayıt linki göndermek için Resend API ayarları eksik." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: isDevelopmentPreview
      ? "Kayıt linki üretildi. Geliştirme ortamında bağlantı aşağıda önizleme olarak gösteriliyor."
      : "Kayıt linki e-posta adresinize gönderildi.",
    magicLinkPreview: isDevelopmentPreview ? magicLink : undefined,
  });
}
