import { NextResponse } from "next/server";
import { isValidAdminPassword, setAdminSessionCookie } from "@/lib/admin";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim() ?? "";

  if (!isValidAdminPassword(password)) {
    return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
  }

  try {
    await setAdminSessionCookie();
  } catch {
    return NextResponse.json(
      { error: "Admin oturumu için sunucu yapılandırması eksik." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
