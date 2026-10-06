import {requirePage} from '@/platform/context';
import {bookManager} from '@/integrations/congress/books';
import {BookManagerView} from '@/components/publications/books';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('publications.read','PUBLICATIONS');return <main className="page-shell admin-page-shell"><BookManagerView initial={await bookManager()}/></main>;}
