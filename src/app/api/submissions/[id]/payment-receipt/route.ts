import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getPaymentClosedMessage,
  getSubmissionSnapshot,
  isPaymentClosed,
  isValidReceiptFile,
} from "@/lib/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function resolveReceiptMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerName.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
}

export async function PUT(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslağa erişim izniniz yok." }, { status: 403 });
  }

  if (isPaymentClosed()) {
    return NextResponse.json({ error: getPaymentClosedMessage() }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Yüklenecek dekont bulunamadı." }, { status: 400 });
  }

  if (!isValidReceiptFile(file)) {
    return NextResponse.json(
      { error: "Dekont PDF, JPG, JPEG veya PNG olmalı ve 10 MB sınırını aşmamalı." },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      paymentCategory: true,
      paymentAmount: true,
      paymentDescription: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Bildiri bulunamadı." }, { status: 404 });
  }

  if (!submission.paymentCategory || !submission.paymentAmount || !submission.paymentDescription) {
    return NextResponse.json({ error: "Önce ücret bilgisini hesaplayıp kaydetmelisiniz." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `database:${id}:payment-receipt:${randomUUID()}`;

  await prisma.submissionPaymentReceipt.upsert({
    where: {
      submissionId: id,
    },
    update: {
      originalName: file.name,
      mimeType: resolveReceiptMimeType(file),
      fileSize: file.size,
      storageKey,
      content: buffer,
      uploadedAt: new Date(),
    },
    create: {
      submissionId: id,
      originalName: file.name,
      mimeType: resolveReceiptMimeType(file),
      fileSize: file.size,
      storageKey,
      content: buffer,
    },
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
