import { z } from 'zod';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext, type CongressContext } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { auditData } from '@/platform/audit';
import { enqueueNotification } from '@/platform/notifications';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { emptyStructuredAbstract } from '@/modules/participation/abstract';
import { configuredAuthors, configuredDetails } from './submission-rules';
import { correctionSchema, fileCorrectionSchema, requestRevisionSchema, reviewRevisionSchema, changedFields, outputKinds, reasonSchema, type Snapshot } from '@/modules/revisions/configuration';
import { appendFileVersion, type RevisionBinary } from './revision-files';

function parse<T>(schema: z.ZodType<T>, raw: unknown) { const result = schema.safeParse(raw); if (!result.success) throw new AccessError(400, result.error.issues[0]?.message ?? 'Alanları kontrol edin.'); return result.data; }
async function lockedPaper(tx: Prisma.TransactionClient, congressId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${congressId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Submission" WHERE id = ${id} AND "congressId" = ${congressId} FOR UPDATE`;
  const paper = await tx.submission.findFirst({ where: { id, congressId, status: { not: 'DRAFT' } }, include: { congress: true, authors: { orderBy: { sortOrder: 'asc' } }, file: true, paperItem: { include: { registration: { include: { paperItems: true } } } } } });
  if (!paper) throw new AccessError(404, 'Gönderilmiş bildiri bulunamadı.');
  if (!(await tx.congressModule.findUnique({ where: { congressId_key: { congressId, key: 'SUBMISSIONS' } } }))?.enabled) throw new AccessError(403, 'Bildiri modülü kapalı.');
  return paper;
}
type Paper = Awaited<ReturnType<typeof lockedPaper>>;
function snapshot(p: Paper): Snapshot {
  return { submissionLanguage: p.submissionLanguage, titleTr: p.titleTr ?? '', titleEn: p.titleEn ?? '', abstractTr: p.abstractTr ?? '', abstractEn: p.abstractEn ?? '', keywordsTr: p.keywordsTr ?? '', keywordsEn: p.keywordsEn ?? '', structuredAbstract: p.structuredAbstract, draftOwnerEmail: p.draftOwnerEmail,
    authors: p.authors.map(a => ({ fullName: a.fullName, email: a.email, title: a.title ?? '', institution: a.institution ?? '', country: a.country ?? '', isPresenter: a.isPresenter })),
    file: p.file ? { name: p.file.originalName, size: p.file.fileSize, sha256: p.file.content ? createHash('sha256').update(p.file.content).digest('hex') : null } : null,
    registration: p.paperItem ? { id: p.paperItem.registrationId, email: p.paperItem.registration.email } : null };
}
async function invalidateEmails(tx: Prisma.TransactionClient, paper: Paper, emails: string[]) {
  const normalized = [...new Set(emails.map(email => email.toLowerCase()))], now = new Date();
  await tx.submissionAccessToken.updateMany({ where: { submissionId: paper.id }, data: { expiresAt: now } });
  await tx.flowSession.updateMany({ where: { congressId: paper.congressId, OR: [{ submissionId: paper.id }, { email: { in: normalized } }] }, data: { revokedAt: now } });
  await tx.registrationAccessToken.updateMany({ where: { congressId: paper.congressId, email: { in: normalized } }, data: { expiresAt: now } });
  await tx.participantAccessToken.updateMany({ where: { congressId: paper.congressId, email: { in: normalized } }, data: { expiresAt: now } });
  await tx.participantSession.updateMany({ where: { congressId: paper.congressId, email: { in: normalized } }, data: { revokedAt: now } });
  await tx.deliveryException.updateMany({ where: { congressId: paper.congressId, OR: [{ submissionId: paper.id }, { email: { in: normalized } }] }, data: { revokedAt: now } });
}
async function recordChange(tx: Prisma.TransactionClient, context: CongressContext, paper: Paper, before: Snapshot, after: Snapshot, kind: string, reason: string, evidence: RevisionBinary | null, notify: boolean, exceptRequestId?: string) {
  const fields = changedFields(before, after);
  if (!fields.length) throw new AccessError(400, 'Kaydedilecek bir değişiklik yok.');
  const change = await tx.submissionChangeLog.create({ data: { submissionId: paper.id, number: paper.correctionVersion + 1, kind, before: before as Prisma.InputJsonValue, after: after as Prisma.InputJsonValue, fields: fields as Prisma.InputJsonValue, reason, actorId: context.actor.id, actorName: context.actor.name,
    ...(evidence ? { evidenceName: evidence.originalName, evidenceMime: evidence.mimeType, evidenceSize: evidence.fileSize, evidenceHash: evidence.sha256, evidence: evidence.content } : {}) } });
  await tx.submission.update({ where: { id: paper.id }, data: { correctionVersion: { increment: 1 } } });
  const outputs = outputKinds(paper.status, fields.map(f => f.field), !!paper.paperItem);
  if (outputs.length) await tx.submissionOutputUpdate.createMany({ data: outputs.map(kind => ({ submissionId: paper.id, changeId: change.id, kind })) });
  await tx.submissionRevisionRequest.updateMany({ where: { submissionId: paper.id, status: { in: ['OPEN', 'SUBMITTED'] }, ...(exceptRequestId ? { id: { not: exceptRequestId } } : {}) }, data: { status: 'CANCELLED', version: { increment: 1 }, reviewedAt: new Date(), reviewerId: context.actor.id, reviewerName: context.actor.name, reviewReason: 'Başvuru yeni bir yönetici düzeltmesiyle güncellendi; eski talep kapatıldı.' } });
  await tx.auditLog.create({ data: auditData(context, 'submission.correction', paper.id, { changeId: change.id, version: change.number, fields: fields.map(f => f.field), reason, evidence: !!evidence }) });
  if (notify) {
    const previousEmails = (before.authors as Array<{ email: string }>).map(a => a.email);
    const nextEmails = (after.authors as Array<{ email: string }>).map(a => a.email);
    const recipients = [...new Set([String(before.draftOwnerEmail), String(after.draftOwnerEmail), ...previousEmails, ...nextEmails].map(e => e.toLowerCase()))];
    const en = paper.submissionLanguage === 'EN';
    for (const recipient of recipients) await enqueueNotification(tx, { congressId: paper.congressId, key: 'GENERAL', locale: en ? 'en' : 'tr', to: recipient, dedupeKey: `submission-change:${change.id}:${createHash('sha256').update(recipient).digest('hex')}`, module: 'SUBMISSIONS', sourceType: 'submission-change', sourceId: change.id,
      values: { congressName: paper.congress.name, recipientName: en ? 'Participant' : 'Katılımcı', message: en ? `A justified correction was recorded for your paper. Check your current records in the participant panel.\n\n${process.env.APP_BASE_URL}/${paper.congress.slug}/katilimci` : `Bildiriniz için gerekçeli düzeltme kaydedildi. Güncel kayıtlarınızı katılımcı panelinden kontrol edebilirsiniz.\n\n${process.env.APP_BASE_URL}/${paper.congress.slug}/katilimci` } });
  }
  return { changeId: change.id, version: change.number };
}
function versionMatches(paper: Paper, version: number) { if (paper.correctionVersion !== version) throw new AccessError(409, 'Bildiri başka bir işlemde değişti. Sayfayı yenileyin.'); }
export async function correctSubmission(id: string, raw: unknown, evidence: RevisionBinary | null) {
  const context = await requireContext('submissions.correct', 'SUBMISSIONS'), input = parse(correctionSchema, raw);
  return prisma.$transaction(async tx => {
    const paper = await lockedPaper(tx, context.congress.id, id); versionMatches(paper, input.version);
    const config = effectiveConfiguration(paper.congress.configuration), before = snapshot(paper);
    const details = configuredDetails(input.details, config), authors = configuredAuthors(input.authors, config);
    if (!authors.some(a => a.email === input.draftOwnerEmail)) throw new AccessError(400, 'Taslak sahibi yazarlar arasında olmalı.');
    for (const author of authors) if (await tx.submissionAuthor.count({ where: { email: { equals: author.email, mode: 'insensitive' }, submission: { congressId: paper.congressId, id: { not: paper.id }, submittedAt: { not: null } } } }) >= 2) throw new AccessError(400, 'Bir yazar bu kongrede en fazla iki bildiride yer alabilir.');
    const oldPresenter = paper.authors.find(a => a.isPresenter)?.email.toLowerCase(), newPresenter = authors.find(a => a.isPresenter)!.email;
    if (paper.paperItem && oldPresenter !== newPresenter) {
      const registration = paper.paperItem.registration;
      if (input.registrationHandling === 'UPDATE') {
        if (registration.email.toLowerCase() !== oldPresenter || registration.paperItems.length !== 1) throw new AccessError(409, 'Ortak kayıt veya farklı kayıt sahibi var. Kayıt kontrolü seçeneğiyle gerekçeli takip açın.');
        await tx.registration.update({ where: { id: registration.id }, data: { email: newPresenter } });
      }
    }
    const oldEmails = [paper.draftOwnerEmail.toLowerCase(), ...paper.authors.map(a => a.email.toLowerCase())], nextEmails = [input.draftOwnerEmail, ...authors.map(a => a.email)];
    const identityChanged = paper.draftOwnerEmail.toLowerCase() !== input.draftOwnerEmail || oldEmails.some(e => !nextEmails.includes(e)) || nextEmails.some(e => !oldEmails.includes(e));
    if (identityChanged) await invalidateEmails(tx, paper, [...oldEmails, ...nextEmails]);
    await tx.submission.update({ where: { id }, data: { submissionLanguage: details.submissionLanguage, titleTr: details.titleTr.trim(), titleEn: details.titleEn.trim(), abstractTr: details.abstractTr.trim(), abstractEn: details.abstractEn.trim(), keywordsTr: details.keywordsTr.trim(), keywordsEn: details.keywordsEn.trim(), structuredAbstract: config.structuredAbstract.enabled ? details.structuredAbstract : Prisma.JsonNull, draftOwnerEmail: input.draftOwnerEmail } });
    await tx.submissionAuthor.deleteMany({ where: { submissionId: id } });
    await tx.submissionAuthor.createMany({ data: authors.map((author, sortOrder) => ({ ...author, submissionId: id, sortOrder })) });
    const afterPaper = await lockedPaper(tx, paper.congressId, id);
    return recordChange(tx, context, paper, before, snapshot(afterPaper), 'METADATA', input.reason, evidence, input.notify);
  }, { timeout: 20000 });
}
export async function correctFile(id: string, raw: unknown, binary: RevisionBinary | null, evidence: RevisionBinary | null) {
  const context = await requireContext('submissions.correct', 'SUBMISSIONS'), input = parse(fileCorrectionSchema, raw);
  if (!!binary === !!input.restoreVersionId) throw new AccessError(400, 'Yeni dosya veya geri alınacak sürümden birini seçin.');
  return prisma.$transaction(async tx => {
    const paper = await lockedPaper(tx, context.congress.id, id); versionMatches(paper, input.version);
    let file = binary;
    if (input.restoreVersionId) { const old = await tx.submissionFileVersion.findFirst({ where: { id: input.restoreVersionId, submissionId: id } }); if (!old) throw new AccessError(404, 'Dosya sürümü bulunamadı.'); file = { originalName: old.originalName, mimeType: old.mimeType, fileSize: old.fileSize, sha256: old.sha256, content: Buffer.from(old.content) }; }
    const before = snapshot(paper);
    const version = await appendFileVersion(tx, id, paper.file, file!, { id: context.actor.id, name: context.actor.name }, input.reason);
    const after = { ...before, file: { name: version.originalName, size: version.fileSize, sha256: version.sha256, version: version.number } };
    return recordChange(tx, context, paper, before, after, input.restoreVersionId ? 'FILE_RESTORE' : 'FILE', input.reason, evidence, input.notify);
  });
}
export async function revisionOverview(id: string) {
  const context = await requireContext('submissions.read', 'SUBMISSIONS');
  const paper = await prisma.submission.findFirst({ where: { id, congressId: context.congress.id, status: { not: 'DRAFT' } }, include: { congress: true, authors: { orderBy: { sortOrder: 'asc' } }, file: true, paperItem: { include: { registration: true } } } });
  if (!paper) throw new AccessError(404, 'Bildiri bulunamadı.');
  const [files, changes, requests, outputs] = await Promise.all([
    prisma.submissionFileVersion.findMany({ where: { submissionId: id }, orderBy: { number: 'desc' }, select: { id: true, number: true, originalName: true, fileSize: true, sha256: true, actorName: true, reason: true, createdAt: true } }),
    prisma.submissionChangeLog.findMany({ where: { submissionId: id }, orderBy: { number: 'desc' }, select: { id: true, number: true, kind: true, fields: true, reason: true, actorName: true, createdAt: true, evidenceName: true } }),
    prisma.submissionRevisionRequest.findMany({ where: { submissionId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, version: true, reason: true, expiresAt: true, ownerEmail: true, comment: true, fileName: true, fileSize: true, fileHash: true, reviewReason: true, createdByName: true, reviewerName: true } }),
    prisma.submissionOutputUpdate.findMany({ where: { submissionId: id }, orderBy: { createdAt: 'desc' } }),
  ]);
  return JSON.parse(JSON.stringify({ id, version: paper.correctionVersion, status: paper.status, workflow: effectiveConfiguration(paper.congress.configuration), draftOwnerEmail: paper.draftOwnerEmail,
    details: { submissionLanguage: paper.submissionLanguage ?? 'TR', titleTr: paper.titleTr ?? '', titleEn: paper.titleEn ?? '', abstractTr: paper.abstractTr ?? '', abstractEn: paper.abstractEn ?? '', keywordsTr: paper.keywordsTr ?? '', keywordsEn: paper.keywordsEn ?? '', structuredAbstract: paper.structuredAbstract ?? emptyStructuredAbstract() },
    authors: paper.authors.map(a => ({ fullName: a.fullName, email: a.email, title: a.title ?? '', institution: a.institution ?? '', country: a.country ?? '', isPresenter: a.isPresenter })), registration: paper.paperItem ? { id: paper.paperItem.registrationId, email: paper.paperItem.registration.email } : null, legacyFile: paper.file && !files.length ? { originalName: paper.file.originalName } : null, files, changes, requests, outputs })) as RevisionOverview;
}
export type RevisionOverview = { id: string; version: number; status: string; workflow: ReturnType<typeof effectiveConfiguration>; draftOwnerEmail: string; details: z.infer<typeof correctionSchema>['details']; authors: z.infer<typeof correctionSchema>['authors']; registration: { id: string; email: string } | null; legacyFile: { originalName: string } | null;
  files: Array<{ id: string; number: number; originalName: string; fileSize: number; sha256: string; actorName: string; reason: string; createdAt: string }>; changes: Array<{ id: string; number: number; kind: string; fields: Array<{ field: string; before: unknown; after: unknown }>; reason: string; actorName: string; createdAt: string; evidenceName: string | null }>; requests: Array<{ id: string; status: string; version: number; reason: string; expiresAt: string; ownerEmail: string; comment: string | null; fileName: string | null; fileSize: number | null; fileHash: string | null; reviewReason: string | null; createdByName: string; reviewerName: string | null }>; outputs: Array<{ id: string; kind: string; status: string; note: string | null; resolvedByName: string | null; resolvedAt: string | null; changeId: string }> };
export async function requestFileRevision(id: string, raw: unknown) {
  const context = await requireContext('submissions.correct', 'SUBMISSIONS'), input = parse(requestRevisionSchema, raw), expiresAt = new Date(input.expiresAt);
  if (expiresAt <= new Date() || expiresAt.getTime() > Date.now() + 30 * 86400000) throw new AccessError(400, 'Düzeltme süresi gelecek 30 gün içinde olmalı.');
  return prisma.$transaction(async tx => {
    const paper = await lockedPaper(tx, context.congress.id, id); versionMatches(paper, input.version);
    if (await tx.submissionRevisionRequest.count({ where: { submissionId: id, status: { in: ['OPEN', 'SUBMITTED'] } } })) throw new AccessError(409, 'Önce mevcut düzeltme talebini kapatın.');
    const revision = await tx.submissionRevisionRequest.create({ data: { submissionId: id, baseVersion: paper.correctionVersion, reason: input.reason, ownerEmail: paper.draftOwnerEmail.toLowerCase(), expiresAt, createdById: context.actor.id, createdByName: context.actor.name } });
    await tx.auditLog.create({ data: auditData(context, 'submission.revision.request', id, { requestId: revision.id, reason: input.reason, expiresAt: input.expiresAt }) });
    if (input.notify) await enqueueNotification(tx, { congressId: paper.congressId, key: 'GENERAL', locale: paper.submissionLanguage === 'EN' ? 'en' : 'tr', to: revision.ownerEmail, dedupeKey: `revision-request:${revision.id}`, module: 'SUBMISSIONS', sourceType: 'submission-revision-request', sourceId: revision.id,
      values: { congressName: paper.congress.name, recipientName: 'Participant / Katılımcı', message: `DOCX düzeltmesi istendi / DOCX revision requested.\n${input.reason}\n${input.expiresAt}\n\n${process.env.APP_BASE_URL}/${paper.congress.slug}/katilimci\n\nKatılımcı panelinde e-posta adresinizi doğrulayın. / Verify your email in the participant panel.` } });
    return { id: revision.id };
  });
}
export async function reviewFileRevision(id: string, requestId: string, raw: unknown) {
  const context = await requireContext('submissions.correct', 'SUBMISSIONS'), input = parse(reviewRevisionSchema, raw);
  return prisma.$transaction(async tx => {
    const paper = await lockedPaper(tx, context.congress.id, id);
    const revision = await tx.submissionRevisionRequest.findFirst({ where: { id: requestId, submissionId: id } });
    if (!revision) throw new AccessError(404, 'Düzeltme talebi bulunamadı.');
    if (revision.version !== input.version || !['OPEN', 'SUBMITTED'].includes(revision.status)) throw new AccessError(409, 'Düzeltme talebi değişti veya kapandı.');
    if (input.decision !== 'CANCELLED' && revision.status !== 'SUBMITTED') throw new AccessError(400, 'Önce katılımcı dosyayı göndermeli.');
    let result: { changeId: string; version: number } | undefined;
    if (input.decision === 'APPROVED') {
      versionMatches(paper, revision.baseVersion);
      if (!revision.content || !revision.fileName || !revision.fileHash || !revision.fileMime || !revision.fileSize || revision.ownerEmail !== paper.draftOwnerEmail.toLowerCase()) throw new AccessError(409, 'Dosya veya bildiri sahibi değişmiş.');
      const before = snapshot(paper), version = await appendFileVersion(tx, id, paper.file, { originalName: revision.fileName, mimeType: revision.fileMime, fileSize: revision.fileSize, content: Buffer.from(revision.content), sha256: revision.fileHash }, { id: context.actor.id, name: context.actor.name }, input.reason);
      result = await recordChange(tx, context, paper, before, { ...before, file: { name: version.originalName, size: version.fileSize, sha256: version.sha256, version: version.number } }, 'PARTICIPANT_FILE', input.reason, null, input.notify, revision.id);
    }
    await tx.submissionRevisionRequest.update({ where: { id: requestId }, data: { status: input.decision, version: { increment: 1 }, reviewedAt: new Date(), reviewerId: context.actor.id, reviewerName: context.actor.name, reviewReason: input.reason } });
    await tx.auditLog.create({ data: auditData(context, 'submission.revision.review', id, { requestId, decision: input.decision, reason: input.reason }) });
    return { ok: true, ...result };
  });
}
export async function resolveOutputUpdate(id: string, outputId: string, raw: unknown) {
  const context = await requireContext('submissions.correct', 'SUBMISSIONS'), input = parse(z.object({ note: reasonSchema }).strict(), raw);
  return prisma.$transaction(async tx => {
    await lockedPaper(tx, context.congress.id, id);
    const updated = await tx.submissionOutputUpdate.updateMany({ where: { id: outputId, submissionId: id, status: 'PENDING' }, data: { status: 'RESOLVED', note: input.note, resolvedById: context.actor.id, resolvedByName: context.actor.name, resolvedAt: new Date() } });
    if (!updated.count) throw new AccessError(409, 'Takip kaydı bulunamadı veya zaten kapandı.');
    await tx.auditLog.create({ data: auditData(context, 'submission.output.resolve', id, { outputId, note: input.note }) });
    return { ok: true };
  });
}
export async function revisionDownload(id: string, type: 'file' | 'evidence' | 'proposal', entryId: string) {
  const context = await requireContext('submissions.read', 'SUBMISSIONS');
  const scope = { submissionId: id, submission: { congressId: context.congress.id, status: { not: 'DRAFT' as const } } };
  if (type === 'file') { const row = await prisma.submissionFileVersion.findFirst({ where: { id: entryId, ...scope } }); if (!row) throw new AccessError(404, 'Dosya bulunamadı.'); return { content: row.content, mimeType: row.mimeType, originalName: row.originalName }; }
  if (type === 'evidence') { const row = await prisma.submissionChangeLog.findFirst({ where: { id: entryId, ...scope } }); if (!row?.evidence) throw new AccessError(404, 'Kanıt bulunamadı.'); return { content: row.evidence, mimeType: row.evidenceMime!, originalName: row.evidenceName! }; }
  const row = await prisma.submissionRevisionRequest.findFirst({ where: { id: entryId, ...scope } }); if (!row?.content) throw new AccessError(404, 'Önerilen dosya bulunamadı.'); return { content: row.content, mimeType: row.fileMime!, originalName: row.fileName! };
}
export async function participantRevision(id: string, identity: { congressId: string; email: string }) {
  const row = await prisma.submissionRevisionRequest.findFirst({ where: { id, ownerEmail: identity.email.toLowerCase(), submission: { congressId: identity.congressId, draftOwnerEmail: { equals: identity.email, mode: 'insensitive' }, status: { not: 'DRAFT' } } }, select: { id: true, status: true, version: true, reason: true, expiresAt: true, comment: true, fileName: true, reviewReason: true, submission: { select: { titleTr: true, titleEn: true, congressId: true } } } });
  if (!row) throw new AccessError(404, 'Düzeltme talebi bulunamadı.');
  if (!(await prisma.congressModule.findUnique({ where: { congressId_key: { congressId: identity.congressId, key: 'SUBMISSIONS' } } }))?.enabled) throw new AccessError(403, 'Bildiri modülü kapalı.');
  return { ...row, expiresAt: row.expiresAt.toISOString() };
}
export async function submitParticipantRevision(id: string, identity: { congressId: string; email: string }, raw: unknown, binary: RevisionBinary | null) {
  const input = parse(z.object({ version: z.number().int().min(1), comment: reasonSchema }).strict(), raw);
  if (!binary) throw new AccessError(400, 'DOCX dosyası gerekli.');
  return prisma.$transaction(async tx => {
    const ref = await tx.submissionRevisionRequest.findFirst({ where: { id }, select: { submissionId: true } }); if (!ref) throw new AccessError(404, 'Düzeltme talebi bulunamadı.');
    const paper = await lockedPaper(tx, identity.congressId, ref.submissionId);
    const revision = await tx.submissionRevisionRequest.findFirst({ where: { id, ownerEmail: identity.email.toLowerCase() } });
    if (!revision || paper.draftOwnerEmail.toLowerCase() !== identity.email.toLowerCase()) throw new AccessError(404, 'Düzeltme talebi bulunamadı.');
    if (revision.status !== 'OPEN' || revision.version !== input.version || revision.baseVersion !== paper.correctionVersion || revision.expiresAt <= new Date()) throw new AccessError(409, 'Düzeltme süresi dolmuş, gönderilmiş veya bildiri değişmiş.');
    await tx.submissionRevisionRequest.update({ where: { id }, data: { status: 'SUBMITTED', version: { increment: 1 }, comment: input.comment, submitterEmail: identity.email, submittedAt: new Date(), fileName: binary.originalName, fileMime: binary.mimeType, fileSize: binary.fileSize, fileHash: binary.sha256, content: binary.content } });
    await tx.auditLog.create({ data: { congressId: identity.congressId, organizationId: paper.congress.organizationId, action: 'submission.revision.propose', targetId: paper.id, detail: { requestId: id, fileHash: binary.sha256 } } });
    return { ok: true };
  });
}
