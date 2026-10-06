import { createHash, randomUUID } from 'node:crypto';

const MODULES = new Set(['SUBMISSIONS', 'REGISTRATION', 'CMS', 'REVIEWS', 'PROGRAM', 'ACTIVITIES', 'CERTIFICATES']);
const PROVIDERS = new Set(['capture', 'smtp', 'resend']);
const SUMMARY = Object.freeze({
  TEMPORARY_FAILURE: 'The provider temporarily refused the message.',
  RATE_LIMITED: 'The provider requested a later attempt.',
  RECIPIENT_REJECTED: 'The recipient was permanently rejected.',
  PROVIDER_CONFIGURATION: 'The selected provider configuration needs attention.',
  PROVIDER_REJECTED: 'The provider permanently refused the message.',
  DELIVERY_UNKNOWN: 'Provider acceptance could not be confirmed. Automatic retry is disabled.',
  LEASE_EXPIRED: 'The worker stopped before recording an outcome.',
  RETRY_LIMIT: 'The automatic retry limit was reached.',
  MESSAGE_EXPIRED: 'The access link expired before delivery.',
  SOURCE_INVALID: 'The access token was replaced, used or is no longer valid.',
  MODULE_DISABLED: 'The source module is disabled.',
  CAPTURE_IO: 'The local capture could not be written.',
  PROVIDER_CHANGED: 'The selected provider differs from the previous attempt.',
});

function failure(code) { return Object.assign(new Error(code), { code }); }
function boundedString(value, max, required = true) {
  if ((!required && value == null)) return null;
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max || value.includes('\0')) throw failure('INVALID_EMAIL_MESSAGE');
  return value;
}

// A transport accepts exactly one mailbox. Display names and header injection are forbidden.
export function normalizeRecipient(value) {
  const email = boundedString(value, 254).trim().toLowerCase();
  if (!/^[^\s<>@,;()\[\]"\\]+@[^\s<>@,;()\[\]"\\]+\.[^\s<>@,;()\[\]"\\]+$/.test(email)) throw failure('INVALID_EMAIL_RECIPIENT');
  return email;
}

export async function enqueueMessage(tx, input) {
  const expiresAt = input.expiresAt == null ? null : new Date(input.expiresAt);
  if (expiresAt && !Number.isFinite(expiresAt.getTime())) throw failure('INVALID_EMAIL_MESSAGE');
  if (!['tr', 'en'].includes(input.locale) || (input.module != null && !MODULES.has(input.module))) throw failure('INVALID_EMAIL_MESSAGE');
  if (input.templateVersion != null && (!Number.isSafeInteger(input.templateVersion) || input.templateVersion < 1)) throw failure('INVALID_EMAIL_MESSAGE');
  const data = {
    congressId: boundedString(input.congressId, 128),
    dedupeKey: boundedString(input.dedupeKey, 512),
    templateKey: boundedString(input.templateKey, 100),
    templateVersion: input.templateVersion ?? 1,
    locale: input.locale,
    recipient: normalizeRecipient(input.recipient),
    subject: boundedString(input.subject, 998),
    text: boundedString(input.text, 100000),
    html: boundedString(input.html, 400000),
    module: input.module ?? null,
    replyTo: input.replyTo ? normalizeRecipient(input.replyTo) : null,
    sourceType: boundedString(input.sourceType, 100, false),
    sourceId: boundedString(input.sourceId, 128, false),
    expiresAt,
  };
  if (/[\r\n]/.test(data.subject)) throw failure('INVALID_EMAIL_MESSAGE');
  const payloadHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  // Native one-table upsert also handles concurrent business requests with the same event key.
  const row = await tx.emailMessage.upsert({
    where: { congressId_dedupeKey: { congressId: data.congressId, dedupeKey: data.dedupeKey } },
    create: { id: randomUUID(), ...data, payloadHash }, update: { dedupeKey: data.dedupeKey },
  });
  if (row.payloadHash !== payloadHash) throw failure('EMAIL_DEDUPE_CONFLICT');
  return row;
}

export function retryDelay(attempt) {
  return Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.max(0, Math.min(attempt - 1, 20)));
}

function safeCode(code, fallback) { return typeof code === 'string' && Object.hasOwn(SUMMARY, code) ? code : fallback; }
function clockDate(now) { return now ? new Date(now) : new Date(); }

async function sourceIsValid(prisma, message, now) {
  // Preview samples never represent live tokens and must never enter a real transport.
  if (message.sourceType === 'TEMPLATE_TEST') return message.provider === 'capture' && message.recipient.endsWith('.invalid');
  if (message.sourceType === 'certificate-file') {
    const f=await prisma.certificateFile.findUnique({where:{id:message.sourceId},include:{certificate:{include:{recipient:true,files:{orderBy:{number:'desc'},take:1,select:{id:true}}}}}});
    return !!f && f.certificate.recipient.congressId===message.congressId && f.certificate.recipient.email===message.recipient && f.certificate.status==='READY' && f.certificate.files[0]?.id===f.id && f.recipientVersion===f.certificate.recipient.version;
  }
  if (message.sourceType === 'activity-booking') {
    const enabled = await prisma.congressModule.findUnique({where:{congressId_key:{congressId:message.congressId,key:'ACTIVITIES'}}});
    const history = await prisma.activityBookingEvent.findUnique({where:{id:message.sourceId},include:{booking:{include:{event:true}}}});
    const booking = history?.booking;
    return !!enabled?.enabled && !!booking && booking.event.congressId === message.congressId && booking.email === message.recipient && booking.version === history.snapshot?.bookingVersion;
  }
  if (message.sourceType === 'program-duty') {
    const enabled = await prisma.congressModule.findUnique({where:{congressId_key:{congressId:message.congressId,key:'PROGRAM'}}});
    const duty = await prisma.programDuty.findUnique({where:{id:message.sourceId},include:{person:true,session:true}});
    return !!enabled?.enabled && !!duty && duty.session.congressId === message.congressId && duty.session.active && duty.session.endsAt > now && duty.person.active && duty.person.email === message.recipient && duty.status === 'INVITED';
  }
  if (message.sourceType === 'review-invitation' || message.sourceType === 'review-decision') {
    const modules = await prisma.congressModule.findMany({ where: { congressId: message.congressId, key: { in: ['REVIEWS', 'SUBMISSIONS'] }, enabled: true } });
    if (modules.length !== 2) return false;
    if (message.sourceType === 'review-invitation') {
      const a = await prisma.reviewAssignment.findUnique({ where: { id: message.sourceId }, include: { reviewer: true, round: { include: { congress: true, submission: { include: { authors: true } } } } } });
      if (!a || a.round.congressId !== message.congressId || a.status !== 'INVITED' || a.round.status !== 'OPEN' || a.round.deadline <= now || a.round.sourceVersion !== a.round.submission.correctionVersion || !a.reviewer.active || a.reviewer.email.toLowerCase() !== message.recipient) return false;
      const member = await prisma.congressMembership.findUnique({ where: { congressId_userId: { congressId: message.congressId, userId: a.reviewerId } } });
      const org = await prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: a.round.congress.organizationId, userId: a.reviewerId } } });
      return !!(org?.active && member?.active && member.role === 'REVIEWER') && ![a.round.submission.draftOwnerEmail, ...a.round.submission.authors.map(author => author.email)].some(email => email.toLowerCase() === message.recipient);
    }
    const d = await prisma.reviewDecision.findUnique({ where: { id: message.sourceId }, include: { round: { include: { submission: { include: { authors: true } } } } } });
    if (!d || d.round.congressId !== message.congressId) return false;
    const latest = await prisma.reviewRound.findFirst({ where: { submissionId: d.round.submissionId }, orderBy: { number: 'desc' }, select: { id: true } });
    return latest?.id === d.roundId && [d.round.submission.draftOwnerEmail, ...d.round.submission.authors.map(author => author.email)].some(email => email.toLowerCase() === message.recipient);
  }
  const authSources = { DRAFT_ACCESS: 'submission-access-token', REGISTRATION_ACCESS: 'registration-access-token', PARTICIPANT_ACCESS: 'participant-access-token', ACCOUNT_ACTIVATION: 'activation-token' };
  const expectedSource = authSources[message.templateKey];
  if (!expectedSource) return true;
  if (message.sourceType !== expectedSource || !message.sourceId) return false;
  let token;
  if (expectedSource === 'submission-access-token') {
    token = await prisma.submissionAccessToken.findUnique({ where: { id: message.sourceId }, include: { submission: { select: { congressId: true } } } });
    if (!token || token.email.toLowerCase() !== message.recipient || token.submission.congressId !== message.congressId) return false;
  } else if (expectedSource === 'registration-access-token') {
    token = await prisma.registrationAccessToken.findUnique({ where: { id: message.sourceId } });
    if (!token || token.email.toLowerCase() !== message.recipient || token.congressId !== message.congressId) return false;
  } else if (expectedSource === 'participant-access-token') {
    token = await prisma.participantAccessToken.findUnique({ where: { id: message.sourceId }, include: { congress: { select: { modules: { where: { key: { in: ['SUBMISSIONS', 'REGISTRATION', 'PROGRAM', 'ACTIVITIES', 'CERTIFICATES'] }, enabled: true }, select: { key: true } } } } } });
    if (!token || token.email.toLowerCase() !== message.recipient || token.congressId !== message.congressId || !token.congress.modules.length) return false;
  } else {
    token = await prisma.activationToken.findUnique({
      where: { id: message.sourceId },
      include: { user: { select: {
        email: true, active: true, passwordHash: true,
        congresses: { where: { congressId: message.congressId, active: true }, select: { congress: { select: { organizationId: true } } } },
        organizations: { where: { active: true }, select: { organizationId: true } },
      } } },
    });
    if (!token || token.user.email.toLowerCase() !== message.recipient || !token.user.active || token.user.passwordHash) return false;
    const membership = token.user.congresses[0];
    if (!membership || !token.user.organizations.some(org => org.organizationId === membership.congress.organizationId)) return false;
  }
  return !token.usedAt && new Date(token.expiresAt) > now;
}

async function finish(prisma, message, leaseToken, status, now, details = {}) {
  return prisma.$transaction(async tx => {
    const changed = await tx.emailMessage.updateMany({
      where: { id: message.id, status: 'PROCESSING', leaseToken },
      data: {
        status, leaseToken: null, leaseUntil: null, version: { increment: 1 },
        ...(status === 'RETRY' ? { nextAttemptAt: new Date(now.getTime() + retryDelay(message.attempts)) } : {}),
        ...(details.providerId ? { providerId: details.providerId } : {}),
        ...(status === 'ACCEPTED' ? { acceptedAt: now } : {}),
      },
    });
    if (!changed.count) return false;
    await tx.emailAttempt.create({ data: {
      messageId: message.id, number: message.attempts, provider: message.provider ?? 'unknown',
      outcome: status, startedAt: message.lastAttemptAt ?? now, finishedAt: now,
      errorCode: details.errorCode ?? null,
      errorSummary: details.errorCode ? SUMMARY[details.errorCode] : null,
    } });
    if (['PERMANENT_FAILURE', 'UNKNOWN'].includes(status)) {
      await tx.emailDeliveryIssue.upsert({
        where: { messageId: message.id },
        create: { congressId: message.congressId, messageId: message.id }, update: {},
      });
    }
    return true;
  });
}

async function recoverLeases(prisma, now, maxAttempts, limit, scope) {
  const expired = await prisma.emailMessage.findMany({
    where: { ...scope, status: 'PROCESSING', leaseUntil: { lte: now } },
    orderBy: [{ leaseUntil: 'asc' }, { id: 'asc' }], take: limit,
  });
  const results = [];
  for (const message of expired) {
    // Only capture is repeatable without a bounded provider idempotency promise.
    // SMTP and Resend acceptance after a process crash is unknown and is never resent.
    let status = message.provider === 'capture' ? 'RETRY' : 'UNKNOWN';
    let errorCode = 'LEASE_EXPIRED';
    if (status === 'RETRY' && message.attempts >= maxAttempts) { status = 'PERMANENT_FAILURE'; errorCode = 'RETRY_LIMIT'; }
    if (await finish(prisma, message, message.leaseToken, status, now, { errorCode })) results.push({ id: message.id, status });
  }
  return results;
}

export async function processEmailQueue({ prisma, transport, now, batchSize = 20, leaseMs = 120000, maxAttempts = 5, congressId, messageIds }) {
  if (!transport || !PROVIDERS.has(transport.provider) || typeof transport.send !== 'function') throw failure('INVALID_EMAIL_TRANSPORT');
  if (![batchSize, leaseMs, maxAttempts].every(Number.isSafeInteger) || batchSize < 1 || batchSize > 100 || leaseMs < 1000 || maxAttempts < 1 || maxAttempts > 20) throw failure('INVALID_EMAIL_WORKER_OPTIONS');
  const instant = clockDate(now);
  if (!Number.isFinite(instant.getTime())) throw failure('INVALID_EMAIL_WORKER_OPTIONS');
  const scope = { ...(congressId ? { congressId } : {}), ...(messageIds ? { id: { in: messageIds } } : {}) };
  const results = await recoverLeases(prisma, instant, maxAttempts, batchSize, scope);
  const candidates = await prisma.emailMessage.findMany({
    where: { ...scope, status: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: instant } },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], take: batchSize,
  });
  let claimed = 0;
  for (const candidate of candidates) {
    const startedAt = clockDate(now);
    const leaseToken = randomUUID();
    const acquired = await prisma.emailMessage.updateMany({
      where: { id: candidate.id, status: { in: ['PENDING', 'RETRY'] }, attempts: candidate.attempts, nextAttemptAt: { lte: startedAt } },
      data: { status: 'PROCESSING', leaseToken, leaseUntil: new Date(startedAt.getTime() + leaseMs),
        provider: candidate.provider ?? transport.provider, lastAttemptAt: startedAt, attempts: { increment: 1 }, version: { increment: 1 } },
    });
    if (!acquired.count) continue;
    claimed += 1;
    const message = { ...candidate, status: 'PROCESSING', leaseToken, attempts: candidate.attempts + 1,
      provider: candidate.provider ?? transport.provider, lastAttemptAt: startedAt };
    let result;
    if (candidate.provider && candidate.provider !== transport.provider) {
      result = { kind: 'unknown', errorCode: 'PROVIDER_CHANGED' };
    } else if (candidate.attempts >= maxAttempts) {
      result = { kind: 'permanent', errorCode: 'RETRY_LIMIT' };
    } else if (message.expiresAt && new Date(message.expiresAt) <= startedAt) {
      result = { kind: 'cancelled', errorCode: 'MESSAGE_EXPIRED' };
    } else if (!(await sourceIsValid(prisma, message, startedAt))) {
      result = { kind: 'cancelled', errorCode: 'SOURCE_INVALID' };
    } else if (message.module && !(await prisma.congressModule.findUnique({
      where: { congressId_key: { congressId: message.congressId, key: message.module } }, select: { enabled: true },
    }))?.enabled) {
      result = { kind: 'cancelled', errorCode: 'MODULE_DISABLED' };
    } else {
      try { result = await transport.send(message); }
      catch { result = { kind: transport.provider === 'capture' ? 'retry' : 'unknown', errorCode: transport.provider === 'capture' ? 'CAPTURE_IO' : 'DELIVERY_UNKNOWN' }; }
    }
    const statuses = { captured: 'CAPTURED', accepted: 'ACCEPTED', retry: 'RETRY', permanent: 'PERMANENT_FAILURE', unknown: 'UNKNOWN', cancelled: 'CANCELLED' };
    let status = statuses[result?.kind] ?? 'UNKNOWN';
    if ((status === 'CAPTURED') !== (transport.provider === 'capture') && ['CAPTURED', 'ACCEPTED'].includes(status)) status = 'UNKNOWN';
    let errorCode = ['CAPTURED', 'ACCEPTED'].includes(status) ? null : safeCode(result?.errorCode,
      status === 'RETRY' ? 'TEMPORARY_FAILURE' : status === 'PERMANENT_FAILURE' ? 'PROVIDER_REJECTED' : 'DELIVERY_UNKNOWN');
    if (status === 'RETRY' && message.attempts >= maxAttempts) { status = 'PERMANENT_FAILURE'; errorCode = 'RETRY_LIMIT'; }
    // Provider identifiers are bounded opaque IDs, never arbitrary response bodies.
    const providerId = typeof result?.providerId === 'string' && /^[A-Za-z0-9@._<>:-]{1,200}$/.test(result.providerId) ? result.providerId : undefined;
    if (await finish(prisma, message, leaseToken, status, clockDate(now), { errorCode, providerId })) results.push({ id: message.id, status });
  }
  return { claimed, results };
}
