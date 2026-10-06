import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessionCookieName, secureSessionCookie } from '@/lib/environment';
import { AccessError } from './http';

export type FlowParent = { kind: 'PARTICIPANT' | 'PLATFORM'; id: string };
type Scope = 'SUBMISSION' | 'REGISTRATION';
const name = (scope: Scope) => sessionCookieName(scope === 'SUBMISSION' ? 'draft_access' : 'registration_access');
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function createFlowSession(scope: Scope, input: { congressId: string; email: string; submissionId?: string; parent?: FlowParent; accessTokenId?: string; accessTokenHash?: string }) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Congress" WHERE id = ${input.congressId} FOR UPDATE`;
    if (input.accessTokenId) {
      const access = await tx.registrationAccessToken.findFirst({ where: { id: input.accessTokenId, congressId: input.congressId, email: input.email, expiresAt: { gt: new Date() } } });
      if (!access) throw new AccessError(403, 'Kayıt erişim bağlantısı iptal edilmiş. Yeni bağlantı isteyin.');
    }
    if (scope === 'SUBMISSION' && input.accessTokenHash) {
      const access = await tx.submissionAccessToken.findFirst({ where: { tokenHash: input.accessTokenHash, submissionId: input.submissionId, email: input.email, expiresAt: { gt: new Date() } } });
      if (!access) throw new AccessError(403, 'Bildiri erişim bağlantısı iptal edilmiş. Yeni bağlantı isteyin.');
    }
    if (input.submissionId) {
      await tx.$queryRaw`SELECT id FROM "Submission" WHERE id = ${input.submissionId} FOR UPDATE`;
      const paper = await tx.submission.findFirst({ where: { id: input.submissionId, congressId: input.congressId, draftOwnerEmail: { equals: input.email, mode: 'insensitive' } } });
      if (!paper) throw new AccessError(403, 'Bildiri erişimi değişmiş. Yeni bağlantı isteyin.');
    }
    await tx.flowSession.create({ data: { congressId: input.congressId, submissionId: input.submissionId, email: input.email.toLowerCase(), scope, tokenHash: hash(token), expiresAt, parentKind: input.parent?.kind, parentId: input.parent?.id } });
  });
  (await cookies()).set(name(scope), token, { httpOnly: true, secure: secureSessionCookie(), sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
}
export async function readFlowSession(scope: Scope) {
  const raw = (await cookies()).get(name(scope))?.value;
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const row = await prisma.flowSession.findUnique({ where: { tokenHash: hash(raw) } });
  const now = new Date();
  if (!row || row.scope !== scope || row.revokedAt || row.expiresAt <= now) return null;
  if (row.parentKind === 'PARTICIPANT') {
    const parent = row.parentId ? await prisma.participantSession.findUnique({ where: { id: row.parentId } }) : null;
    if (!parent || parent.congressId !== row.congressId || parent.email !== row.email || parent.revokedAt || parent.expiresAt <= now) return null;
  } else if (row.parentKind === 'PLATFORM') {
    const parent = row.parentId ? await prisma.platformSession.findUnique({ where: { id: row.parentId }, include: { user: true } }) : null;
    if (!parent || parent.congressId !== row.congressId || parent.user.email.toLowerCase() !== row.email || !parent.user.active || parent.revokedAt || parent.expiresAt <= now) return null;
  } else if (row.parentKind || row.parentId) return null;
  if (scope === 'SUBMISSION') {
    const paper = row.submissionId ? await prisma.submission.findFirst({ where: { id: row.submissionId, congressId: row.congressId, draftOwnerEmail: { equals: row.email, mode: 'insensitive' } }, select: { id: true } }) : null;
    if (!paper) return null;
  }
  return row;
}
export async function clearFlowSession(scope: Scope) {
  const store = await cookies(), raw = store.get(name(scope))?.value;
  if (raw && /^[a-f0-9]{64}$/.test(raw)) await prisma.flowSession.updateMany({ where: { tokenHash: hash(raw), revokedAt: null }, data: { revokedAt: new Date() } });
  store.delete(name(scope));
}
