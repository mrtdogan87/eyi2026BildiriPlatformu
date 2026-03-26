import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  isManageableSubmissionStatus,
  updateAdminSubmissionStatus,
} from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const body = (await request.json()) as { status?: string; note?: string };
  if (!body.status || !isManageableSubmissionStatus(body.status)) {
    return NextResponse.json({ error: "Geçerli bir durum seçmelisiniz." }, { status: 400 });
  }

  const { id } = await params;
  const submission = await updateAdminSubmissionStatus({
    submissionId: id,
    status: body.status,
    note: body.note,
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ submission });
}
