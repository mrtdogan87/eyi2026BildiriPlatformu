import { NextResponse } from "next/server";
import {
  consumeRegistrationToken,
  setRegistrationCookie,
} from "@/lib/registration";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Doğrulama bağlantısı eksik." }, { status: 400 });
  }

  const record = await consumeRegistrationToken(token);
  if (!record) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz ya da süresi dolmuş. Lütfen yeni bir bağlantı isteyin." },
      { status: 400 },
    );
  }

  await setRegistrationCookie(record.email, record.congressId);

  return NextResponse.json({
    email: record.email,
    congressSlug: record.congress.slug,
  });
}
