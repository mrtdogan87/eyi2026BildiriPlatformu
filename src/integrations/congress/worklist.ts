import { programFollowup } from './program';
import { paymentSummary, paymentLabels } from '@/modules/payments/core';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireContext, type CongressContext } from '@/platform/context';
import { AccessError } from '@/platform/http';
import { effectiveConfiguration } from '@/modules/congress/configuration';
import { createRequest, updateRequest, publicRequest, staffRequest, type WorklistContext, type WorklistPorts } from '@/modules/worklist/core';
import { parseWorklist, participantRequestSchema, staffRequestSchema, WorklistError } from '@/modules/worklist/configuration';
import { worklistAction } from '@/modules/worklist/http';

export type ParticipantWorkIdentity = { congressId: string; email: string; actorId?: string };
const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
function staffContext(c: CongressContext): WorklistContext { return { congressId: c.congress.id, email: c.actor.email, actorId: c.actor.id, origin: 'STAFF_EMAIL' }; }

function assigneeWhere(congressId: string, organizationId: string): Prisma.PlatformUserWhereInput {
  return { active: true, OR: [
    { platformAdmin: true },
    { organizations: { some: { organizationId, active: true, organizer: true } } },
    { organizations: { some: { organizationId, active: true } }, congresses: { some: { congressId, active: true, role: { in: ['ORGANIZER', 'SECRETARY'] } } } },
  ] };
}

export const congressWorklistPorts: WorklistPorts = {
  async resolveSource(tx, context, source, kind) {
    let moduleKey: 'SUBMISSIONS' | 'REGISTRATION' | 'CMS' | null = null;
    if (source.type === 'SUBMISSION') {
      moduleKey = 'SUBMISSIONS';
      const row = await tx.submission.findFirst({ where: { id: source.id, congressId: context.congressId }, select: { draftOwnerEmail: true, status: true, authors: { select: { email: true } } } });
      if (!row || (context.origin === 'PARTICIPANT' && !sameEmail(row.draftOwnerEmail, context.email) && !row.authors.some(a => sameEmail(a.email, context.email)))) throw new WorklistError(404, 'İlgili bildiri bulunamadı.');
      if (context.origin === 'PARTICIPANT' && row.status === 'DRAFT' && !sameEmail(row.draftOwnerEmail, context.email)) throw new WorklistError(404, 'İlgili bildiri bulunamadı.');
      if (context.origin === 'PARTICIPANT' && kind === 'WITHDRAWAL_REQUEST' && (!sameEmail(row.draftOwnerEmail, context.email) || row.status === 'DRAFT')) throw new WorklistError(403, 'Geri çekme talebini yalnız gönderilmiş bildirinin taslak sahibi oluşturabilir.');
    } else if (source.type === 'REGISTRATION') {
      moduleKey = 'REGISTRATION';
      const row = await tx.registration.findFirst({ where: { id: source.id, congressId: context.congressId }, select: { email: true } });
      if (!row || (context.origin === 'PARTICIPANT' && !sameEmail(row.email, context.email))) throw new WorklistError(404, 'İlgili kayıt bulunamadı.');
    } else if (source.type === 'FEEDBACK' && context.origin === 'STAFF_EMAIL') {
      moduleKey = 'CMS';
      if (!(await tx.feedbackRequest.findFirst({ where: { id: source.id, congressId: context.congressId }, select: { id: true } }))) throw new WorklistError(404, 'Geri bildirim bulunamadı.');
    } else if (source.type === 'EMAIL_ISSUE' && context.origin === 'STAFF_EMAIL') {
      if (!(await tx.emailDeliveryIssue.findFirst({ where: { id: source.id, congressId: context.congressId }, select: { id: true } }))) throw new WorklistError(404, 'Teslim sorunu bulunamadı.');
    } else throw new WorklistError(403, 'Bu kaynak talebe bağlanamaz.');
    if (moduleKey && !(await tx.congressModule.findUnique({ where: { congressId_key: { congressId: context.congressId, key: moduleKey } }, select: { enabled: true } }))?.enabled) throw new WorklistError(403, 'Kaynağın modülü bu kongrede kapalı.');
    return { module: moduleKey };
  },
  async validateAssignee(tx, context, userId) {
    const congress = await tx.congress.findUnique({ where: { id: context.congressId }, select: { organizationId: true } });
    if (!congress || !(await tx.platformUser.findFirst({ where: { id: userId, ...assigneeWhere(context.congressId, congress.organizationId) }, select: { id: true } }))) throw new WorklistError(400, 'Sorumlu bu kongrenin aktif organizatör veya sekreterlerinden seçilmeli.');
  },
  async audit(tx, context, action, id, detail) {
    const congress = await tx.congress.findUniqueOrThrow({ where: { id: context.congressId }, select: { organizationId: true } });
    return tx.auditLog.create({ data: { actorId: context.actorId ?? null, congressId: context.congressId, organizationId: congress.organizationId, action, targetId: id, detail } });
  },
};

async function rateLimit(tx: Prisma.TransactionClient, context: WorklistContext, requestKey: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`worklist:${context.congressId}`}))`;
  if (await tx.workRequest.findUnique({ where: { congressId_requestKey: { congressId: context.congressId, requestKey } }, select: { id: true } })) return;
  if (await tx.workRequest.count({ where: { congressId: context.congressId, createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 60) throw new WorklistError(429, 'Kısa sürede çok sayıda talep alındı. Daha sonra tekrar deneyin.');
  if (context.origin === 'PARTICIPANT' && await tx.workRequest.count({ where: { congressId: context.congressId, requesterEmail: context.email.toLowerCase(), origin: 'PARTICIPANT', createdAt: { gt: new Date(Date.now() - 3600000) } } }) >= 10) throw new WorklistError(429, 'Bir saatte en fazla 10 talep oluşturabilirsiniz.');
}

async function lockWorklistCongress(tx: Prisma.TransactionClient, congressId: string) {
  // Module changes also lock Congress first. Hold it through source/module checks,
  // rate limiting and creation so an in-flight disable cannot be bypassed.
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Congress" WHERE id = ${congressId} FOR UPDATE`;
  if (!rows.length) throw new WorklistError(404, 'Kongre bulunamadı.');
}

// The caller supplies identity established by the participant session or platform account;
// request JSON is never allowed to supply its own requester identity.
export async function createParticipantWorkRequest(tx: Prisma.TransactionClient, identity: ParticipantWorkIdentity, raw: unknown) {
  return worklistAction(async () => {
    const input = parseWorklist(participantRequestSchema, raw);
    const context: WorklistContext = { ...identity, email: identity.email.trim().toLowerCase(), origin: 'PARTICIPANT' };
    await lockWorklistCongress(tx, context.congressId);
    if (!(await tx.congressModule.count({ where: { congressId: identity.congressId, key: { in: ['SUBMISSIONS', 'REGISTRATION'] }, enabled: true } }))) throw new WorklistError(403, 'Bu kongrede katılımcı işlemleri kapalı.');
    await rateLimit(tx, context, input.requestKey);
    return publicRequest(await createRequest(tx, context, input, congressWorklistPorts));
  });
}
export async function listParticipantWorkRequests(tx: Prisma.TransactionClient, identity: ParticipantWorkIdentity) {
  const rows = await tx.workRequest.findMany({ where: { congressId: identity.congressId, origin: 'PARTICIPANT', requesterEmail: identity.email.trim().toLowerCase() }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200 });
  return rows.map(publicRequest);
}

export async function createStaffWorkRequest(raw: unknown) {
  const c = await requireContext('worklist');
  return worklistAction(async () => {
    const input = parseWorklist(staffRequestSchema, raw);
    return prisma.$transaction(async tx => {
      const context = staffContext(c); await lockWorklistCongress(tx, context.congressId); await rateLimit(tx, context, input.requestKey);
      return { request: staffRequest(await createRequest(tx, context, input, congressWorklistPorts)) };
    });
  });
}
export async function updateStaffWorkRequest(id: string, raw: unknown) {
  const c = await requireContext('worklist');
  return worklistAction(() => prisma.$transaction(async tx => ({ request: staffRequest(await updateRequest(tx, staffContext(c), id, raw, congressWorklistPorts)) })));
}
export async function workRequestDetail(id: string) {
  const c = await requireContext('worklist');
  const row = await prisma.workRequest.findFirst({ where: { id, congressId: c.congress.id }, include: { events: { orderBy: { number: 'asc' }, include: { actor: { select: { name: true } } } } } });
  if (!row) throw new AccessError(404, 'Talep bulunamadı.');
  return { request: staffRequest(row), events: row.events.map(event => ({ id: event.id, number: event.number, action: event.action, actorName: event.actor?.name ?? 'Katılımcı', fromStatus: event.fromStatus, toStatus: event.toStatus, assigneeId: event.assigneeId, publicResult: event.publicResult, internalNote: event.internalNote, createdAt: event.createdAt.toISOString() })) };
}

type MissingItem = { id: string; sourceType: 'SUBMISSION' | 'REGISTRATION' | 'PROGRAM'; sourceId: string; subject: string; email: string; reasons: string[]; href: string };
async function missingRecords(c: CongressContext, enabled: Set<string>): Promise<MissingItem[]> {
  const configuration = effectiveConfiguration(c.congress.configuration);
  const missing: MissingItem[] = [];
  if (enabled.has('SUBMISSIONS')) {
    const papers = await prisma.submission.findMany({ where: { congressId: c.congress.id, status: 'DRAFT' }, select: { id: true, titleTr: true, titleEn: true, submissionLanguage: true, draftOwnerEmail: true, abstractTr: true, abstractEn: true, keywordsTr: true, keywordsEn: true, presentationMode: true, audience: true, file: { select: { id: true } }, authors: { select: { id: true, isPresenter: true } } }, orderBy: { updatedAt: 'desc' }, take: 200 });
    for (const paper of papers) {
      const reasons: string[] = []; const en = paper.submissionLanguage === 'EN';
      if (!paper.submissionLanguage) reasons.push('Bildiri dili seçilmemiş');
      if (!(en ? paper.titleEn : paper.titleTr)?.trim()) reasons.push('Başlık eksik');
      if (!paper.authors.length || paper.authors.filter(author => author.isPresenter).length !== 1) reasons.push('Yazar/sunan yazar bilgisi eksik');
      if (configuration.stages.ABSTRACT.enabled && configuration.fields.abstract === 'REQUIRED' && !(en ? paper.abstractEn : paper.abstractTr)?.trim()) reasons.push('Özet eksik');
      if (configuration.stages.ABSTRACT.enabled && configuration.fields.keywords === 'REQUIRED' && !(en ? paper.keywordsEn : paper.keywordsTr)?.trim()) reasons.push('Anahtar kelimeler eksik');
      if (configuration.stages.FULL_TEXT.enabled && configuration.fields.file === 'REQUIRED' && !paper.file) reasons.push('Tam metin dosyası eksik');
      if (configuration.stages.PARTICIPATION.enabled && configuration.fields.presentationMode === 'REQUIRED' && !paper.presentationMode) reasons.push('Sunum biçimi eksik');
      if (configuration.stages.PARTICIPATION.enabled && configuration.fields.audience === 'REQUIRED' && !paper.audience) reasons.push('Katılımcı türü eksik');
      reasons.push('Taslak henüz gönderilmemiş');
      missing.push({ id: `SUBMISSION:${paper.id}`, sourceType: 'SUBMISSION', sourceId: paper.id, subject: paper.titleTr || paper.titleEn || 'Başlıksız taslak', email: paper.draftOwnerEmail, reasons, href: `/admin/bildiriler/${paper.id}` });
    }
    const revisions = await prisma.submissionRevisionRequest.findMany({ where: { status: { in: ['OPEN', 'SUBMITTED'] }, submission: { congressId: c.congress.id } }, select: { id: true, status: true, expiresAt: true, submissionId: true, submission: { select: { titleTr: true, titleEn: true, draftOwnerEmail: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    for (const r of revisions) missing.push({ id: `REVISION:${r.id}`, sourceType: 'SUBMISSION', sourceId: r.submissionId, subject: r.submission.titleTr || r.submission.titleEn || 'Dosya düzeltmesi', email: r.submission.draftOwnerEmail, reasons: [r.status === 'SUBMITTED' ? 'Düzeltilmiş dosya yönetici incelemesi bekliyor' : r.expiresAt <= new Date() ? 'Dosya düzeltme süresi doldu; talebi kontrol edin' : 'Katılımcı dosya düzeltmesi bekleniyor'], href: `/admin/bildiriler/${r.submissionId}` });
    const outputs = await prisma.submissionOutputUpdate.findMany({ where: { status: 'PENDING', submission: { congressId: c.congress.id } }, select: { id: true, kind: true, submissionId: true, submission: { select: { titleTr: true, titleEn: true, draftOwnerEmail: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    for (const o of outputs) missing.push({ id: `OUTPUT:${o.id}`, sourceType: 'SUBMISSION', sourceId: o.submissionId, subject: o.submission.titleTr || o.submission.titleEn || 'Düzeltme sonrası kontrol', email: o.submission.draftOwnerEmail, reasons: [`Düzeltme sonrası çıktı/kayıt güncellemesi bekliyor: ${o.kind}`], href: `/admin/bildiriler/${o.submissionId}` });
  }
  if (enabled.has('REGISTRATION')) {
    const registrations = await prisma.registration.findMany({ where: { congressId: c.congress.id }, select: { id: true, email: true, totalAmount: true, currency: true, paymentEvents: { orderBy: { number: 'asc' }, select: { id: true, kind: true, amountMinor: true, currency: true, targetId: true, createdAt: true } }, paidAt: true, receipt: { select: { id: true } }, studentDocument: { select: { id: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    for (const registration of registrations) {
      const reasons: string[] = [], payment = paymentSummary({ ...registration, receiptReceived: !!registration.receipt }, registration.paymentEvents);
      if (configuration.stages.PAYMENT.enabled && configuration.fields.receipt === 'REQUIRED' && registration.totalAmount > 0 && !registration.receipt && !['VERIFIED', 'EXEMPT', 'OVERPAID', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(payment.state)) reasons.push('Zorunlu dekont eksik');
      if (['RECEIPT_RECEIVED_UNVERIFIED', 'PENDING', 'UNDERPAID', 'OVERPAID', 'PARTIALLY_REFUNDED'].includes(payment.state)) reasons.push(paymentLabels[payment.state]?.[0] ?? payment.state);
      if (configuration.fields.studentDocument === 'REQUIRED' && !registration.studentDocument) reasons.push('Zorunlu öğrenci belgesi eksik');
      if (reasons.length) missing.push({ id: `REGISTRATION:${registration.id}`, sourceType: 'REGISTRATION', sourceId: registration.id, subject: 'Kayıt / dekont takibi', email: registration.email, reasons, href: `/admin/kayitlar/${registration.id}` });
    }
  }
  if (enabled.has('REVIEWS') && enabled.has('SUBMISSIONS')) {
    const rounds = await prisma.reviewRound.findMany({where:{congressId:c.congress.id,status:'OPEN'},take:200,orderBy:{createdAt:'desc'},select:{id:true,submissionId:true,number:true,deadline:true,sourceVersion:true,submission:{select:{titleTr:true,titleEn:true,draftOwnerEmail:true,correctionVersion:true}},assignments:{select:{status:true}}}});
    for(const r of rounds){const reasons:string[]=[];if(!r.assignments.length)reasons.push('Hakem ataması bekliyor');if(r.assignments.some(a=>a.status==='INVITED'))reasons.push('Hakem davet yanıtı bekliyor');if(r.assignments.some(a=>['DECLINED','CONFLICT'].includes(a.status)))reasons.push('Ret / çıkar çatışması: yerine hakem kontrolü');if(r.deadline<=new Date())reasons.push('Hakemlik son tarihi geçti');if(r.assignments.some(a=>a.status==='ACCEPTED'))reasons.push('Hakem değerlendirmesi bekliyor');if(r.assignments.some(a=>a.status==='SUBMITTED'))reasons.push('Editör kararı bekliyor');if(r.sourceVersion!==r.submission.correctionVersion)reasons.push('Bildiri sürümü değişti: yeni tur kontrolü');if(reasons.length)missing.push({id:'REVIEW:'+r.id,sourceType:'SUBMISSION',sourceId:r.submissionId,subject:(r.submission.titleTr||r.submission.titleEn||'Bildiri')+' · Tur '+r.number,email:r.submission.draftOwnerEmail,reasons,href:'/admin/hakemlik/bildiriler/'+r.submissionId});}
  }
  if(enabled.has('PROGRAM')){const p=await programFollowup(c.congress.id);missing.push(...p.items,...p.unplaced);}
  return missing;
}
export async function worklistOverview() {
  const c = await requireContext('worklist');
  const modules = await prisma.congressModule.findMany({ where: { congressId: c.congress.id, enabled: true }, select: { key: true } });
  const enabled = new Set(modules.map(module => module.key));
  const [requests, assignees, feedback, deliveryIssues, missing, papers, registrations] = await Promise.all([
    prisma.workRequest.findMany({ where: { congressId: c.congress.id }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200 }),
    prisma.platformUser.findMany({ where: assigneeWhere(c.congress.id, c.congress.organizationId), select: { id: true, name: true, email: true }, orderBy: { name: 'asc' }, take: 100 }),
    enabled.has('CMS') ? prisma.feedbackRequest.findMany({ where: { congressId: c.congress.id }, select: { id: true, subject: true, senderName: true, email: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }) : Promise.resolve([]),
    prisma.emailDeliveryIssue.findMany({ where: { congressId: c.congress.id }, select: { id: true, status: true, resolution: true, createdAt: true, message: { select: { recipient: true, subject: true, status: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    missingRecords(c, enabled),
    enabled.has('SUBMISSIONS') ? prisma.submission.findMany({ where: { congressId: c.congress.id }, select: { id: true, titleTr: true, titleEn: true, draftOwnerEmail: true }, orderBy: { updatedAt: 'desc' }, take: 200 }) : Promise.resolve([]),
    enabled.has('REGISTRATION') ? prisma.registration.findMany({ where: { congressId: c.congress.id }, select: { id: true, email: true, totalAmount: true, currency: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }) : Promise.resolve([]),
  ]);
  return { congress: { id: c.congress.id, name: c.congress.name }, requests: requests.map(staffRequest), assignees,
    sourceOptions: [
      ...papers.map(row => ({ type: 'SUBMISSION' as const, id: row.id, label: (row.titleTr || row.titleEn || 'Başlıksız taslak').slice(0, 180), detail: row.draftOwnerEmail, href: `/admin/bildiriler/${row.id}` })),
      ...registrations.map(row => ({ type: 'REGISTRATION' as const, id: row.id, label: `${row.email} · ${row.totalAmount} ${row.currency}`, detail: row.createdAt.toISOString(), href: `/admin/kayitlar/${row.id}` })),
      ...feedback.map(row => ({ type: 'FEEDBACK' as const, id: row.id, label: row.subject.slice(0, 180), detail: row.email, href: '/admin/talepler' })),
      ...deliveryIssues.map(row => ({ type: 'EMAIL_ISSUE' as const, id: row.id, label: row.message.subject.slice(0, 180), detail: row.message.recipient, href: '/admin/iletisim' })),
    ],
    sources: {
      feedback: feedback.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), href: '/admin/talepler' })),
      deliveryIssues: deliveryIssues.map(row => ({ id: row.id, status: row.status, resolution: row.resolution, createdAt: row.createdAt.toISOString(), recipient: row.message.recipient, subject: row.message.subject, messageStatus: row.message.status, href: '/admin/iletisim' })),
      missing,
    }, limits: { requests: 200, feedback: 100, deliveryIssues: 100, missingPerSource: 200, sourceOptionsPerType: 200 } };
}
