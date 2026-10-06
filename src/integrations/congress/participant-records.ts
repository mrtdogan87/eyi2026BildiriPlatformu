import type { Prisma } from '@prisma/client';
import type { FlowParent } from '@/platform/flow-sessions';
import { prisma } from '@/lib/prisma';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { paymentSummary } from '@/modules/payments/core';
import { submissionTasks } from '@/modules/participation/status';
import { AccessError } from '@/platform/http';
import { setDraftAccessCookie } from '@/lib/submission';
import { setRegistrationCookie } from '@/lib/registration';
import { ownActivities } from './activities';
import { ownProgram } from './program';
import { authorReviewResults } from './reviews';
import { listParticipantWorkRequests } from './worklist';

export async function participantRecords(congressId: string, email: string) {
  const congress = await prisma.congress.findUniqueOrThrow({ where: { id: congressId }, include: { modules: true } });
  const rules = effectiveConfiguration(congress.configuration);
  const modules = { SUBMISSIONS: congress.modules.some(m => m.key === 'SUBMISSIONS' && m.enabled), REGISTRATION: congress.modules.some(m => m.key === 'REGISTRATION' && m.enabled) };
  const emailMatch: Prisma.StringFilter = { equals: email, mode: 'insensitive' };
  const [papers, entries, declarations, requests, revisions] = await Promise.all([
    modules.SUBMISSIONS ? prisma.submission.findMany({ where: { congressId, OR: [{ draftOwnerEmail: emailMatch }, { status: { not: 'DRAFT' }, authors: { some: { email: emailMatch } } }] },
      select: { id: true, titleTr: true, titleEn: true, status: true, draftOwnerEmail: true, submittedAt: true, file: { select: { id: true } }, paperItem: { select: { id: true } }, authors: { where: { email: emailMatch }, select: { isPresenter: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }) : [],
    modules.REGISTRATION ? prisma.registration.findMany({ where: { congressId, email: emailMatch }, select: { id: true, totalAmount: true, currency: true, paidAt: true, audience: true, createdAt: true, receipt: { select: { id: true } }, studentDocument: { select: { id: true } }, paymentEvents: { orderBy: { number: 'asc' }, select: { id: true, kind: true, amountMinor: true, currency: true, targetId: true, createdAt: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }) : [],
    prisma.declarationAcceptance.findMany({ where: { congressId, email: emailMatch }, select: { entityType: true, entityId: true, version: true, locale: true, acceptedAt: true } }),
    listParticipantWorkRequests(prisma, { congressId, email }),
    modules.SUBMISSIONS ? prisma.submissionRevisionRequest.findMany({ where: { ownerEmail: emailMatch, submission: { congressId, draftOwnerEmail: emailMatch } }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, status: true, reason: true, expiresAt: true, fileName: true, reviewReason: true } }) : [],
  ]);
  function declaration(entityType: string, entityId: string) {
    const record = declarations.find(d => d.entityType === entityType && d.entityId === entityId);
    return record ? { recorded: true, version: record.version, locale: record.locale, acceptedAt: record.acceptedAt.toISOString() } : { recorded: false, version: null, locale: null, acceptedAt: null };
  }
  const reviewAvailable = modules.SUBMISSIONS && congress.modules.some(m => m.key === 'REVIEWS' && m.enabled);
  const reviewResults = reviewAvailable ? await authorReviewResults(congressId, papers.map(p => p.id)) : [];
  const programAvailable=congress.modules.some(m=>m.key==='PROGRAM'&&m.enabled);
  const program=programAvailable?await ownProgram(congressId,email):null;
  const activitiesAvailable=congress.modules.some(m=>m.key==='ACTIVITIES'&&m.enabled);
  const activities=activitiesAvailable?await ownActivities(congressId,email):null;
  return { activities, program, reviewResults, congress: { id: congress.id, name: congress.name, slug: congress.slug }, email, modules,
    submissions: papers.map(p => ({ id: p.id, titleTr: p.titleTr, titleEn: p.titleEn, status: p.status, submittedAt: p.submittedAt?.toISOString() ?? null,
      canWithdraw: p.status !== 'DRAFT' && p.draftOwnerEmail.toLowerCase() === email.toLowerCase(), canOpen: p.draftOwnerEmail.toLowerCase() === email.toLowerCase(), declaration: declaration('SUBMISSION', p.id),
      missing: submissionTasks({ status: p.status, owner: p.draftOwnerEmail.toLowerCase() === email.toLowerCase(), fileRequired: rules.stages.FULL_TEXT.enabled && rules.fields.file === 'REQUIRED', fileReceived: !!p.file, registrationEnabled: modules.REGISTRATION, registered: !!p.paperItem, presenter: p.authors.some(a => a.isPresenter) }) })),
    registrations: entries.map(r => ({ id: r.id, totalAmount: r.totalAmount, currency: r.currency, paidAt: r.paidAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(), receiptReceived: !!r.receipt,
      paymentState: paymentSummary({ ...r, receiptReceived: !!r.receipt }, r.paymentEvents).state, payment: paymentSummary({ ...r, receiptReceived: !!r.receipt }, r.paymentEvents), paymentVerificationAvailable: true, declaration: declaration('REGISTRATION', r.id),
      missing: [...(rules.stages.PAYMENT.enabled && rules.fields.receipt === 'REQUIRED' && r.totalAmount > 0 && !r.receipt && !['EXEMPT', 'VERIFIED', 'OVERPAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(paymentSummary({ ...r, receiptReceived: !!r.receipt }, r.paymentEvents).state) ? ['UPLOAD_RECEIPT'] : []), ...(rules.fields.studentDocument === 'REQUIRED' && !r.studentDocument ? ['UPLOAD_STUDENT_DOCUMENT'] : [])] })),
    requests, revisions: revisions.map(r => ({ ...r, expiresAt: r.expiresAt.toISOString() })), unavailable: [...(reviewAvailable ? [] : ['reviews']), ...(programAvailable?[]:['program','tasks']), 'certificates'] };
}
export type ParticipantOverview = Awaited<ReturnType<typeof participantRecords>>;
// An email verified by the participant panel may open only its owner's existing flow.
export async function openParticipantFlow(identity: { congressId: string; email: string; parentSession?: FlowParent }, input: { sourceType: 'SUBMISSION' | 'REGISTRATION'; sourceId?: string }) {
  const congress = await prisma.congress.findUniqueOrThrow({ where: { id: identity.congressId }, include: { modules: true } });
  const key = input.sourceType === 'SUBMISSION' ? 'SUBMISSIONS' : 'REGISTRATION';
  if (!congress.modules.some(m => m.key === key && m.enabled)) throw new AccessError(403, 'İlgili modül kapalı.');
  if (input.sourceType === 'REGISTRATION') {
    await setRegistrationCookie(identity.email, congress.id, identity.parentSession); return { url: `/${congress.slug}/kayit/panel` };
  }
  const paper = input.sourceId ? await prisma.submission.findFirst({ where: { id: input.sourceId, congressId: congress.id, draftOwnerEmail: { equals: identity.email, mode: 'insensitive' } }, select: { id: true } }) : null;
  if (!paper) throw new AccessError(404, 'Bildiri bulunamadı.');
  await setDraftAccessCookie(paper.id, identity.email, identity.parentSession); return { url: `/${congress.slug}/bildiri-gonder?draft=${paper.id}` };
}
