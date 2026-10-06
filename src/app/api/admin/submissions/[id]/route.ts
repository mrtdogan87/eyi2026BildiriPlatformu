import { requireContext } from "@/platform/context";
import { auditSink } from "@/platform/audit";
import { AccessError } from "@/platform/http";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import {
  assertAdminApiAccess,
  getAdminSubmissionDetail,
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handleGET(_: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess("submissions.read", "SUBMISSIONS"))) {
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

async function handleDELETE(request: Request, { params }: RouteProps) {
  if (!(await assertAdminApiAccess("submissions.delete", "SUBMISSIONS"))) {
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

  const context = await requireContext("submissions.delete", "SUBMISSIONS");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${context.congress.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Submission" WHERE id = ${id} AND "congressId" = ${context.congress.id} FOR UPDATE`;
    const submission = await tx.submission.findFirst({
      where: {
        id,
        congressId: context.congress.id,
      },
      select: { id: true },
  });

  if (!submission) {
    throw new AccessError(404, "Bildiri bulunamadı.");
  }

  if(await tx.awardEntry.count({where:{submissionId:submission.id}}))throw new AccessError(409,'Ödül başvurusu ve geçmişi bulunan bildiri silinemez.');

  if (await tx.certificateRecipient.count({where:{congressId:context.congress.id,source:'CONGRESS',sourceVersion:{path:['proof','submission','id'],equals:submission.id}}})) {
    throw new AccessError(409, 'Belge uygunluğunun kaynağı olan bildiri silinemez; kaynak ve geçmiş korunmalı.');
  }

  if (await tx.programTalk.count({ where: { submissionId: submission.id } }) || await tx.reviewRound.count({ where: { submissionId: submission.id } }) || await tx.submissionFileVersion.count({ where: { submissionId: submission.id } }) || await tx.submissionChangeLog.count({ where: { submissionId: submission.id } }) || await tx.submissionRevisionRequest.count({ where: { submissionId: submission.id } })) {
    throw new AccessError(409, 'Sürüm veya düzeltme geçmişi bulunan bildiri silinemez; geçmiş korunmalı.');
  }

  await tx.submission.delete({ where: { id: submission.id } });
  await auditSink(tx)(context, "submission.delete", submission.id);
  });

  return NextResponse.json({ ok: true });
}

export const GET = apiRoute(handleGET);

export const DELETE = apiRoute(handleDELETE);
