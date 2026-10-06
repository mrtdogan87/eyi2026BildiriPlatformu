import {requirePage} from '@/platform/context';
import {publicationManager} from '@/integrations/congress/publications';
import {PublicationManagerView} from '@/components/publications/manager';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('publications.read','PUBLICATIONS');return <main className="page-shell admin-page-shell"><PublicationManagerView initial={await publicationManager()}/></main>;}
