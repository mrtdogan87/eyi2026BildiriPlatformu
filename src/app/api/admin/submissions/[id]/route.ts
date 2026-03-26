import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminSubmissionDetail } from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const submission = await getAdminSubmissionDetail(id);

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ submission });
}
