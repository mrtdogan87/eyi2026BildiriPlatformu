import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileText } from "lucide-react";
import { ensureCongress } from "@/lib/submission";

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

  return (
    <main className="page-shell hub-shell">
      <div className="page-box hub-page-box">
        <section className="hub-hero">
          <div>
            <span className="hub-eyebrow">EYİ 2026 Başvuru Merkezi</span>
            <h1>Bildiri gönderimi ve kongre kaydı</h1>
            <p>
              Akademik başvurunuzu başlatın veya kabul sonrası kayıt işleminizi güvenli bağlantı
              ile tamamlayın.
            </p>
          </div>
          <div className="hub-event-card">
            <span>23. Uluslararası</span>
            <strong>Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu</strong>
          </div>
        </section>

        <div className="hub-action-grid">
          <Link className="hub-action-card hub-action-card-submission" href={`/${congressSlug}/bildiri-gonder`}>
            <div className="hub-action-top">
              <span className="hub-action-label">Akademik Başvuru</span>
              <span className="hub-action-icon" aria-hidden="true">
                <FileText size={28} strokeWidth={1.8} />
              </span>
            </div>
            <h2>Bildiri Gönder</h2>
            <p>Dosyanızı yükleyin, yazarları ekleyin ve bildiriyi değerlendirme sürecine alın.</p>
            <span className="hub-card-cta">
              Başla <ArrowRight size={18} strokeWidth={2} />
            </span>
          </Link>

          <Link className="hub-action-card hub-action-card-registration" href={`/${congressSlug}/kayit`}>
            <div className="hub-action-top">
              <span className="hub-action-label">Katılım ve Ödeme</span>
              <span className="hub-action-icon" aria-hidden="true">
                <ClipboardCheck size={28} strokeWidth={1.8} />
              </span>
            </div>
            <h2>Kayıt Ol</h2>
            <p>Kabul edilen bildiriniz için kayıt yapın veya dinleyici katılımınızı oluşturun.</p>
            <span className="hub-card-cta">
              Devam Et <ArrowRight size={18} strokeWidth={2} />
            </span>
          </Link>
        </div>

        <div className="hub-reminder">
          <span>Bildiri gönderimi kayıt yerine geçmez.</span>
          <span>Kabul sonrası kayıt işlemi ayrıca tamamlanır.</span>
        </div>
      </div>
    </main>
  );
}
