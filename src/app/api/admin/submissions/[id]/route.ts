import { NextResponse } from "next/server";
import {
  ADMIN_DEFAULT_CONGRESS_SLUG,
  assertAdminApiAccess,
  getAdminSubmissionDetail,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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

const DELETE_CONFIRMATION_PHRASE = "Bu bildiriyi silmeyi onaylıyorum";

export async function DELETE(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess())) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request
    .json()
    .catch(() => ({}))) as { confirmation?: string };

  if ((body.confirmation ?? "").trim() !== DELETE_CONFIRMATION_PHRASE) {
    return NextResponse.json(
      {
        error: `Silme işlemi için "${DELETE_CONFIRMATION_PHRASE}" ifadesini birebir yazmalısınız.`,
      },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id,
      congress: { slug: ADMIN_DEFAULT_CONGRESS_SLUG },
    },
    select: { id: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  await prisma.submission.delete({ where: { id: submission.id } });

  return NextResponse.json({ ok: true });
}
