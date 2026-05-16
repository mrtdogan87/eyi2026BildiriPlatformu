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
          <h2 className="section-title">Kayıt Bağlantısı Alın</h2>
          <p className="flow-intro">
            E-postanıza gelen güvenli bağlantıyla kayıt paneliniz açılır. Kabul edilen bildiriler
            otomatik listelenir; dinleyici kaydı da aynı ekrandan yapılır.
          </p>
          <RegistrationEmailForm congressSlug={congressSlug} />
        </div>

        <p className="flow-note">
          Henüz bildiri göndermediyseniz{" "}
          <Link href={`/${congressSlug}/bildiri-gonder`}>
            Bildiri Gönder
          </Link>{" "}
          bölümünden başlayabilirsiniz.
        </p>
      </div>
    </main>
  );
}
