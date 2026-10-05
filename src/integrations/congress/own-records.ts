import { requireContext, moduleEnabled } from '@/platform/context';
import { prisma } from '@/lib/prisma';
export async function ownRecords() {
  const context = await requireContext('own');
  const email = context.actor.email;
  const submissions = await moduleEnabled(context.congress.id, 'SUBMISSIONS') ? await prisma.submission.findMany({
    where: { congressId: context.congress.id, OR: [{ draftOwnerEmail: { equals: email, mode: 'insensitive' } }, { authors: { some: { email: { equals: email, mode: 'insensitive' } } } }] },
    select: { id: true, titleTr: true, titleEn: true, status: true }, orderBy: { createdAt: 'desc' },
  }) : [];
  const registrations = await moduleEnabled(context.congress.id, 'REGISTRATION') ? await prisma.registration.findMany({
    where: { congressId: context.congress.id, email: { equals: email, mode: 'insensitive' } },
    select: { id: true, totalAmount: true, currency: true, paidAt: true }, orderBy: { createdAt: 'desc' },
  }) : [];
  return { submissions, registrations };
}
