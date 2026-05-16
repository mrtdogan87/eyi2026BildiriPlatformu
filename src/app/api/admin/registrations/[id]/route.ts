import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  deleteAdminRegistration,
  getAdminRegistrationDetail,
} from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

const DELETE_CONFIRMATION_PHRASE = "Bu kaydı silmeyi onaylıyorum";

export async function GET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }
  const { id } = await params;
  const registration = await getAdminRegistrationDetail(id);
  if (!registration) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ registration });
}

export async function DELETE(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { confirmation?: string };
  if ((body.confirmation ?? "").trim() !== DELETE_CONFIRMATION_PHRASE) {
    return NextResponse.json(
      { error: `Silmek için "${DELETE_CONFIRMATION_PHRASE}" ifadesini birebir yazmalısınız.` },
      { status: 400 },
    );
  }

  const deleted = await deleteAdminRegistration(id);
  if (!deleted) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
