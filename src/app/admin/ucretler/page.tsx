import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { PricingManager } from "@/components/admin/pricing-manager";
import { getAdminPricingPayload, requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  await requireAdminPage();
  const pricing = await getAdminPricingPayload();

  if (!pricing) {
    notFound();
  }

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero admin-hero">
        <div>
          <Link href="/admin/bildiriler" className="admin-back-link">
            ← Bildiri listesine dön
          </Link>
          <h1>Ücret ve Kongre Ayarları</h1>
          <p>
            Kayıt dönemleri, banka bilgileri, gala ücreti ve katılım kategorilerine göre ücret
            tarifesini buradan yönetin. Değişiklikler kaydedildiği anda başvuru formuna yansır.
          </p>
        </div>
        <AdminLogoutButton />
      </section>

      <section className="card admin-panel-card">
        <PricingManager initialPayload={pricing} />
      </section>
    </main>
  );
}
