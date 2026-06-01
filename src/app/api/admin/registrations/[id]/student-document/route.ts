import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  getAdminRegistrationStudentDocumentPayload,
} from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const payload = await getAdminRegistrationStudentDocumentPayload(id);
  if (!payload?.content) {
    return NextResponse.json({ error: "Öğrenci belgesi bulunamadı." }, { status: 404 });
  }

  return new NextResponse(payload.content, {
    headers: {
      "Content-Type": payload.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.originalName)}"`,
    },
  });
}
