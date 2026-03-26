import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessDraft, getSubmissionSnapshot, validateAuthors } from "@/lib/submission";
import type { SubmissionAuthorInput } from "@/types/submission";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: "Bu taslaga erisim izniniz yok." }, { status: 403 });
  }

  const body = (await request.json()) as { authors?: SubmissionAuthorInput[] };
  const authors = body.authors ?? [];
  const errors = validateAuthors(authors);
  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.submissionAuthor.deleteMany({
      where: {
        submissionId: id,
      },
    }),
    prisma.submissionAuthor.createMany({
      data: authors.map((author, index) => ({
        submissionId: id,
        fullName: author.fullName.trim(),
        email: author.email.trim().toLowerCase(),
        institution: author.institution.trim(),
        country: author.country.trim(),
        isPresenter: author.isPresenter,
        sortOrder: index,
      })),
    }),
  ]);

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}
