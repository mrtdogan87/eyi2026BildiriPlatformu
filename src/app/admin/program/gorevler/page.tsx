import Link from 'next/link';
import { requirePage } from '@/platform/context';
import { platformProgram } from '@/integrations/congress/program';
import { ProgramOwn } from '@/components/program/own';
export const dynamic='force-dynamic';
export default async function OwnProgramPage(){const c=await requirePage('program.perform','PROGRAM');return <main className="page-shell"><p><Link href="/admin/panel">Kongre paneli</Link></p><ProgramOwn initial={await platformProgram()} slug={c.congress.slug} platform/></main>;}
