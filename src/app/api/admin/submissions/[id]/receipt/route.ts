import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminPaymentReceiptDownloadPayload } from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const file = await getAdminPaymentReceiptDownloadPayload(id);

  if (!file || !file.content) {
    return NextResponse.json({ error: "Dekont bulunamadı." }, { status: 404 });
  }

  return new Response(Buffer.from(file.content), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "no-store",
    },
  });
}
