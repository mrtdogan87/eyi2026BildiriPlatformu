import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessDraft, getSubmissionSnapshot, isValidDocx } from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: t("api.fileMissing") }, { status: 400 });
  }

  if (!isValidDocx(file)) {
    return NextResponse.json({ error: t("api.docxInvalid") }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `database:${id}:${randomUUID()}.docx`;

  await prisma.submissionFile.upsert({
    where: {
      submissionId: id,
    },
    update: {
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
      content: buffer,
      uploadedAt: new Date(),
    },
    create: {
      submissionId: id,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
      content: buffer,
    },
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
