import { requirePage } from '@/platform/context';
import { programManager } from '@/integrations/congress/program';
import { ProgramManager } from '@/components/program/manager';
export const dynamic='force-dynamic';
export default async function ProgramPage(){await requirePage('program.read','PROGRAM');return <main className="page-shell"><ProgramManager initial={await programManager()}/></main>;}
