import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessDraft, getSubmissionSnapshot, isValidDocx } from "@/lib/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslaga erisim izniniz yok." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Yuklenecek dosya bulunamadi." }, { status: 400 });
  }

  if (!isValidDocx(file)) {
    return NextResponse.json(
      { error: "Dosya DOCX olmali ve 10 MB sinirini asmamali." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${id}-${randomUUID()}.docx`;
  const storageKey = path.posix.join("uploads", fileName);
  const absolutePath = path.join(uploadsDir, fileName);

  const previous = await prisma.submissionFile.findUnique({
    where: { submissionId: id },
  });

  await writeFile(absolutePath, buffer);

  await prisma.submissionFile.upsert({
    where: {
      submissionId: id,
    },
    update: {
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
      uploadedAt: new Date(),
    },
    create: {
      submissionId: id,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storageKey,
    },
  });

  if (previous?.storageKey) {
    const previousPath = path.join(process.cwd(), "public", previous.storageKey);
    if (previousPath !== absolutePath) {
      await unlink(previousPath).catch(() => undefined);
    }
  }

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
