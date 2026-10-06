import {requirePage} from '@/platform/context';
import {juryTasks} from '@/integrations/congress/awards';
import {AwardJuryView} from '@/components/awards/jury';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('awards.perform','AWARDS');return <main className="page-shell admin-page-shell"><AwardJuryView initial={await juryTasks()}/></main>;}
