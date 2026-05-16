import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { getAdminRegistrationDetail, requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(fileSize: number) {
  return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function AdminRegistrationDetailPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const registration = await getAdminRegistrationDetail(id);

  if (!registration) notFound();

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <Link href="/admin/kayitlar" className="admin-back-link">
            ← Kayıt listesine dön
          </Link>
          <h1>Kayıt Detayı</h1>
          <p>{registration.email}</p>
        </div>
        <AdminLogoutButton />
      </section>

      <section className="card admin-panel-card admin-detail-grid">
        <div className="admin-detail-block">
          <h2>Kayıt Bilgileri</h2>
          <dl className="admin-definition-list">
            <div>
              <dt>Kategori</dt>
              <dd>{registration.kindLabel}</dd>
            </div>
            <div>
              <dt>Akademik Statü</dt>
              <dd>{registration.audienceLabel}</dd>
            </div>
            {registration.kind === "LISTENER" ? (
              <div>
                <dt>Dinleyici Sunum Şekli</dt>
                <dd>{registration.listenerPresentationModeLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt>Dönem</dt>
              <dd>{registration.paymentPeriodLabel}</dd>
            </div>
            <div>
              <dt>Toplam Tutar</dt>
              <dd>{registration.totalAmountLabel}</dd>
            </div>
            <div>
              <dt>Havale Açıklaması</dt>
              <dd>{registration.paymentDescription}</dd>
            </div>
            <div>
              <dt>Ödeme Tarihi</dt>
              <dd>{formatDate(registration.paidAt)}</dd>
            </div>
            <div>
              <dt>Kayıt Tarihi</dt>
              <dd>{formatDate(registration.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="admin-detail-block">
          <h2>Sosyal Faaliyetler</h2>
          <dl className="admin-definition-list">
            <div>
              <dt>Gala Katılımı</dt>
              <dd>{registration.galaAmountLabel}</dd>
            </div>
            <div>
              <dt>Gezi Katılımı</dt>
              <dd>
                {registration.tripAttendance
                  ? `Evet (${registration.tripAttendeeCount} kişi)`
                  : "Hayır"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="admin-detail-block">
          <h2>Ödenen Bildiriler</h2>
          {registration.paperItems.length ? (
            <div className="admin-author-list">
              {registration.paperItems.map((item) => (
                <div key={item.submissionId} className="admin-author-item">
                  <h3>
                    {item.paperOrder === 2 ? "İkinci Bildiri (%50 İndirim)" : "Birinci Bildiri"}
                  </h3>
                  <p>
                    <strong>Başlık:</strong> {item.title}
                  </p>
                  <p>
                    <strong>Tutar:</strong> {item.amountLabel}
                  </p>
                  <Link
                    className="button secondary"
                    href={`/admin/bildiriler/${item.submissionId}`}
                    style={{ marginTop: 12, display: "inline-flex" }}
                  >
                    Bildiriyi Aç
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice">Bu kayıt yalnızca dinleyici katılımını içeriyor.</div>
          )}
        </div>

        <div className="admin-detail-block">
          <h2>Ödeme Dekontu</h2>
          {registration.receipt ? (
            <div className="admin-file-box">
              <p>
                <strong>Dosya Adı:</strong> {registration.receipt.originalName}
              </p>
              <p>
                <strong>Boyut:</strong> {formatFileSize(registration.receipt.fileSize)}
              </p>
              <p>
                <strong>Yükleme Tarihi:</strong> {formatDate(registration.receipt.uploadedAt)}
              </p>
              <a
                className="button primary"
                href={`/api/admin/registrations/${registration.id}/receipt`}
              >
                Dekontu İndir
              </a>
            </div>
          ) : (
            <div className="notice">Dekont yüklenmemiş.</div>
          )}
        </div>
      </section>
    </main>
  );
}
