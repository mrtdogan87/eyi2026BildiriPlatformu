import { apiRoute } from "@/platform/http";
import { privateFile } from "@/platform/files";
import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  getAdminRegistrationStudentDocumentPayload,
} from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handleGET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess("registrations.read", "REGISTRATION"))) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const payload = await getAdminRegistrationStudentDocumentPayload(id);
  if (!payload?.content) {
    return NextResponse.json({ error: "Öğrenci belgesi bulunamadı." }, { status: 404 });
  }

  return privateFile(payload.content, payload.mimeType, payload.originalName);
}

export const GET = apiRoute(handleGET);
