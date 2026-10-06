import { requirePage } from '@/platform/context';
import { certificatesManager } from '@/integrations/congress/certificates';
import { CertificatesManagerView } from '@/components/certificates/manager';
export const dynamic='force-dynamic';
export default async function Page(){await requirePage('certificates.read','CERTIFICATES');return <main className="page-shell admin-page-shell"><CertificatesManagerView initial={await certificatesManager()}/></main>;}
