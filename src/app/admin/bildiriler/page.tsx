import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { getAdminSubmissionList, normalizeAdminSubmissionFilters, requireAdminPage } from "@/lib/admin";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    language?: string;
    presentationMode?: string;
    gala?: string;
    trip?: string;
  }>;
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

export default async function AdminSubmissionsPage({ searchParams }: PageProps) {
  await requireAdminPage();
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
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <h1>Gönderilen Bildiriler</h1>
          <p>EYİ 2026 için gönderilmiş bildirileri görüntüleyin, detaylarını inceleyin ve dosyaları indirin.</p>
        </div>
        <AdminLogoutButton />
      </section>

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

        <form className="admin-filter-grid" method="GET">
          <div className="field">
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
          <div className="field">
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
              <option value="IN_PERSON">Yüz yüze</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="gala">Gala</label>
            <select id="gala" name="gala" defaultValue={filters.gala}>
              <option value="ALL">Tümü</option>
              <option value="YES">Katılacak</option>
              <option value="NO">Katılmayacak</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="trip">Gezi</label>
            <select id="trip" name="trip" defaultValue={filters.trip}>
              <option value="ALL">Tümü</option>
              <option value="YES">Katılacak</option>
              <option value="NO">Katılmayacak</option>
            </select>
          </div>
          <div className="admin-filter-actions">
            <button className="button primary" type="submit">
              Filtrele
            </button>
            <Link className="button secondary" href="/admin/bildiriler">
              Temizle
            </Link>
          </div>
        </form>

        {submissions.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sunan Yazar</th>
                  <th>E-posta</th>
                  <th>Durum</th>
                  <th>Dil</th>
                  <th>Sunum</th>
                  <th>Gala</th>
                  <th>Gezi</th>
                  <th>Gönderim</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <Link href={`/admin/bildiriler/${submission.id}`} className="admin-link-cell">
                        {submission.title}
                      </Link>
                    </td>
                    <td>{submission.presenterName}</td>
                    <td>{submission.presenterEmail}</td>
                    <td>{submission.statusLabel}</td>
                    <td>{submission.submissionLanguage}</td>
                    <td>{submission.presentationMode}</td>
                    <td>{submission.galaLabel}</td>
                    <td>{submission.tripLabel}</td>
                    <td>{formatDate(submission.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="notice">Henüz gönderilmiş bildiri bulunmuyor.</div>
        )}
      </section>
    </main>
  );
}
