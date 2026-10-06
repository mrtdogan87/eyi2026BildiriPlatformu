import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import type { Prisma, SubmissionFile } from '@prisma/client';
import { AccessError } from '@/platform/http';
import { isValidDocx, isValidReceiptFile } from '@/lib/submission';
export type RevisionBinary = { originalName: string; mimeType: string; fileSize: number; content: Uint8Array<ArrayBuffer>; sha256: string };
export async function readRevisionBinary(raw: FormDataEntryValue | null, evidence = false): Promise<RevisionBinary | null> {
  if (raw === null) return null;
  if (!(raw instanceof File) || !raw.size || raw.name.length > 200 || /[\x00-\x1f]/.test(raw.name)) throw new AccessError(400, 'Geçerli dosya gerekli.');
  if (evidence ? !isValidReceiptFile(raw) || raw.size > 2 * 1024 * 1024 : !isValidDocx(raw)) throw new AccessError(400, evidence ? 'Kanıt en fazla 2 MB PDF/JPG/PNG olmalı.' : 'Dosya en fazla 10 MB DOCX olmalı.');
  const content = Buffer.from(await raw.arrayBuffer());
  if (!evidence) { try { const zip = await JSZip.loadAsync(content); if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) throw new Error(); } catch { throw new AccessError(400, 'Geçerli bir Word DOCX belgesi yükleyin.'); } }
  const mimeType = evidence ? (raw.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : raw.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg') : raw.type;
  return { originalName: raw.name, mimeType, fileSize: raw.size, content, sha256: createHash('sha256').update(content).digest('hex') };
}
export async function appendFileVersion(tx: Prisma.TransactionClient, submissionId: string, previous: SubmissionFile | null, binary: RevisionBinary, actor: { id?: string; name: string }, reason: string) {
  let last = await tx.submissionFileVersion.findFirst({ where: { submissionId }, orderBy: { number: 'desc' }, select: { number: true } });
  if (!last && previous) {
    if (!previous.content) throw new AccessError(409, 'Eski dosyanın içeriği bulunamadı; korunmadan dosya değiştirilemez.');
    last = await tx.submissionFileVersion.create({ data: { submissionId, number: 1, originalName: previous.originalName, mimeType: previous.mimeType, fileSize: previous.fileSize, content: previous.content, sha256: createHash('sha256').update(previous.content).digest('hex'), actorName: 'Önceki dosya kaydı', reason: 'Önceki güncel dosyanın P11 arşivine alınması', createdAt: previous.uploadedAt } });
  }
  const version = await tx.submissionFileVersion.create({ data: { submissionId, number: (last?.number ?? 0) + 1, ...binary, actorId: actor.id, actorName: actor.name, reason } });
  const pointer = { originalName: binary.originalName, mimeType: binary.mimeType, fileSize: binary.fileSize, content: binary.content, storageKey: `database:version:${version.id}`, uploadedAt: new Date() };
  await tx.submissionFile.upsert({ where: { submissionId }, create: { submissionId, ...pointer }, update: pointer });
  return version;
}
