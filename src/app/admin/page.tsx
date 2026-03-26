import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated } from "@/lib/admin";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin/bildiriler");
  }

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero">
        <h1>EYİ 2026 Yönetim Paneli</h1>
        <p>
          Bu alan yalnızca yönetim kullanımı içindir. Gönderilmiş bildirileri görüntülemek ve
          dosyaları indirmek için giriş yapın.
        </p>
      </section>

      <AdminLoginForm />
    </main>
  );
}
