import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PlatformHero } from "@/components/submission/platform-hero";
import { ensureCongress } from "@/lib/submission";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function RegistrationSuccessPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const congress = await ensureCongress(congressSlug);

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero
          variant="registration"
          congressName={congress.name}
          caption="Kaydınız ve dekontunuz incelemeye alındı."
        />

        <div className="completion-panel">
          <div className="completion-icon" aria-hidden="true">
            <CheckCircle2 size={34} strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="section-title">Kaydınız Alındı</h2>
            <p className="flow-intro">
              Kayıt detaylarınız ve dekontunuz kongre yönetimine iletildi. Onay süreci tamamlandığında
              size geri dönüş yapılacaktır.
            </p>
          </div>
          <div className="completion-actions">
            <Link className="button primary" href={`/${congressSlug}`}>
              Başvuru Merkezine Dön
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
