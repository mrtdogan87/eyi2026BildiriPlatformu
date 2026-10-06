import {requirePage} from '@/platform/context';
import {archiveManager} from '@/integrations/congress/archive';
import {ArchiveManagerView} from '@/components/publications/archive';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('archive.read','ARCHIVE');return <main className="page-shell admin-page-shell"><ArchiveManagerView initial={await archiveManager()}/></main>;}
