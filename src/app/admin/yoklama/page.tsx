import {requirePage} from '@/platform/context';
import {attendanceManager} from '@/integrations/congress/attendance';
import {AttendanceView} from '@/components/certificates/attendance';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('attendance.perform','PROGRAM');return <main className="page-shell admin-page-shell"><AttendanceView initial={await attendanceManager()}/></main>;}
