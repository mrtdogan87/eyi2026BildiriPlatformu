import Link from "next/link";
import { PlatformHero } from "@/components/submission/platform-hero";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function SuccessPage({ params }: PageProps) {
  const { congressSlug } = await params;

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero caption="Bildiriniz başarıyla alındı." />

        <div className="card start-card">
          <h2 className="section-title">Sonraki Adım</h2>
          <p style={{ color: "#617089", marginTop: 0 }}>
            Yeni bir taslak başlatabilir veya kongre ana sayfasına dönebilirsiniz.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button primary" href={`/${congressSlug}/bildiri-gonder`}>
              Yeni Bildiri
            </Link>
            <Link className="button ghost" href="/">
              Ana Sayfa
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
