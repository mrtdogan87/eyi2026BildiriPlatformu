import { requireEditableDraft, configuredAuthors, submissionRules } from "@/integrations/congress/submission-rules";
import { apiRoute } from "@/platform/http";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessDraft,
  getSubmissionSnapshot,
  isSubmissionClosedForDraft,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }
  await requireEditableDraft(id);
  if (await isSubmissionClosedForDraft(id)) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  const body = await request.json();
  const authors = configuredAuthors(body.authors ?? [], await submissionRules(id));

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
        title: author.title?.trim() || null,
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

export const PATCH = apiRoute(handlePATCH);
