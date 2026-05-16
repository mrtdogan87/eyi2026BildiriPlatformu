import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import {
  getAdminRegistrationList,
  normalizeAdminRegistrationFilters,
  requireAdminPage,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    status?: string;
    period?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminRegistrationsPage({ searchParams }: PageProps) {
  await requireAdminPage();
  const params = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const filters = normalizeAdminRegistrationFilters(params);
  const registrations = await getAdminRegistrationList(filters);

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <h1>Kayıtlar</h1>
          <p>Kongre kayıt ödemelerini ve dinleyici başvurularını görüntüleyin, yönetin.</p>
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

        <form className="admin-filter-grid" method="GET">
          <div className="field">
            <label htmlFor="q">Arama</label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="E-posta, açıklama, bildiri başlığı"
            />
          </div>
          <div className="field">
            <label htmlFor="kind">Kategori</label>
            <select id="kind" name="kind" defaultValue={filters.kind}>
              <option value="ALL">Tümü</option>
              <option value="PAPERS">Bildiri Ödemesi</option>
              <option value="LISTENER">Dinleyici</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Ödeme Durumu</label>
            <select id="status" name="status" defaultValue={filters.status}>
              <option value="ALL">Tümü</option>
              <option value="PAID">Ödendi</option>
              <option value="PENDING">Bekleniyor</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="period">Dönem</label>
            <select id="period" name="period" defaultValue={filters.period}>
              <option value="ALL">Tümü</option>
              <option value="EARLY">Erken Kayıt</option>
              <option value="LATE">Geç Kayıt</option>
            </select>
          </div>
          <div className="admin-filter-actions">
            <button className="button primary" type="submit">
              Filtrele
            </button>
            <Link className="button secondary" href="/admin/kayitlar">
              Temizle
            </Link>
          </div>
        </form>

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
          <div className="notice">Kayıt bulunamadı.</div>
        )}
      </section>
    </main>
  );
}
