import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin";

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ success: true });
}
