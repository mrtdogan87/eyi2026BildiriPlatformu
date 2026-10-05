import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { moduleEnabled } from '@/platform/context';
export default async function ModuleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ congressSlug: string }> }) {
  const { congressSlug } = await params;
  const congress = await prisma.congress.findUnique({ where: { slug: congressSlug } });
  if (!congress || !(await moduleEnabled(congress.id, 'SUBMISSIONS'))) return <main className="page-shell"><section className="card platform-card"><h1>Bu modül kapalı</h1><p>Kongre yönetimi bu hizmeti şu anda kullanıma açmadı.</p><Link href={`/${congressSlug}`}>Kongreye dön</Link></section></main>;
  return children;
}
