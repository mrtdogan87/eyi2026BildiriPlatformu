import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PlatformHero } from "@/components/submission/platform-hero";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function SuccessPage({ params }: PageProps) {
  const { congressSlug } = await params;

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero
          variant="submission"
          subtitle="Gönderim tamamlandı"
          caption="Bildiriniz başarıyla alındı."
        />

        <div className="completion-panel">
          <div className="completion-icon" aria-hidden="true">
            <CheckCircle2 size={34} strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="section-title">Başvurunuz Alındı</h2>
            <p className="flow-intro">
              Bildiriniz kongre değerlendirme sürecine aktarıldı. Yeni bir bildiri başlatabilir
              veya başvuru merkezine dönebilirsiniz.
            </p>
          </div>
          <div className="completion-actions">
            <Link className="button primary" href={`/${congressSlug}/bildiri-gonder`}>
              Yeni Bildiri
            </Link>
            <Link className="button ghost" href={`/${congressSlug}`}>
              Başvuru Merkezi
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
