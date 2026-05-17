import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { AudienceType, PresentationMode } from "@prisma/client";
import {
  calculateRegistration,
  clearRegistrationCookie,
  readRegistrationSession,
} from "@/lib/registration";
import { getCongressWithTiers } from "@/lib/payment";
import { prisma } from "@/lib/prisma";
import { isValidReceiptFile } from "@/lib/submission";

function resolveReceiptMimeType(file: File) {
  if (file.type) return file.type;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const session = await readRegistrationSession();
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const formData = await request.formData();
  const presenterName = String(formData.get("presenterName") ?? "").trim();
  if (!presenterName) {
    return NextResponse.json({ error: "Ad soyad zorunludur." }, { status: 400 });
  }

  const paperSubmissionIds = parseJsonField<string[]>(formData.get("paperSubmissionIds"), []);
  const listenerEnabled = formData.get("listenerEnabled") === "true";
  const listenerPresentationMode = formData.get("listenerPresentationMode") as PresentationMode | null;
  const listenerAudience = formData.get("listenerAudience") as AudienceType | null;
  const listenerDayOne = formData.get("listenerDayOne") === "true";
  const listenerDayTwo = formData.get("listenerDayTwo") === "true";
  const galaAttendance = formData.get("galaAttendance") === "true";
  const galaAttendeeCount = Math.max(0, Number(formData.get("galaAttendeeCount") ?? 0));
  const tripAttendance = formData.get("tripAttendance") === "true";
  const tripAttendeeCount = Math.max(0, Number(formData.get("tripAttendeeCount") ?? 0));

  if (!paperSubmissionIds.length && !listenerEnabled) {
    return NextResponse.json(
      { error: "Bildiri seçmelisiniz veya dinleyici olarak kaydolmalısınız." },
      { status: 400 },
    );
  }

  const congress = await getCongressWithTiers((await prisma.congress.findUniqueOrThrow({
    where: { id: session.congressId },
    select: { slug: true },
  })).slug);
  if (!congress) {
    return NextResponse.json({ error: "Kongre bulunamadı." }, { status: 404 });
  }

  // Validate the selected papers belong to this email & ACCEPTED
  const normalizedEmail = session.email.toLowerCase();
  const selectedSubmissions = await prisma.submission.findMany({
    where: {
      id: { in: paperSubmissionIds },
      congressId: congress.id,
      status: "ACCEPTED",
      OR: [
        { draftOwnerEmail: normalizedEmail },
        { authors: { some: { email: normalizedEmail } } },
      ],
    },
    include: { paperItem: true },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
  });

  if (selectedSubmissions.length !== paperSubmissionIds.length) {
    return NextResponse.json(
      { error: "Seçilen bildirilerden bazıları doğrulanamadı." },
      { status: 400 },
    );
  }

  const alreadyPaid = selectedSubmissions.find((submission) => submission.paperItem);
  if (alreadyPaid) {
    return NextResponse.json(
      { error: "Seçilen bildirilerden biri için ödeme zaten kaydedilmiş." },
      { status: 400 },
    );
  }

  // Calculate quote
  let calculation;
  try {
    calculation = calculateRegistration({
      email: session.email,
      presenterName,
      congress,
      selectedPapers: selectedSubmissions.map((submission) => ({
        submissionId: submission.id,
        title:
          submission.submissionLanguage === "EN"
            ? submission.titleEn || submission.titleTr || "Bildiri"
            : submission.titleTr || submission.titleEn || "Bildiri",
        audience: submission.audience,
      })),
      listenerEnabled,
      listenerPresentationMode,
      listenerAudience,
      listenerDayOne,
      listenerDayTwo,
      galaAttendance,
      galaAttendeeCount,
      tripAttendance,
      tripAttendeeCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tutar hesaplanamadı." },
      { status: 400 },
    );
  }

  // Receipt file is required only for the ana ücret (gala is collected separately)
  const receiptFile = formData.get("receipt");
  const needsReceipt = calculation.quote.totalAmount > 0;
  if (needsReceipt) {
    if (!(receiptFile instanceof File)) {
      return NextResponse.json({ error: "Dekont yüklemelisiniz." }, { status: 400 });
    }
    if (!isValidReceiptFile(receiptFile)) {
      return NextResponse.json(
        { error: "Dekont PDF, JPG, JPEG veya PNG olmalı ve 10 MB sınırını aşmamalı." },
        { status: 400 },
      );
    }
  }

  const buffer =
    receiptFile instanceof File ? Buffer.from(await receiptFile.arrayBuffer()) : null;

  const registration = await prisma.$transaction(async (tx) => {
    const created = await tx.registration.create({
      data: {
        congressId: congress.id,
        email: session.email,
        kind: paperSubmissionIds.length > 0 ? "PAPERS" : "LISTENER",
        audience: listenerEnabled ? listenerAudience : null,
        listenerPresentationMode: listenerEnabled ? listenerPresentationMode : null,
        listenerDayOne: listenerEnabled ? listenerDayOne : false,
        listenerDayTwo: listenerEnabled ? listenerDayTwo : false,
        galaAttendance,
        galaAttendeeCount: galaAttendance ? galaAttendeeCount : 0,
        galaFeeAmount: galaAttendance ? congress.galaFeeAmount : null,
        galaFeeCurrency: galaAttendance ? congress.galaFeeCurrency : null,
        tripAttendance,
        tripAttendeeCount: tripAttendance ? tripAttendeeCount : 0,
        paymentPeriod: calculation.quote.paymentPeriod ?? "EARLY",
        totalAmount: calculation.quote.totalAmount,
        currency: calculation.quote.currency,
        paymentDescription: calculation.quote.description,
        paidAt: buffer ? new Date() : null,
        paperItems: {
          create: calculation.paperAssignments.map((assignment) => ({
            submissionId: assignment.submissionId,
            paperOrder: assignment.paperOrder,
            amount: assignment.amount,
            currency: assignment.currency,
            tierId: assignment.tierId,
          })),
        },
      },
    });

    if (buffer && receiptFile instanceof File) {
      await tx.registrationReceipt.create({
        data: {
          registrationId: created.id,
          originalName: receiptFile.name,
          mimeType: resolveReceiptMimeType(receiptFile),
          fileSize: receiptFile.size,
          storageKey: `database:registration:${created.id}:${randomUUID()}`,
          content: buffer,
        },
      });
    }

    return created;
  });

  await clearRegistrationCookie();

  return NextResponse.json({ registrationId: registration.id });
}
