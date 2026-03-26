import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminStatusForm } from "@/components/admin/admin-status-form";
import { getAdminSubmissionDetail, requireAdminPage } from "@/lib/admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(fileSize: number) {
  return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function AdminSubmissionDetailPage({ params }: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const submission = await getAdminSubmissionDetail(id);

  if (!submission) {
    notFound();
  }

  const isTurkish = submission.submissionLanguage === "TR";

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <Link href="/admin/bildiriler" className="admin-back-link">
            ← Bildiri listesine dön
          </Link>
          <h1>Bildiri Detayı</h1>
          <p>Gönderilen bildirinin tüm içerik, yazar ve katılım bilgileri aşağıda gösterilmektedir.</p>
        </div>
        <AdminLogoutButton />
      </section>

      <section className="card admin-panel-card admin-detail-grid">
        <div className="admin-detail-block">
          <h2>Bildiri Bilgileri</h2>
          <dl className="admin-definition-list">
            <div>
              <dt>Durum</dt>
              <dd>{submission.statusLabel}</dd>
            </div>
            <div>
              <dt>Bildiri Dili</dt>
              <dd>{submission.submissionLanguage === "TR" ? "Türkçe" : "İngilizce"}</dd>
            </div>
            <div>
              <dt>Başlık</dt>
              <dd>{isTurkish ? submission.titleTr : submission.titleEn}</dd>
            </div>
            <div>
              <dt>Özet</dt>
              <dd>{isTurkish ? submission.abstractTr : submission.abstractEn}</dd>
            </div>
            <div>
              <dt>Anahtar Kelimeler</dt>
              <dd>{isTurkish ? submission.keywordsTr : submission.keywordsEn}</dd>
            </div>
            <div>
              <dt>Gönderim Tarihi</dt>
              <dd>{formatDate(submission.submittedAt)}</dd>
            </div>
            <div>
              <dt>Taslak Sahibi E-posta</dt>
              <dd>{submission.draftOwnerEmail}</dd>
            </div>
          </dl>
        </div>

        <div className="admin-detail-block">
          <h2>Durum Yönetimi</h2>
          <AdminStatusForm submissionId={submission.id} currentStatus={submission.status} />
        </div>

        <div className="admin-detail-block">
          <h2>Yazarlar</h2>
          <div className="admin-author-list">
            {submission.authors.map((author, index) => (
              <div key={author.id} className="admin-author-item">
                <h3>
                  {index + 1}. Yazar {author.isPresenter ? <span className="pill">Sunan yazar</span> : null}
                </h3>
                <p>
                  <strong>Ad Soyad:</strong> {author.fullName}
                </p>
                <p>
                  <strong>E-posta:</strong> {author.email}
                </p>
                <p>
                  <strong>Kurum:</strong> {author.institution || "-"}
                </p>
                <p>
                  <strong>Ülke:</strong> {author.country || "-"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-detail-block">
          <h2>Katılım ve Sosyal Faaliyetler</h2>
          <dl className="admin-definition-list">
            <div>
              <dt>Sunum Şekli</dt>
              <dd>{submission.presentationMode}</dd>
            </div>
            <div>
              <dt>Gala Katılımı</dt>
              <dd>
                {submission.galaAttendance ? `Evet (${submission.galaAttendeeCount} kişi)` : "Hayır"}
              </dd>
            </div>
            <div>
              <dt>Gezi Katılımı</dt>
              <dd>
                {submission.tripAttendance ? `Evet (${submission.tripAttendeeCount} kişi)` : "Hayır"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="admin-detail-block">
          <h2>Dosya</h2>
          {submission.file ? (
            <div className="admin-file-box">
              <p>
                <strong>Dosya Adı:</strong> {submission.file.originalName}
              </p>
              <p>
                <strong>Boyut:</strong> {formatFileSize(submission.file.fileSize)}
              </p>
              <p>
                <strong>Yükleme Tarihi:</strong> {formatDate(submission.file.uploadedAt)}
              </p>
              <a className="button primary" href={`/api/admin/submissions/${submission.id}/file`}>
                DOCX İndir
              </a>
              <div className="admin-preview-box">
                <h3>Dosya Önizleme</h3>
                {submission.file.previewText ? (
                  <pre>{submission.file.previewText}</pre>
                ) : (
                  <p>Bu dosya için önizleme oluşturulamadı.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="notice">Bu bildiri için dosya bulunamadı.</div>
          )}
        </div>

        <div className="admin-detail-block">
          <h2>Durum Geçmişi</h2>
          {submission.statusHistory.length ? (
            <div className="admin-history-list">
              {submission.statusHistory.map((entry) => (
                <div key={entry.id} className="admin-history-item">
                  <p>
                    <strong>{entry.toStatus}</strong> · {formatDate(entry.changedAt)}
                  </p>
                  <p>
                    <strong>Önceki Durum:</strong> {entry.fromStatus ?? "İlk Kayıt"}
                  </p>
                  <p>
                    <strong>Not:</strong> {entry.note || "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice">Henüz durum geçmişi kaydı bulunmuyor.</div>
          )}
        </div>
      </section>
    </main>
  );
}
