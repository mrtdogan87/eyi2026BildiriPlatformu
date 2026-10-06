import {requirePage} from '@/platform/context';
import {awardManager} from '@/integrations/congress/awards';
import {AwardManagerView} from '@/components/awards/manager';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('awards.read','AWARDS');return <main className="page-shell admin-page-shell"><AwardManagerView initial={await awardManager()}/></main>;}
