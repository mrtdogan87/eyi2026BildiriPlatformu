import Link from "next/link";
import { PlatformHero } from "@/components/submission/platform-hero";
import { RegistrationEmailForm } from "@/components/registration/registration-email-form";
import { ensureCongress } from "@/lib/submission";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function RegistrationStartPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const congress = await ensureCongress(congressSlug);

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="registration" congressName={congress.name} />

        <div className="card start-card">
          <h2 className="section-title">Kayıt İçin E-posta Doğrulama</h2>
          <p style={{ marginTop: 0, color: "#617089" }}>
            E-postanızı girin; size güvenli bir bağlantı gönderelim. Linke tıkladığınızda kayıt
            paneliniz açılır. Kabul edilen bildirileriniz otomatik listelenir; dilerseniz yalnızca
            dinleyici olarak da kaydolabilirsiniz.
          </p>
          <RegistrationEmailForm congressSlug={congressSlug} />
        </div>

        <p style={{ marginTop: 14, color: "#617089" }}>
          Henüz bildiri göndermediyseniz{" "}
          <Link href={`/${congressSlug}/bildiri-gonder`} style={{ color: "var(--primary)", fontWeight: 600 }}>
            Bildiri Gönder
          </Link>{" "}
          bölümünden başlayabilirsiniz.
        </p>
      </div>
    </main>
  );
}
