import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/platform/password.mjs';
import { assertLocal } from './environment.mjs';
import { loadEnv } from './load-env.mjs';

loadEnv(); assertLocal();
const prisma = new PrismaClient();
try {
  const now = Date.now();
  const orgA = await prisma.organization.upsert({ where: { id: 'local-org-a' }, update: {}, create: { id: 'local-org-a', name: 'A Test Üniversitesi (sentetik)' } });
  const orgB = await prisma.organization.upsert({ where: { id: 'local-org-b' }, update: {}, create: { id: 'local-org-b', name: 'B Test Üniversitesi (sentetik)' } });
  const congress = await prisma.congress.upsert({
    where: { slug: 'eyi-2026' }, update: { organizationId: orgA.id },
    create: { organizationId: orgA.id, id: 'local-eyi-2026', slug: 'eyi-2026', name: 'EYİ 2026 — v2 Yerel Test (sentetik)',
      earlyDeadline: new Date(now + 30 * 86400000), lateDeadline: new Date(now + 60 * 86400000),
      submissionsClosed: false, bankName: 'TEST BANKASI — gerçek ödeme yapmayın',
      bankAccountHolder: 'Sentetik Test Hesabı', bankIban: 'TEST-ÖDEME-YOK',
      galaFeeAmount: 10, galaFeeCurrency: 'TRY', galaFeeNote: 'Yalnız test', tripNote: 'Sentetik gezi' },
  });
  await prisma.congress.upsert({ where: { slug: 'eyi-2026-kapali-test' }, update: { organizationId: orgA.id },
    create: { organizationId: orgA.id, id: 'local-closed', slug: 'eyi-2026-kapali-test', name: 'Kapalı gönderim test kongresi', submissionsClosed: true } });
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
  const second = await prisma.congress.upsert({ where: { id: 'local-congress-b' }, update: {}, create: { id: 'local-congress-b', organizationId: orgB.id, slug: 'kongre-b-2026', name: 'B Kongresi 2026 (sentetik)' } });
  for (const c of [congress, second, { id: 'local-closed' }]) for (const key of ['SUBMISSIONS', 'REGISTRATION']) {
    await prisma.congressModule.upsert({ where: { congressId_key: { congressId: c.id, key } }, update: {}, create: { congressId: c.id, key, enabled: true } });
  }
  await prisma.submission.upsert({ where: { id: 'local-paper-b' }, update: {}, create: {
    id: 'local-paper-b', congressId: second.id, status: 'SUBMITTED', submissionLanguage: 'TR', titleTr: 'Yalnız B kurumunun bildirisi', draftOwnerEmail: 'presenter@example.invalid', submittedAt: new Date(),
    authors: { create: { fullName: 'B Test Sunucu', email: 'presenter@example.invalid', isPresenter: true, sortOrder: 0 } },
    file: { create: { originalName: 'synthetic.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: bytes.length, storageKey: 'database:local:paper-b', content: bytes } },
  } });
  const receipt = readFileSync(new URL('./fixtures/synthetic-receipt.pdf', import.meta.url));
  for (const [suffix, c] of [['a', congress], ['b', second]]) await prisma.registration.upsert({ where: { id: `local-registration-${suffix}` }, update: {}, create: {
    id: `local-registration-${suffix}`, congressId: c.id, email: 'presenter@example.invalid', kind: 'LISTENER', listenerPresentationMode: 'ONLINE', paymentPeriod: 'EARLY', totalAmount: 0, paymentDescription: 'Sentetik P03 kaydı',
    receipt: { create: { originalName: 'synthetic-receipt.pdf', mimeType: 'application/pdf', fileSize: receipt.length, storageKey: `database:local:receipt-${suffix}`, content: receipt } },
    studentDocument: { create: { originalName: 'synthetic-receipt.pdf', mimeType: 'application/pdf', fileSize: receipt.length, storageKey: `database:local:student-${suffix}`, content: receipt } },
  } });
  mkdirSync('.local', { recursive: true, mode: 0o700 });
  const accountFile = '.local/p03-accounts.json';
  const accounts = existsSync(accountFile) ? JSON.parse(readFileSync(accountFile, 'utf8')) : {};
  const specs = [
    ['platform', 'platform@example.invalid', null, null, true],
    ['institution', 'institution-a@example.invalid', orgA, null, false],
    ['organizer', 'organizer-a@example.invalid', orgA, 'ORGANIZER', false],
    ['secretary', 'secretary-a@example.invalid', orgA, 'SECRETARY', false],
    ['editor', 'editor-a@example.invalid', orgA, 'CONTENT_EDITOR', false],
    ['reviewer', 'reviewer-a@example.invalid', orgA, 'REVIEWER', false],
    ['chair', 'chair-a@example.invalid', orgA, 'SESSION_CHAIR', false],
    ['participant', 'presenter@example.invalid', orgA, 'PARTICIPANT', false],
    ['organizerB', 'organizer-b@example.invalid', orgB, 'ORGANIZER', false],
  ];
  for (const [key, email, org, role, platformAdmin] of specs) {
    const password = accounts[key]?.password ?? randomBytes(24).toString('base64url');
    const user = await prisma.platformUser.upsert({ where: { email }, update: {}, create: { id: `local-user-${key}`, email, name: `Test ${key}`, passwordHash: hashPassword(password), platformAdmin } });
    if (org) await prisma.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: org.id, userId: user.id } }, update: {}, create: { organizationId: org.id, userId: user.id, organizer: key === 'institution' } });
    if (role) await prisma.congressMembership.upsert({ where: { congressId_userId: { congressId: org === orgB ? second.id : congress.id, userId: user.id } }, update: {}, create: { congressId: org === orgB ? second.id : congress.id, userId: user.id, role } });
    accounts[key] = { email, password };
  }
  writeFileSync(accountFile, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
  console.log('Sentetik P03 verileri hazır: 2 kurum, 3 kongre, 9 kişisel rol hesabı. Hesap parolaları yalnız özel .local dosyasında.');
} finally { await prisma.$disconnect(); }
