import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminSubmissionList } from "@/lib/admin";

async function handleGET() {
  if (!(await assertAdminApiAccess("submissions.read", "SUBMISSIONS"))) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  return NextResponse.json({
    submissions: await getAdminSubmissionList(),
  });
}

export const GET = apiRoute(handleGET);
