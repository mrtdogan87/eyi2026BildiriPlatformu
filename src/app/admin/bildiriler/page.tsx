import {ListPosition,ListRecordLink} from '@/components/admin-ui/list-navigation';
import {DetailSection} from '@/components/admin-ui/workspace';
import Link from "next/link";
import { getAdminSubmissionList, normalizeAdminSubmissionFilters, requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    language?: string;
    presentationMode?: string;
    registration?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminSubmissionsPage({ searchParams }: PageProps) {
  const context = await requireAdminPage("submissions.read", "SUBMISSIONS");
  const params = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const filters = normalizeAdminSubmissionFilters(params);
  const submissions = await getAdminSubmissionList(filters);
  const exportHref = `/api/admin/submissions/export?${new URLSearchParams(
    Object.entries(filters),
  ).toString()}`;

  return (
    <main data-congress={context.congress.id} className="page-shell admin-page-shell">
      <ListPosition base="/admin/bildiriler" scope={context.congress.id}/><section className="hero admin-hero"><h1>Bildiriler</h1><p>{context.congress.name} · Sunucu filtreleri bütün erişilebilir kayıtları sorgular.</p></section>

      <section className="card admin-panel-card">
        <div className="admin-table-head">
          <div>
            <h2 className="section-title">Bildiri Listesi</h2>
            <p className="admin-subtitle">{submissions.length} adet gönderilmiş bildiri bulundu.</p>
          </div>
          <a className="button ghost admin-export-button" href={exportHref}>
            CSV İndir
          </a>
        </div>

        <form className="ui-list-filters" method="GET"><div className="admin-filter-grid"><div className="field">
            <label htmlFor="status">Durum</label>
            <select id="status" name="status" defaultValue={filters.status}>
              <option value="ALL">Tümü</option>
              <option value="SUBMITTED">Gönderildi</option>
              <option value="UNDER_REVIEW">İncelemede</option>
              <option value="ACCEPTED">Kabul Edildi</option>
              <option value="REJECTED">Reddedildi</option>
            </select>
          </div>
<div className="field">
            <label htmlFor="q">Arama</label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Başlık, yazar veya e-posta"
            />
          </div>
<div className="admin-filter-actions">
            <button className="button primary" type="submit">
              Filtrele
            </button>
            <Link className="button secondary" href="/admin/bildiriler">
              Temizle
            </Link>
          </div></div><DetailSection title="Gelişmiş filtreler"><div className="admin-filter-grid"><div className="field">
            <label htmlFor="language">Dil</label>
            <select id="language" name="language" defaultValue={filters.language}>
              <option value="ALL">Tümü</option>
              <option value="TR">Türkçe</option>
              <option value="EN">İngilizce</option>
            </select>
          </div>
<div className="field">
            <label htmlFor="presentationMode">Sunum</label>
            <select
              id="presentationMode"
              name="presentationMode"
              defaultValue={filters.presentationMode}
            >
              <option value="ALL">Tümü</option>
              <option value="IN_PERSON">Yüz Yüze</option>
              <option value="ONLINE">Çevrim İçi</option>
            </select>
          </div>
<div className="field">
            <label htmlFor="registration">Kayıt</label>
            <select id="registration" name="registration" defaultValue={filters.registration}>
              <option value="ALL">Tümü</option>
              <option value="PAID">Dekont tarihi var</option>
              <option value="PENDING">Bekleniyor</option>
            </select>
          </div></div></DetailSection></form>

        {submissions.length ? (
          <div><p className="ui-table-hint">Küçük ekranda diğer sütunlar için tabloyu yatay kaydırın.</p><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Bildiri tablosu">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sunan Yazar</th>
                  <th>E-posta</th>
                  <th>Durum</th>
                  <th>Dil</th>
                  <th>Sunum</th>
                  <th>Akademik Statü</th>
                  <th>Kayıt</th>
                  <th>Gönderim</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <ListRecordLink base="/admin/bildiriler" scope={context.congress.id} href={`/admin/bildiriler/${submission.id}`} className="admin-link-cell">
                        {submission.title}
                      </ListRecordLink>
                    </td>
                    <td>{submission.presenterName}</td>
                    <td>{submission.presenterEmail}</td>
                    <td>{submission.statusLabel}</td>
                    <td>{submission.submissionLanguage}</td>
                    <td>{submission.presentationMode}</td>
                    <td>{submission.audienceLabel}</td>
                    <td>{submission.registrationStatusLabel}</td>
                    <td>{formatDate(submission.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : (
          <div className="notice">Henüz gönderilmiş bildiri bulunmuyor.</div>
        )}
      </section>
    </main>
  );
}
