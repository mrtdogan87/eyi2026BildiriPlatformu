import {requirePage} from '@/platform/context';
import {eligibilityManager} from '@/integrations/congress/attendance';
import {EligibilityView} from '@/components/certificates/eligibility';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('certificates.read','CERTIFICATES');return <main className="page-shell admin-page-shell"><EligibilityView initial={await eligibilityManager()}/></main>;}
