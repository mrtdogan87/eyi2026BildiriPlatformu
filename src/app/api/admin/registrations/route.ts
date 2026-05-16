import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminRegistrationList } from "@/lib/admin";

export async function GET() {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  return NextResponse.json({ registrations: await getAdminRegistrationList() });
}
