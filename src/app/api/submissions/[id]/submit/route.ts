import { configuredDetails, configuredAuthors, configuredParticipation, lockEditableSubmission } from '@/integrations/congress/submission-rules';
import { acceptedDeclaration } from '@/integrations/congress/declarations';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { apiRoute, AccessError } from '@/platform/http';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAccessDraft, clearDraftAccessCookie, countSubmittedEmailUsage, isSubmissionClosedForDraft, findPresenter, getSubmissionSnapshot } from '@/lib/submission';
import { getServerT } from '@/lib/i18n/server';
import { enqueueNotification } from '@/platform/notifications';
import { createHash } from 'node:crypto';

type RouteProps = { params: Promise<{ id: string }> };
async function handlePOST(request: Request, { params }: RouteProps) {
  const { t } = await getServerT();
  const body: unknown = await request.json().catch(() => null);
  const { id } = await params;
  if (!(await canAccessDraft(id))) throw new AccessError(403, t('api.draftNoAccess'));

  await prisma.$transaction(async tx => {
    const submission = await lockEditableSubmission(tx, id);
    // The congress lock prevents rule changes while this acceptance commits.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`submission-limit:${submission.congressId}`}))`;
    if (await isSubmissionClosedForDraft(id, 'SUBMIT')) throw new AccessError(403, t('api.submissionsClosed'));
    const rules = effectiveConfiguration(submission.congress.configuration);
    const acceptance = acceptedDeclaration(body, rules, 'SUBMISSION');
    configuredDetails({ submissionLanguage: submission.submissionLanguage, titleTr: submission.titleTr ?? '', titleEn: submission.titleEn ?? '', abstractTr: rules.fields.abstract === 'HIDDEN' ? '' : submission.abstractTr ?? '', abstractEn: rules.fields.abstract === 'HIDDEN' ? '' : submission.abstractEn ?? '', keywordsTr: rules.fields.keywords === 'HIDDEN' ? '' : submission.keywordsTr ?? '', keywordsEn: rules.fields.keywords === 'HIDDEN' ? '' : submission.keywordsEn ?? '', structuredAbstract: rules.structuredAbstract.enabled ? submission.structuredAbstract ?? undefined : undefined }, rules);
    configuredAuthors(submission.authors.map(author => ({ fullName: author.fullName, title: rules.fields.authorTitle === 'HIDDEN' ? '' : author.title ?? '', email: author.email, institution: rules.fields.authorInstitution === 'HIDDEN' ? '' : author.institution ?? '', country: rules.fields.authorCountry === 'HIDDEN' ? '' : author.country ?? '', isPresenter: author.isPresenter })), rules);
    configuredParticipation({ presentationMode: rules.fields.presentationMode === 'HIDDEN' ? null : submission.presentationMode, audience: rules.fields.audience === 'HIDDEN' ? null : submission.audience }, rules);
    if (!findPresenter(submission.authors)?.fullName.trim()) throw new AccessError(400, t('api.presenterNotFound'));
    if (rules.fields.file === 'REQUIRED' && !submission.file) throw new AccessError(400, t('api.docxRequired'));
    const usage = await countSubmittedEmailUsage(submission.congressId, submission.authors.map(author => author.email), tx);
    const blockedEmail = submission.authors.find(author => (usage[author.email.trim().toLowerCase()] ?? 0) >= 2)?.email;
    if (blockedEmail) throw new AccessError(400, t('api.emailUsedTwice', { email: blockedEmail }));
    await tx.submission.update({ where: { id }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    await tx.declarationAcceptance.create({ data: { congressId: submission.congressId, entityType: 'SUBMISSION', entityId: id, email: submission.draftOwnerEmail.trim().toLowerCase(), ...acceptance } });
    const emailLocale = submission.submissionLanguage === 'EN' ? 'en' : 'tr';
    const paperTitle = submission.submissionLanguage === 'EN' ? submission.titleEn || submission.titleTr || 'Bildiri' : submission.titleTr || submission.titleEn || 'Bildiri';
    const recipients = [...new Set(submission.authors.map(author => author.email.trim().toLowerCase()).filter(Boolean))];
    for (const recipient of recipients) await enqueueNotification(tx, {
      congressId: submission.congressId, key: 'SUBMISSION_RECEIVED', locale: emailLocale, to: recipient,
      dedupeKey: `submission-received:${id}:${createHash('sha256').update(recipient).digest('hex')}`,
      module: 'SUBMISSIONS', sourceType: 'submission', sourceId: id,
      values: { congressName: submission.congress.name, paperTitle },
    });
  }, { timeout: 15000 });
  await clearDraftAccessCookie();
  return NextResponse.json({ submission: await getSubmissionSnapshot(id) });
}
export const POST = apiRoute(handlePOST);
