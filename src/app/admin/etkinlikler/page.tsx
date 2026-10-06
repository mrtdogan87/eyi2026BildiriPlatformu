import { requirePage } from '@/platform/context';
import { activitiesManager } from '@/integrations/congress/activities';
import { ActivitiesManagerView } from '@/components/activities/manager';
export const dynamic = 'force-dynamic';
export default async function Page() { await requirePage('activities.read', 'ACTIVITIES'); return <main className="page-shell admin-page-shell"><ActivitiesManagerView initial={await activitiesManager()}/></main>; }
