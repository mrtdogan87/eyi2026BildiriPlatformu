import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { actorSession } from "@/platform/context";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session=await actorSession();
  if (session) {
    redirect(session.user.platformAdmin ? "/admin/platform" : "/admin/panel");
  }

  return (
    <main className="page-shell admin-page-shell">
      <section className="hero">
        <h1>Kongre Yönetim Platformu</h1>
        <p>
          Kişisel hesabınızla giriş yapın. Yetkili olduğunuz kurum ve kongreleri hesabınızdan seçebilirsiniz.
        </p>
      </section>

      <AdminLoginForm />
    </main>
  );
}
