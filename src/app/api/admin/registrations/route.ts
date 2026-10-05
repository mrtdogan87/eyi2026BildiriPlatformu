import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { assertAdminApiAccess, getAdminRegistrationList } from "@/lib/admin";

async function handleGET() {
  if (!(await assertAdminApiAccess("registrations.read", "REGISTRATION"))) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  return NextResponse.json({ registrations: await getAdminRegistrationList() });
}

export const GET = apiRoute(handleGET);
