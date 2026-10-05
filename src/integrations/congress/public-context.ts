import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
export async function publicCongress(slug: string) {
  const congress = await prisma.congress.findUnique({ where: { slug } });
  if (!congress) notFound();
  return congress;
}
