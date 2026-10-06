import {OwnArchive} from '@/components/publications/own-archive';
import { requirePage } from '@/platform/context';
import { ownRecords } from '@/integrations/congress/own-records';
import { ParticipantDashboard } from '@/components/participation/dashboard';
export const dynamic = 'force-dynamic';
export default async function OwnPage() { await requirePage('own'); return <main className="page-shell"><ParticipantDashboard initial={await ownRecords()} platform /><OwnArchive/></main>; }
