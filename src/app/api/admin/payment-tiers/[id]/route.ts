import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  getAdminPricingPayload,
  updateAdminTier,
} from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    amount?: number;
    currency?: string;
    active?: boolean;
  };

  const updated = await updateAdminTier({
    id,
    amount:
      typeof body.amount === "number" && Number.isFinite(body.amount)
        ? Math.max(0, Math.round(body.amount))
        : undefined,
    currency:
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "Ücret kaydı bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ pricing: await getAdminPricingPayload() });
}
