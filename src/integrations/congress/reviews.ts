import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext, requireModule, type CongressContext } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { enqueueNotification } from '@/platform/notifications';
import { privateFile } from '@/platform/files';
import { roundSchema, inviteSchema, responseSchema, evaluationSchema, importSchema, cancelSchema, deadlineSchema, decisionSchema, contentSchema, criteriaSchema, assertCurrent, assertOpen, deadlineDate, isAuthor, validateScores, reviewProjection, stateLabels } from '@/modules/reviews/core';
import { parsed, reviewAction, type ReviewBinary } from '@/modules/reviews/http';

const evaluationSelect = { id: true, scores: true, recommendation: true, authorComment: true, internalComment: true, source: true, reason: true, submittedByName: true, evidenceName: true, evidenceHash: true, createdAt: true } satisfies Prisma.ReviewEvaluationSelect;
const assignmentSelect = { id: true, roundId: true, reviewerId: true, reviewerName: true, version: true, status: true, inviteReason: true, responseReason: true, conflict: true, respondedAt: true, draft: true, createdAt: true, evaluation: { select: evaluationSelect } } satisfies Prisma.ReviewAssignmentSelect;
const roundSelect = { id: true, submissionId: true, number: true, version: true, status: true, mode: true, deadline: true, sourceVersion: true, sourceHash: true, snapshot: true, content: true, criteria: true, anonymityChecked: true, fileMime: true, fileHash: true, createdByName: true, reason: true, createdAt: true, assignments: { select: assignmentSelect, orderBy: { createdAt: 'asc' as const } }, decision: true } satisfies Prisma.ReviewRoundSelect;
type Round = Prisma.ReviewRoundGetPayload<{ select: typeof roundSelect }>;
const paperInclude = { authors: { orderBy: { sortOrder: 'asc' as const } }, file: true } satisfies Prisma.SubmissionInclude;
type Paper = Prisma.SubmissionGetPayload<{ include: typeof paperInclude }>;
const jsonValue = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function content(p: Paper) { return { titleTr: p.titleTr ?? '', titleEn: p.titleEn ?? '', abstractTr: p.abstractTr ?? '', abstractEn: p.abstractEn ?? '', keywordsTr: p.keywordsTr ?? '', keywordsEn: p.keywordsEn ?? '' }; }
function snapshot(p: Paper) { return { ...content(p), structuredAbstract: p.structuredAbstract, authors: p.authors.map(a => ({ fullName: a.fullName, institution: a.institution, email: a.email })), owner: p.draftOwnerEmail, fileHash: p.file?.content ? hash(p.file.content) : null, fileName: p.file?.originalName ?? null, fileVersion: p.file?.storageKey ?? null }; }
function currentSource(p: Paper, r: Round) { return p.correctionVersion === r.sourceVersion && hash(JSON.stringify(snapshot(p))) === r.sourceHash; }
async function context(action: 'reviews.read' | 'reviews.manage' | 'reviews.perform') { const c = await requireContext(action, 'REVIEWS'); await requireModule(c.congress.id, 'SUBMISSIONS'); return c; }
async function lock(tx: Prisma.TransactionClient, c: CongressContext) {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${c.congress.id} FOR UPDATE`;
  for (const key of ['REVIEWS', 'SUBMISSIONS'] as const) if (!(await tx.congressModule.findUnique({ where: { congressId_key: { congressId: c.congress.id, key } } }))?.enabled) throw new AccessError(403, 'Hakemlik veya bildiri modülü kapalı.');
  // Role and active membership can change while a request waits for the lock.
  const actor = await tx.platformUser.findUnique({ where: { id: c.actor.id } });
  const org = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: c.congress.organizationId, userId: c.actor.id } } });
  const member = await tx.congressMembership.findUnique({ where: { congressId_userId: { congressId: c.congress.id, userId: c.actor.id } } });
  if (!actor?.active || (!actor.platformAdmin && !(org?.active && (org.organizer || (member?.active && member.role === c.role))))) throw new AccessError(403, 'Kongre yetkiniz değişti; tekrar giriş yapın.');
}
async function paperIn(tx: Prisma.TransactionClient, c: CongressContext, id: string) { const p = await tx.submission.findFirst({ where: { id, congressId: c.congress.id, status: { not: 'DRAFT' } }, include: paperInclude }); if (!p) throw new AccessError(404, 'Gönderilmiş bildiri bulunamadı.'); return p; }
async function roundIn(tx: Prisma.TransactionClient, c: CongressContext, id: string) { const r = await tx.reviewRound.findFirst({ where: { id, congressId: c.congress.id }, select: roundSelect }); if (!r) throw new AccessError(404, 'Tur bulunamadı.'); return r; }
async function notify(tx: Prisma.TransactionClient, c: CongressContext, to: string, key: string, message: string, sourceId: string) { await enqueueNotification(tx, { congressId: c.congress.id, key: 'GENERAL', locale: 'tr', to, dedupeKey: key, module: 'REVIEWS', sourceType: key.startsWith('review-invite:') ? 'review-invitation' : 'review-decision', sourceId, values: { congressName: c.congress.name, recipientName: 'Hakem / Yazar', message } }); }
function roundView(r: Round) { return { ...r, content: contentSchema.parse(r.content), criteria: criteriaSchema.parse(r.criteria), deadline: r.deadline.toISOString(), createdAt: r.createdAt.toISOString(), assignments: r.assignments.map(a => ({ ...a, draft: a.draft as unknown as ReturnType<typeof evaluationSchema.parse> | null, createdAt: a.createdAt.toISOString(), respondedAt: a.respondedAt?.toISOString() ?? null, evaluation: a.evaluation ? { ...a.evaluation, scores: a.evaluation.scores as Record<string, number>, createdAt: a.evaluation.createdAt.toISOString() } : null })), decision: r.decision ? { ...r.decision, createdAt: r.decision.createdAt.toISOString() } : null }; }
export async function reviewList() {
  const c = await context('reviews.read');
  const papers = await prisma.submission.findMany({ where: { congressId: c.congress.id, status: { not: 'DRAFT' } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, titleTr: true, titleEn: true, status: true, reviewRounds: { orderBy: { number: 'desc' }, take: 1, select: { number: true, status: true, mode: true, deadline: true, assignments: { select: { status: true } } } } } });
  return { congressName: c.congress.name, papers: papers.map(p => ({ ...p, reviewRounds: p.reviewRounds.map(r => ({ ...r, deadline: r.deadline.toISOString() })) })), total: await prisma.submission.count({ where: { congressId: c.congress.id, status: { not: 'DRAFT' } } }) };
}
export async function reviewDetail(id: string) {
  const c = await context('reviews.read'); const p = await paperIn(prisma, c, id);
  const rounds = await prisma.reviewRound.findMany({ where: { submissionId: p.id }, orderBy: { number: 'desc' }, select: roundSelect });
  const reviewers = await prisma.congressMembership.findMany({ where: { congressId: c.congress.id, active: true, role: 'REVIEWER', user: { active: true, organizations: { some: { organizationId: c.congress.organizationId, active: true } } } }, select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: 'asc' } } });
  return { paper: { id: p.id, titleTr: p.titleTr, titleEn: p.titleEn, reviewVersion: p.reviewVersion, correctionVersion: p.correctionVersion, content: content(p), status: p.status, fileAvailable: !!p.file }, reviewers: reviewers.map(r => r.user), rounds: rounds.map(r => ({ ...roundView(r), sourceCurrent: currentSource(p, r) })) };
}
export type ReviewDetail = Awaited<ReturnType<typeof reviewDetail>>;
export async function createRound(id: string, raw: unknown, file: ReviewBinary | null) {
  const c = await context('reviews.manage'), input = parsed(roundSchema, raw);
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const p = await paperIn(tx, c, id); assertCurrent(input.version, p.reviewVersion); assertCurrent(input.correctionVersion, p.correctionVersion);
    const last = await tx.reviewRound.findFirst({ where: { submissionId: id }, orderBy: { number: 'desc' }, include: { decision: true } });
    if (last?.status === 'OPEN') throw new AccessError(409, 'Önce mevcut turu kararla veya gerekçeli kapatmayla sonuçlandırın.');
    if (last?.decision && last.decision.decision !== 'REVISE' && !input.reopen) throw new AccessError(409, 'Kesin karar sonrası yeni tur için yeniden açmayı açıkça onaylayın.');
    if (await tx.submissionRevisionRequest.count({ where: { submissionId: id, status: { in: ['OPEN', 'SUBMITTED'] } } })) throw new AccessError(409, 'Önce P11 dosya düzeltme talebini sonuçlandırın.');
    const source = snapshot(p), sourceHash = hash(JSON.stringify(source));
    if (last?.decision?.decision === 'REVISE' && last.sourceHash === sourceHash) throw new AccessError(409, 'Revizyon sonrası yeni tur için önce metin veya dosya sürümünü güncelleyin.');
    if (input.mode === 'DOUBLE_BLIND' && (!input.anonymityChecked || !input.content || (p.file && !file))) throw new AccessError(400, 'Çift kör tur için ayrı anonim metin, varsa ayrı dosya ve kimlik/içerik/özellik kontrolü gerekli.');
    if (input.mode !== 'DOUBLE_BLIND' && input.content) throw new AccessError(400, 'Açık/tek kör metin güncel bildiriden alınır.');
    if (!file && p.file && !p.file.content) throw new AccessError(409, 'Kaynak dosyanın içeriği bulunamadı.');
    const binary = file ?? (p.file?.content ? { content: p.file.content, mime: p.file.mimeType, hash: hash(p.file.content) } : null);
    const r = await tx.reviewRound.create({ data: { congressId: c.congress.id, submissionId: id, number: (last?.number ?? 0) + 1, mode: input.mode, deadline: deadlineDate(input.deadline), sourceVersion: p.correctionVersion, sourceHash, snapshot: jsonValue(source), content: jsonValue(input.content ?? content(p)), criteria: jsonValue(input.criteria), anonymityChecked: input.anonymityChecked, reason: input.reason, createdById: c.actor.id, createdByName: c.actor.name, ...(binary ? { fileContent: binary.content, fileMime: binary.mime, fileHash: binary.hash } : {}) } });
    await tx.submission.update({ where: { id }, data: { reviewVersion: { increment: 1 }, status: 'UNDER_REVIEW' } });
    if (p.status !== 'UNDER_REVIEW') await tx.submissionStatusHistory.create({ data: { submissionId: id, fromStatus: p.status, toStatus: 'UNDER_REVIEW', note: `P13 tur ${r.number}: ${input.reason}` } });
    await tx.auditLog.create({ data: auditData(c, 'review.round.create', r.id, { submissionId: id, number: r.number, mode: r.mode, sourceVersion: r.sourceVersion, sourceHash, fileHash: r.fileHash, anonymityChecked: r.anonymityChecked, reason: input.reason }) });
    return { id: r.id };
  }));
}
export async function inviteReviewer(id: string, raw: unknown) {
  const c = await context('reviews.manage'), input = parsed(inviteSchema, raw);
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const r = await roundIn(tx, c, id); assertCurrent(input.version, r.version); assertOpen(r.status, r.deadline);
    const p = await paperIn(tx, c, r.submissionId); if (!currentSource(p, r)) throw new AccessError(409, 'Bildiri değişti; bu turu kapatıp yeni sürümle tur açın.');
    const member = await tx.congressMembership.findFirst({ where: { congressId: c.congress.id, userId: input.reviewerId, active: true, role: 'REVIEWER', user: { active: true, organizations: { some: { organizationId: c.congress.organizationId, active: true } } } }, include: { user: true } });
    if (!member) throw new AccessError(400, 'Bu kongrenin aktif hakem hesabını seçin; yeni hakemi önce Ekip ekranından davet edin.');
    if (isAuthor(member.user.email, p.draftOwnerEmail, p.authors)) throw new AccessError(409, 'Bildiri sahibi veya yazar kendi bildirisinin hakemi olamaz.');
    if (r.assignments.some(a => a.reviewerId === input.reviewerId)) throw new AccessError(409, 'Hakem bu turda zaten atanmış; yeni hakem seçin.');
    const a = await tx.reviewAssignment.create({ data: { roundId: id, reviewerId: member.userId, reviewerName: member.user.name, inviteReason: input.reason } });
    await tx.reviewRound.update({ where: { id }, data: { version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'review.invite', a.id, { roundId: id, reviewerId: member.userId, reason: input.reason }) });
    if (input.notify) await notify(tx, c, member.user.email, `review-invite:${a.id}`, `Hakem daveti / Review invitation\nTur ${r.number} · ${a.id}\nSon tarih / Deadline: ${r.deadline.toISOString()}\nDavet, çıkar çatışması beyanı ve değerlendirme kişisel hesabınızla yapılır.\n${process.env.APP_BASE_URL}/admin/hakemlik/gorevler/${a.id}`, a.id);
    return { id: a.id };
  }));
}
async function own(tx: Prisma.TransactionClient, c: CongressContext, id: string) {
  const a = await tx.reviewAssignment.findFirst({ where: { id, reviewerId: c.actor.id, round: { congressId: c.congress.id } }, select: { ...assignmentSelect, round: { select: roundSelect } } });
  if (!a) throw new AccessError(404, 'Size atanmış görev bulunamadı.');
  const p = await paperIn(tx, c, a.round.submissionId); if (isAuthor(c.actor.email, p.draftOwnerEmail, p.authors)) throw new AccessError(403, 'Yazar kimliği değişti; görevi çıkar çatışması için editöre bildirin.');
  return a;
}
export async function reviewerTasks() {
  const c = await context('reviews.perform');
  const list = await prisma.reviewAssignment.findMany({ where: { reviewerId: c.actor.id, round: { congressId: c.congress.id } }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, status: true, round: { select: { number: true, mode: true, status: true, content: true, deadline: true } } } });
  return list.map(a => ({ id: a.id, status: a.status, roundNumber: a.round.number, roundStatus: a.round.status, mode: a.round.mode, deadline: a.round.deadline.toISOString(), title: contentSchema.parse(a.round.content).titleTr || contentSchema.parse(a.round.content).titleEn }));
}
export async function reviewerDetail(id: string) {
  const c = await context('reviews.perform'), a = await own(prisma, c, id), r = a.round;
  const p = await paperIn(prisma, c, r.submissionId);
  const source = r.snapshot as { authors: Array<{ fullName: string; institution: string | null }> };
  return { sourceCurrent: currentSource(p, r), id: a.id, version: a.version, status: a.status, roundId: r.id, roundNumber: r.number, roundStatus: r.status, mode: r.mode, deadline: r.deadline.toISOString(), content: reviewProjection(contentSchema.parse(r.content), r.mode, source.authors), criteria: criteriaSchema.parse(r.criteria), fileExists: !!r.fileHash, fileAvailable: !!r.fileHash && r.status !== 'CANCELLED' && ['ACCEPTED', 'SUBMITTED'].includes(a.status), draft: a.draft as unknown as ReturnType<typeof evaluationSchema.parse> | null, evaluation: a.evaluation ? { scores: a.evaluation.scores as Record<string, number>, recommendation: a.evaluation.recommendation, authorComment: a.evaluation.authorComment, internalComment: a.evaluation.internalComment, submittedAt: a.evaluation.createdAt.toISOString() } : null };
}
export type ReviewerDetail = Awaited<ReturnType<typeof reviewerDetail>>;
export async function respondInvitation(id: string, raw: unknown) {
  const c = await context('reviews.perform'), input = parsed(responseSchema, raw);
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const a = await own(tx, c, id); assertCurrent(input.version, a.version);
    if (input.response === 'CONFLICT' && a.status === 'ACCEPTED') { if (a.round.status !== 'OPEN') throw new AccessError(409, 'Tur kapalı.'); } else assertOpen(a.round.status, a.round.deadline);
    if (a.status !== 'INVITED' && !(input.response === 'CONFLICT' && a.status === 'ACCEPTED')) throw new AccessError(409, 'Davet zaten yanıtlandı.');
    if (input.response === 'ACCEPT' && !currentSource(await paperIn(tx, c, a.round.submissionId), a.round)) throw new AccessError(409, 'Bildiri sürümü değişti; eski tur daveti kabul edilemez.');
    if ((input.response === 'ACCEPT' && input.conflict) || (input.response === 'CONFLICT' && !input.conflict)) throw new AccessError(400, 'Çıkar çatışması varsa kabul edilemez; çatışmayı bildirin.');
    const status = input.response === 'ACCEPT' ? 'ACCEPTED' : input.response === 'DECLINE' ? 'DECLINED' : 'CONFLICT';
    await tx.reviewAssignment.update({ where: { id }, data: { status, version: { increment: 1 }, responseReason: input.reason, conflict: input.conflict, respondedAt: new Date() } });
    await tx.reviewRound.update({ where: { id: a.roundId }, data: { version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'review.invitation.respond', id, { status, conflict: input.conflict, reason: input.reason }) });
    return { ok: true };
  }));
}
export async function saveEvaluation(id: string, raw: unknown, evidence: ReviewBinary | null = null, imported = false) {
  const c = await context(imported ? 'reviews.manage' : 'reviews.perform'), input = imported ? parsed(importSchema, raw) : parsed(evaluationSchema, raw);
  const importReason = imported ? parsed(importSchema, raw).reason : null;
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c);
    const a = imported ? await tx.reviewAssignment.findFirst({ where: { id, round: { congressId: c.congress.id } }, select: { ...assignmentSelect, round: { select: roundSelect }, reviewer: { select: { email: true } } } }) : await own(tx, c, id);
    if (!a) throw new AccessError(404, 'Atama bulunamadı.'); assertCurrent(input.version, a.version); assertOpen(a.round.status, a.round.deadline);
    if (a.status !== 'ACCEPTED' || a.conflict !== false) throw new AccessError(409, 'Kabul edilmiş ve çıkar çatışması olmayan atama gerekli.');
    const p = await paperIn(tx, c, a.round.submissionId); if (!currentSource(p, a.round)) throw new AccessError(409, 'Bildiri değişti; editör yeni tur açmalı.');
    const reviewer = await tx.platformUser.findUniqueOrThrow({ where: { id: a.reviewerId } });
    const membership = await tx.congressMembership.findUnique({ where: { congressId_userId: { congressId: c.congress.id, userId: a.reviewerId } } });
    const organization = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: c.congress.organizationId, userId: a.reviewerId } } });
    if (!reviewer.active || !membership?.active || membership.role !== 'REVIEWER' || !organization?.active || isAuthor(reviewer.email, p.draftOwnerEmail, p.authors)) throw new AccessError(403, 'Hakem yetkisi veya çıkar çatışması durumu değişti.');
    validateScores(criteriaSchema.parse(a.round.criteria), input);
    if (imported && (!evidence || !input.submit)) throw new AccessError(400, 'Dış form eşleştirmesinde kanıt dosyası ve tamamlanmış değerlendirme gerekli.');
    if (input.submit) await tx.reviewEvaluation.create({ data: { assignmentId: id, scores: jsonValue(input.scores), recommendation: input.recommendation, authorComment: input.authorComment, internalComment: input.internalComment, submittedById: c.actor.id, submittedByName: c.actor.name, source: imported ? 'MANUAL_IMPORT' : 'REVIEWER', reason: importReason, ...(evidence ? { evidenceName: evidence.name, evidenceMime: evidence.mime, evidenceHash: evidence.hash, evidence: evidence.content } : {}) } });
    await tx.reviewAssignment.update({ where: { id }, data: { status: input.submit ? 'SUBMITTED' : a.status, version: { increment: 1 }, draft: input.submit ? Prisma.DbNull : jsonValue(input) } });
    await tx.reviewRound.update({ where: { id: a.roundId }, data: { version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, input.submit ? 'review.evaluation.submit' : 'review.evaluation.draft', id, { roundId: a.roundId, sourceVersion: a.round.sourceVersion, fileHash: a.round.fileHash, imported, ...(importReason ? { reason: importReason } : {}) }) });
    return { ok: true };
  }));
}
export async function manageRound(id: string, action: 'cancel' | 'deadline', raw: unknown) {
  const c = await context('reviews.manage'), input = action === 'cancel' ? parsed(cancelSchema, raw) : parsed(deadlineSchema, raw);
  const newDeadline = action === 'deadline' ? parsed(deadlineSchema, raw).deadline : null;
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const r = await roundIn(tx, c, id); assertCurrent(input.version, r.version); if (r.status !== 'OPEN') throw new AccessError(409, 'Tur kapalı.');
    await tx.reviewRound.update({ where: { id }, data: { version: { increment: 1 }, ...(action === 'cancel' ? { status: 'CANCELLED' } : { deadline: deadlineDate(newDeadline!) }) } });
    if (action === 'cancel') await tx.reviewAssignment.updateMany({ where: { roundId: id, status: { in: ['INVITED', 'ACCEPTED'] } }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, `review.round.${action}`, id, { reason: input.reason, beforeDeadline: r.deadline.toISOString(), ...(newDeadline ? { deadline: newDeadline } : {}) }) }); return { ok: true };
  }));
}
export async function cancelAssignment(id: string, raw: unknown) {
  const c = await context('reviews.manage'), input = parsed(cancelSchema, raw);
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const a = await tx.reviewAssignment.findFirst({ where: { id, round: { congressId: c.congress.id } }, include: { round: true } }); if (!a) throw new AccessError(404, 'Atama bulunamadı.'); assertCurrent(input.version, a.version);
    if (a.round.status !== 'OPEN' || !['INVITED', 'ACCEPTED'].includes(a.status)) throw new AccessError(409, 'Yalnız açık, teslim edilmemiş görev iptal edilir.');
    await tx.reviewAssignment.update({ where: { id }, data: { status: 'CANCELLED', version: { increment: 1 }, responseReason: input.reason } }); await tx.reviewRound.update({ where: { id: a.roundId }, data: { version: { increment: 1 } } });
    await tx.auditLog.create({ data: auditData(c, 'review.assignment.cancel', id, { reason: input.reason }) }); return { ok: true };
  }));
}
export async function decideRound(id: string, raw: unknown) {
  const c = await context('reviews.manage'), input = parsed(decisionSchema, raw);
  return reviewAction(() => prisma.$transaction(async tx => {
    await lock(tx, c); const r = await roundIn(tx, c, id), p = await paperIn(tx, c, r.submissionId); assertCurrent(input.version, r.version); assertCurrent(input.correctionVersion, p.correctionVersion);
    if (r.status !== 'OPEN' || !currentSource(p, r)) throw new AccessError(409, 'Tur kapalı veya değerlendirilmiş kaynak sürümü değişmiş.');
    const incomplete = !r.assignments.some(a => a.status === 'SUBMITTED') || r.assignments.some(a => ['INVITED', 'ACCEPTED'].includes(a.status));
    if (incomplete && !input.overrideIncomplete) throw new AccessError(409, 'Değerlendirmeler eksik. Bekleyin veya eksik değerlendirmeyle karar vermeyi gerekçesiyle açıkça seçin.');
    let revisionRequestId: string | undefined;
    if (input.requestFileRevision) {
      if (input.decision !== 'REVISE' || !input.revisionDeadline) throw new AccessError(400, 'Dosya düzeltme talebi yalnız revizyon kararı ve son tarihle açılır.');
      const expiresAt = deadlineDate(input.revisionDeadline); if (expiresAt.getTime() > Date.now() + 90 * 86400000) throw new AccessError(400, 'Dosya düzeltme süresi en fazla 90 gün.');
      if (await tx.submissionRevisionRequest.count({ where: { submissionId: p.id, status: { in: ['OPEN', 'SUBMITTED'] } } })) throw new AccessError(409, 'Açık dosya düzeltme talebi zaten var.');
      revisionRequestId = (await tx.submissionRevisionRequest.create({ data: { submissionId: p.id, baseVersion: p.correctionVersion, ownerEmail: p.draftOwnerEmail.toLowerCase(), expiresAt, reason: input.feedbackTr, createdById: c.actor.id, createdByName: c.actor.name } })).id;
    }
    const d = await tx.reviewDecision.create({ data: { roundId: id, decision: input.decision, reason: input.reason, feedbackTr: input.feedbackTr, feedbackEn: input.feedbackEn, publishReviews: input.publishReviews, sourceVersion: p.correctionVersion, actorId: c.actor.id, actorName: c.actor.name, overrideIncomplete: input.overrideIncomplete, revisionRequestId } });
    await tx.reviewRound.update({ where: { id }, data: { status: 'CLOSED', version: { increment: 1 } } });
    await tx.reviewAssignment.updateMany({ where: { roundId: id, status: { in: ['INVITED', 'ACCEPTED'] } }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    const status = input.decision === 'ACCEPT' ? 'ACCEPTED' : input.decision === 'REJECT' ? 'REJECTED' : 'UNDER_REVIEW';
    await tx.submission.update({ where: { id: p.id }, data: { status, reviewVersion: { increment: 1 } } });
    await tx.submissionStatusHistory.create({ data: { submissionId: p.id, fromStatus: p.status, toStatus: status, note: `P13 tur ${r.number} · ${stateLabels[input.decision]}: ${input.reason}` } });
    await tx.auditLog.create({ data: auditData(c, 'review.decision', d.id, { submissionId: p.id, roundId: id, decision: input.decision, sourceVersion: p.correctionVersion, publishReviews: input.publishReviews, overrideIncomplete: input.overrideIncomplete, reason: input.reason }) });
    if (input.notify) for (const email of new Set([p.draftOwnerEmail, ...p.authors.map(a => a.email)].map(e => e.toLowerCase()))) await notify(tx, c, email, `review-decision:${d.id}:${hash(email)}`, `Bildiri kararı / Paper decision: ${stateLabels[input.decision]}\n${input.feedbackTr}\n${input.feedbackEn}\n${process.env.APP_BASE_URL}/${c.congress.slug}/katilimci\nBu karar ödeme, program veya belge uygunluğu değildir.`, d.id);
    return { id: d.id, revisionRequestId };
  }));
}
export async function reviewFile(id: string, staff = false) {
  const c = await context(staff ? 'reviews.read' : 'reviews.perform');
  let roundId = id;
  if (!staff) { const a = await own(prisma, c, id); if (!['ACCEPTED', 'SUBMITTED'].includes(a.status) || a.conflict !== false || a.round.status === 'CANCELLED') throw new AccessError(403, 'Dosya yalnız daveti kabul eden, çatışması olmayan hakeme açıktır.'); roundId = a.roundId; }
  const r = await prisma.reviewRound.findFirst({ where: { id: roundId, congressId: c.congress.id }, select: { fileContent: true, fileMime: true, number: true } }); if (!r?.fileContent || !r.fileMime) throw new AccessError(404, 'Tur dosyası yok.');
  return privateFile(r.fileContent, r.fileMime, `review-round-${r.number}.${r.fileMime === 'application/pdf' ? 'pdf' : 'docx'}`);
}
export async function reviewEvidence(id: string) { const c = await context('reviews.read'); const e = await prisma.reviewEvaluation.findFirst({ where: { id, assignment: { round: { congressId: c.congress.id } } }, select: { evidence: true, evidenceName: true, evidenceMime: true } }); if (!e?.evidence || !e.evidenceName || !e.evidenceMime) throw new AccessError(404, 'Dış değerlendirme kanıtı bulunamadı.'); return privateFile(e.evidence, e.evidenceMime, e.evidenceName); }
export async function authorReviewResults(congressId: string, paperIds: string[]) {
  if (!paperIds.length) return [];
  const rounds = await prisma.reviewRound.findMany({ where: { congressId, submissionId: { in: paperIds }, decision: { isNot: null } }, select: { submissionId: true, number: true, mode: true, decision: { select: { decision: true, feedbackTr: true, feedbackEn: true, publishReviews: true, createdAt: true } }, assignments: { where: { status: 'SUBMITTED' }, select: { reviewerName: true, evaluation: { select: { scores: true, recommendation: true, authorComment: true } } } } }, orderBy: [{ submissionId: 'asc' }, { number: 'desc' }] });
  return rounds.map(r => ({ submissionId: r.submissionId, round: r.number, decision: r.decision!.decision, feedbackTr: r.decision!.feedbackTr, feedbackEn: r.decision!.feedbackEn, decidedAt: r.decision!.createdAt.toISOString(), reviews: r.decision!.publishReviews ? r.assignments.flatMap(a => a.evaluation ? [{ scores: a.evaluation.scores as Record<string, number>, recommendation: a.evaluation.recommendation, comment: a.evaluation.authorComment, ...(r.mode === 'OPEN' ? { reviewer: a.reviewerName } : {}) }] : []) : [] }));
}
