import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { getAdminSubmissionList, requireAdminPage } from "@/lib/admin";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminSubmissionsPage() {
  await requireAdminPage();
  const submissions = await getAdminSubmissionList();

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
        </div>

        {submissions.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Sunan Yazar</th>
                  <th>E-posta</th>
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
