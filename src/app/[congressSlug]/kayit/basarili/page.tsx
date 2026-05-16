import Link from "next/link";
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

        <div className="card start-card">
          <h2 className="section-title">Kaydınız Başarıyla Alındı</h2>
          <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
            Kayıt detaylarınız ve dekontunuz kongre yönetimine iletildi. Onaylandığında size geri
            dönüş yapılacaktır.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <Link className="button primary" href={`/${congressSlug}`}>
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
