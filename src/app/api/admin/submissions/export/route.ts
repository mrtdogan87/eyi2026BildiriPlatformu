import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  buildAdminSubmissionCsv,
  getAdminSubmissionList,
  normalizeAdminSubmissionFilters,
} from "@/lib/admin";

async function handleGET(request: Request) {
  if (!(await assertAdminApiAccess("submissions.read", "SUBMISSIONS"))) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const filters = normalizeAdminSubmissionFilters(new URL(request.url).searchParams);
  const items = await getAdminSubmissionList(filters);
  const csv = buildAdminSubmissionCsv(items);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename*=UTF-8''eyi-2026-bildiriler.csv",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = apiRoute(handleGET);
