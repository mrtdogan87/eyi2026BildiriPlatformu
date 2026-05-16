import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHero } from "@/components/submission/platform-hero";
import { ensureCongress } from "@/lib/submission";
import { slugToTitle } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function CongressHubPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const congress = await ensureCongress(congressSlug);

  if (!congress) {
    notFound();
  }

  const congressName = congress.name || slugToTitle(congressSlug);

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="hub" congressName={congressName} />

        <div className="hub-grid">
          <Link className="hub-card" href={`/${congressSlug}/bildiri-gonder`}>
            <div className="hub-card-badge">📝</div>
            <h2>Bildiri Gönder</h2>
            <p>
              Hakemlik için bildirinizi yükleyin. Ücret bilgisi gösterilir, ödeme bu aşamada yapılmaz.
              Bildiriniz kabul edildikten sonra Kayıt Ol bölümünden ödeme yaparsınız.
            </p>
            <span className="hub-card-cta">Bildiri Gönder →</span>
          </Link>

          <Link className="hub-card" href={`/${congressSlug}/kayit`}>
            <div className="hub-card-badge">🎫</div>
            <h2>Kayıt Ol</h2>
            <p>
              Kabul edilen bildiriniz için ücret yatırın veya dinleyici olarak kaydolun. E-postanıza
              gelen güvenli bağlantıyla giriş yapar, dekontunuzu yüklersiniz.
            </p>
            <span className="hub-card-cta">Kayıt Ol →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
