import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { assertLocal } from './environment.mjs';
import { loadEnv } from './load-env.mjs';

loadEnv(); assertLocal();
const prisma = new PrismaClient();
try {
  const now = Date.now();
  const congress = await prisma.congress.upsert({
    where: { slug: 'eyi-2026' }, update: {},
    create: { id: 'local-eyi-2026', slug: 'eyi-2026', name: 'EYİ 2026 — v2 Yerel Test (sentetik)',
      earlyDeadline: new Date(now + 30 * 86400000), lateDeadline: new Date(now + 60 * 86400000),
      submissionsClosed: false, bankName: 'TEST BANKASI — gerçek ödeme yapmayın',
      bankAccountHolder: 'Sentetik Test Hesabı', bankIban: 'TEST-ÖDEME-YOK',
      galaFeeAmount: 10, galaFeeCurrency: 'TRY', galaFeeNote: 'Yalnız test', tripNote: 'Sentetik gezi' },
  });
  await prisma.congress.upsert({ where: { slug: 'eyi-2026-kapali-test' }, update: {},
    create: { id: 'local-closed', slug: 'eyi-2026-kapali-test', name: 'Kapalı gönderim test kongresi', submissionsClosed: true } });
  const tiers = [];
  for (const audience of ['ACADEMIC', 'STUDENT']) {
    for (const period of ['EARLY', 'LATE']) {
      for (const paperOrder of [1, 2]) tiers.push({ id: `local-presenter-${audience}-${period}-${paperOrder}`, role: 'PRESENTER', presentationMode: null, audience, period, paperOrder, amount: paperOrder === 2 ? 0 : audience === 'STUDENT' ? 50 : 100 });
      tiers.push({ id: `local-listener-${audience}-${period}`, role: 'LISTENER', presentationMode: 'IN_PERSON', audience, period, paperOrder: null, amount: 20 });
    }
  }
  tiers.push({ id: 'local-listener-online', role: 'LISTENER', presentationMode: 'ONLINE', audience: null, period: null, paperOrder: null, amount: 0 });
  for (const [index, tier] of tiers.entries()) await prisma.paymentTier.upsert({ where: { id: tier.id }, update: {}, create: { ...tier, congressId: congress.id, currency: 'TRY', sortOrder: index } });
  const bytes = readFileSync(new URL('./fixtures/synthetic.docx', import.meta.url));
  for (const status of ['SUBMITTED', 'ACCEPTED']) {
    const id = `local-paper-${status.toLowerCase()}`;
    await prisma.submission.upsert({ where: { id }, update: {}, create: {
      id, congressId: congress.id, status, submissionLanguage: 'TR',
      titleTr: `${status === 'ACCEPTED' ? 'Kabul edilen' : 'Gönderilen'} sentetik test bildirisi`,
      abstractTr: 'Bu kayıt yalnız v2 yerel geliştirme için hazırlanmış sentetik veridir.', keywordsTr: 'test, sentetik',
      presentationMode: 'IN_PERSON', audience: 'ACADEMIC', draftOwnerEmail: 'presenter@example.invalid', submittedAt: new Date(),
      authors: { create: { fullName: 'Test Sunucu', title: 'Dr.', email: 'presenter@example.invalid', institution: 'Test Üniversitesi', country: 'Türkiye', isPresenter: true, sortOrder: 0 } },
      file: { create: { originalName: 'synthetic.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: bytes.length, storageKey: `database:local:${id}`, content: bytes } },
      statusHistory: { create: { fromStatus: 'DRAFT', toStatus: status, note: 'Sentetik P02 test verisi' } },
    } });
  }
  console.log('Synthetic seed ready: 2 test congresses, 13 tiers, 2 papers; no production data.');
} finally { await prisma.$disconnect(); }
