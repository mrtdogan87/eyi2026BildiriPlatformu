import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRegistrationContext,
  readRegistrationSession,
} from "@/lib/registration";

export async function GET() {
  const session = await readRegistrationSession();
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const congress = await prisma.congress.findUnique({
    where: { id: session.congressId },
    select: { slug: true },
  });
  if (!congress) {
    return NextResponse.json({ error: "Kongre bulunamadı." }, { status: 404 });
  }

  const context = await getRegistrationContext({
    email: session.email,
    congressSlug: congress.slug,
  });

  if (!context) {
    return NextResponse.json({ error: "Kayıt bağlamı oluşturulamadı." }, { status: 404 });
  }

  return NextResponse.json({ context });
}
