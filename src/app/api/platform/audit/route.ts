import { NextResponse } from 'next/server';
import { apiRoute } from '@/platform/http';
import { requireContext } from '@/platform/context';
import { prisma } from '@/lib/prisma';
export const GET = apiRoute(async () => {
  const context = await requireContext('audit');
  const entries = await prisma.auditLog.findMany({ where: { congressId: context.congress.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { actor: { select: { name: true } } } });
  return NextResponse.json({ entries });
});
