import { privateFile } from "@/platform/files";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminDownloadPayload } from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handleGET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess("submissions.read", "SUBMISSIONS"))) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const file = await getAdminDownloadPayload(id);

  if (!file || !file.content) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  return privateFile(file.content, file.mimeType, file.originalName);
}

export const GET = apiRoute(handleGET);
