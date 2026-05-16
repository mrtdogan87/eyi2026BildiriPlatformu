import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { getAdminRegistrationList, requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminRegistrationsPage() {
  await requireAdminPage();
  const registrations = await getAdminRegistrationList();

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <h1>Kayıtlar</h1>
          <p>Kongre kayıt ödemelerini ve dinleyici başvurularını görüntüleyin.</p>
        </div>
        <div className="admin-hero-actions">
          <Link className="button ghost" href="/admin/bildiriler">
            Bildiriler
          </Link>
          <Link className="button ghost" href="/admin/ucretler">
            Ücret ve Ayarlar
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      <section className="card admin-panel-card">
        <div className="admin-table-head">
          <div>
            <h2 className="section-title">Kayıt Listesi</h2>
            <p className="admin-subtitle">{registrations.length} kayıt bulundu.</p>
          </div>
        </div>

        {registrations.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Kategori</th>
                  <th>Bildiri Sayısı</th>
                  <th>Toplam</th>
                  <th>Dönem</th>
                  <th>Ödendi</th>
                  <th>Oluşturuldu</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td>
                      <Link className="admin-link-cell" href={`/admin/kayitlar/${registration.id}`}>
                        {registration.email}
                      </Link>
                    </td>
                    <td>{registration.kindLabel}</td>
                    <td>{registration.paperCount}</td>
                    <td>{registration.totalAmountLabel}</td>
                    <td>{registration.paymentPeriodLabel}</td>
                    <td>{formatDate(registration.paidAt)}</td>
                    <td>{formatDate(registration.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="notice">Henüz kayıt bulunmuyor.</div>
        )}
      </section>
    </main>
  );
}
