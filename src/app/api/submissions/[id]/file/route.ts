import { lockEditableSubmission } from "@/integrations/congress/submission-rules";
import { apiRoute, AccessError } from "@/platform/http";
import { appendFileVersion, readRevisionBinary } from '@/integrations/congress/revision-files';
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

async function handlePUT(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const { id } = await params;
  if (!(await canAccessDraft(id))) {
    return NextResponse.json({ error: t("api.draftNoAccess") }, { status: 403 });
  }
  if (await isSubmissionClosedForDraft(id, "FULL_TEXT")) {
    return NextResponse.json({ error: t("api.submissionsClosed") }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: t("api.fileMissing") }, { status: 400 });
  }

  const binary = await readRevisionBinary(file);
  await prisma.$transaction(async tx => {
    const paper = await lockEditableSubmission(tx, id);
    if (await isSubmissionClosedForDraft(id, 'FULL_TEXT')) throw new AccessError(403, t('api.submissionsClosed'));
    await appendFileVersion(tx, id, paper.file, binary!, { name: paper.draftOwnerEmail }, 'Katılımcının taslak dosyası yüklemesi');
  });

  return NextResponse.json({
    submission: await getSubmissionSnapshot(id),
  });
}

export const PUT = apiRoute(handlePUT);
