import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  getAdminPricingPayload,
  updateAdminCongressSettings,
} from "@/lib/admin";

export async function PATCH(request: Request) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const body = (await request.json()) as {
    earlyDeadline?: string | null;
    lateDeadline?: string | null;
    galaFeeAmount?: number;
    galaFeeCurrency?: string;
    galaFeeNote?: string;
    bankName?: string;
    bankAccountHolder?: string;
    bankIban?: string;
    bankBranch?: string;
    tripNote?: string;
  };

  await updateAdminCongressSettings(body);

  return NextResponse.json({ pricing: await getAdminPricingPayload() });
}
