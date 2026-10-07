import {ListPosition,ListRecordLink} from '@/components/admin-ui/list-navigation';
import {DetailSection} from '@/components/admin-ui/workspace';
import Link from "next/link";
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
  const context = await requireAdminPage("registrations.read", "REGISTRATION");
  const params = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const filters = normalizeAdminRegistrationFilters(params);
  const registrations = await getAdminRegistrationList(filters);

  return (
    <main data-congress={context.congress.id} className="page-shell admin-page-shell">
      <ListPosition base="/admin/kayitlar" scope={context.congress.id}/><section className="hero admin-hero"><h1>Kayıtlar</h1><p>{context.congress.name} · Sunucu filtreleri bütün erişilebilir kayıtları sorgular.</p></section>

      <section className="card admin-panel-card">
        <div className="admin-table-head">
          <div>
            <h2 className="section-title">Kayıt Listesi</h2>
            <p className="admin-subtitle">{registrations.length} kayıt bulundu.</p>
          </div>
        </div>

        <form className="ui-list-filters" method="GET"><div className="admin-filter-grid"><div className="field">
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
<div className="admin-filter-actions">
            <button className="button primary" type="submit">
              Filtrele
            </button>
            <Link className="button secondary" href="/admin/kayitlar">
              Temizle
            </Link>
          </div></div><DetailSection title="Gelişmiş filtreler"><div className="admin-filter-grid"><div className="field">
            <label htmlFor="status">Eski Dekont Tarihi Filtresi</label>
            <select id="status" name="status" defaultValue={filters.status}>
              <option value="ALL">Tümü</option>
              <option value="PAID">Dekont tarihi var</option>
              <option value="PENDING">Dekont tarihi yok</option>
            </select>
          </div>
<div className="field">
            <label htmlFor="period">Dönem</label>
            <select id="period" name="period" defaultValue={filters.period}>
              <option value="ALL">Tümü</option>
              <option value="EARLY">Erken Kayıt</option>
              <option value="LATE">Geç Kayıt</option>
            </select>
          </div></div></DetailSection></form>

        {registrations.length ? (
          <div><p className="ui-table-hint">Küçük ekranda diğer sütunlar için tabloyu yatay kaydırın.</p><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Kayıt tablosu">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Kategori</th>
                  <th>Bildiri Sayısı</th>
                  <th>Toplam</th>
                  <th>Dönem</th>
                  <th>Ödeme doğrulama</th>
                  <th>Dekont tarihi</th>
                  <th>Oluşturuldu</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration) => (
                  <tr key={registration.id}>
                    <td>
                      <ListRecordLink base="/admin/kayitlar" scope={context.congress.id} className="admin-link-cell" href={`/admin/kayitlar/${registration.id}`}>
                        {registration.email}
                      </ListRecordLink>
                    </td>
                    <td>{registration.kindLabel}</td>
                    <td>{registration.paperCount}</td>
                    <td>{registration.totalAmountLabel}</td>
                    <td>{registration.paymentPeriodLabel}</td>
                    <td>{registration.paymentStateLabel}</td>
                    <td>{formatDate(registration.paidAt)}</td>
                    <td>{formatDate(registration.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        ) : (
          <div className="notice">Kayıt bulunamadı.</div>
        )}
      </section>
    </main>
  );
}
