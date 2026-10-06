import { configuredDetails, lockEditableSubmission } from '@/integrations/congress/submission-rules';
import { apiRoute, AccessError } from '@/platform/http';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAccessDraft, getSubmissionSnapshot, isSubmissionClosedForDraft } from '@/lib/submission';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { emptyStructuredAbstract, structuredAbstractSchema } from '@/modules/participation/abstract';
type RouteProps = { params: Promise<{ id: string }> };

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  if (!(await canAccessDraft(id))) throw new AccessError(403, 'Bu taslağa erişim yok.');
  const raw: unknown = await request.json();
  await prisma.$transaction(async tx => {
    const current = await lockEditableSubmission(tx, id);
    const rules = effectiveConfiguration(current.congress.configuration);
    const metadataOpen = !(await isSubmissionClosedForDraft(id));
    const structuredOpen = rules.structuredAbstract.enabled && !(await isSubmissionClosedForDraft(id, rules.structuredAbstract.stage));
    if (!metadataOpen && !structuredOpen) throw new AccessError(403, 'Bilgi düzenleme süresi kapalı.');
    const body = configuredDetails(raw, rules);
    const metadataKeys = ['submissionLanguage', 'titleTr', 'titleEn', 'keywordsTr', 'keywordsEn', ...(!rules.structuredAbstract.enabled ? ['abstractTr', 'abstractEn'] as const : [])] as const;
    if (!metadataOpen && metadataKeys.some(key => (current[key] ?? '').trim() !== body[key].trim())) throw new AccessError(403, 'Kapalı aşamanın başlık, dil veya diğer bilgileri değiştirilemez.');
    const savedStructure = structuredAbstractSchema.safeParse(current.structuredAbstract);
    if (rules.structuredAbstract.enabled && !structuredOpen && JSON.stringify(body.structuredAbstract) !== JSON.stringify(savedStructure.success ? savedStructure.data : emptyStructuredAbstract())) throw new AccessError(403, 'Yapılandırılmış özetin teslim süresi kapalı.');
    await tx.submission.update({ where: { id }, data: {
      submissionLanguage: body.submissionLanguage, titleTr: body.titleTr.trim(), titleEn: body.titleEn.trim(), abstractTr: body.abstractTr.trim(), abstractEn: body.abstractEn.trim(), keywordsTr: body.keywordsTr.trim(), keywordsEn: body.keywordsEn.trim(),
      ...(rules.structuredAbstract.enabled ? { structuredAbstract: body.structuredAbstract } : {}),
    } });
  });
  return NextResponse.json({ submission: await getSubmissionSnapshot(id) });
}
export const PATCH = apiRoute(handlePATCH);
