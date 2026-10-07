import {DetailSection} from '@/components/admin-ui/workspace';
import {ListReturnLink} from '@/components/admin-ui/list-navigation';
import {Workspace,WorkspacePanel} from '@/components/admin-ui/workspace';
import { prisma } from '@/lib/prisma';
import { moduleEnabled } from '@/platform/context';
import { allows } from "@/platform/policy";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDeleteSubmission } from "@/components/admin/admin-delete-submission";
import { AdminStatusForm } from "@/components/admin/admin-status-form";
import { getAdminSubmissionDetail, requireAdminPage } from "@/lib/admin";
import { revisionOverview } from '@/integrations/congress/revisions';
import { RevisionManager } from '@/components/revisions/manager';

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

export default async function AdminSubmissionDetailPage({ params }: PageProps) {
  const context = await requireAdminPage("submissions.read", "SUBMISSIONS");
  const { id } = await params;
  const submission = await getAdminSubmissionDetail(id);

  if (!submission) notFound();

  const isTurkish = submission.submissionLanguage === "TR";
  const revisions = await revisionOverview(id);
  const reviewHistory = await prisma.reviewRound.count({ where: { submissionId: id } });
  const programHistory = await prisma.programTalk.count({ where: { submissionId: id } });
  const reviewsEnabled = await moduleEnabled(context.congress.id, 'REVIEWS');

  return (
    <main className="page-shell admin-page-shell">
      {reviewsEnabled && allows(context.role, "reviews.read") && <p><Link className="button secondary" href={`/admin/hakemlik/bildiriler/${id}`}>Hakemlik turlarını ve editör kararını aç</Link></p>}
      <section className="hero admin-hero">
        <div>
          <ListReturnLink base="/admin/bildiriler" scope={context.congress.id} className="admin-back-link">
            ← Bildiri listesine dön
          </ListReturnLink>
          <h1>Bildiri Detayı</h1>
          <p>Gönderilen bildirinin tüm içerik, yazar ve katılım bilgileri aşağıdadır.</p>
        </div>

      </section>

      <Workspace label="Kayıt bölümleri"><WorkspacePanel id="summary" label="Özet"><div className="ui-record-body"><div className="admin-detail-block">
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
              <dt>Sunum Şekli</dt>
              <dd>{submission.presentationMode}</dd>
            </div>
            <div>
              <dt>Akademik Statü</dt>
              <dd>{submission.audienceLabel}</dd>
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
          <h2>Yazarlar</h2>
          <div className="admin-author-list">
            {submission.authors.map((author, index) => (
              <div key={author.id} className="admin-author-item">
                <h3>
                  {index + 1}. Yazar{" "}
                  {author.isPresenter ? <span className="pill">Sunan yazar</span> : null}
                </h3>
                <p>
                  <strong>Ad Soyad:</strong> {author.fullName}
                </p>
                <p>
                  <strong>Unvan:</strong> {author.title || "-"}
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
          <h2>Kayıt Durumu</h2>
          {submission.registration ? (
            <div className="admin-author-item">
              <p>
                <strong>Kayıt Tutarı:</strong> {submission.registration.amountLabel}
              </p>
              <p>
                <strong>Sıra:</strong>{" "}
                {submission.registration.paperOrder === 2
                  ? "İkinci Bildiri (Ücretsiz)"
                  : "Birinci Bildiri"}
              </p>
              <p>
                <strong>Açıklama:</strong> {submission.registration.description}
              </p>
              <p>
                <strong>Dekont Kayıt Tarihi:</strong> {formatDate(submission.registration.paidAt)}
              </p>
              <Link
                className="button primary"
                href={`/admin/kayitlar/${submission.registration.id}`}
                style={{ marginTop: 12, display: "inline-flex" }}
              >
                Kayıt Detayına Git
              </Link>
            </div>
          ) : (
            <div className="notice">
              Bu bildiri için henüz ilişkili kayıt yok. Dekont kaydı ödeme doğrulaması değildir.
            </div>
          )}
        </div></div></WorkspacePanel>
<WorkspacePanel id="actions" label="Durum ve işlemler"><div className="ui-record-body"><div className="admin-detail-block">
          <h2>Durum Yönetimi</h2>
          {reviewHistory ? <p>Bilimsel karar Hakemlik ekranından verilir; tur ve karar geçmişi korunur.</p> : allows(context.role, "submissions.status") ? <AdminStatusForm submissionId={submission.id} currentStatus={submission.status} /> : null}
        </div>
<DetailSection title="Diğer işlemler"><div className="admin-detail-block admin-detail-block-danger">
          <h2>Tehlikeli İşlem · Bildiriyi Sil</h2>
          {programHistory || reviewHistory || revisions.files.length || revisions.changes.length || revisions.requests.length ? <p className="notice">Bu bildirinin dosya veya düzeltme geçmişi korunur; kalıcı silme kapalıdır.</p> : allows(context.role, "submissions.delete") ? <AdminDeleteSubmission
            submissionId={submission.id}
            submissionTitle={isTurkish ? submission.titleTr : submission.titleEn}
          /> : null}
        </div></DetailSection></div></WorkspacePanel>
<WorkspacePanel id="files" label="Dosyalar"><div className="ui-record-body"><div className="admin-detail-block">
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
        </div></div></WorkspacePanel>
<WorkspacePanel id="history" label="Geçmiş"><div className="ui-record-body"><div className="admin-detail-block">
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
        </div></div></WorkspacePanel>
<WorkspacePanel id="revisions" label="Düzeltmeler"><div className="ui-record-body"><RevisionManager initial={revisions} canCorrect={allows(context.role, 'submissions.correct')} /></div></WorkspacePanel></Workspace>

    </main>
  );
}
