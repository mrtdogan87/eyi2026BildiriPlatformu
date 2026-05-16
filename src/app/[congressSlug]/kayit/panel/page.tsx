import { notFound, redirect } from "next/navigation";
import { PlatformHero } from "@/components/submission/platform-hero";
import { RegistrationPortal } from "@/components/registration/registration-portal";
import {
  getRegistrationContext,
  readRegistrationSession,
} from "@/lib/registration";
import { ensureCongress } from "@/lib/submission";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function RegistrationPanelPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const congress = await ensureCongress(congressSlug);
  const session = await readRegistrationSession();

  if (!session || session.congressId !== congress.id) {
    redirect(`/${congressSlug}/kayit`);
  }

  const context = await getRegistrationContext({
    email: session.email,
    congressSlug,
  });

  if (!context) {
    notFound();
  }

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero
          variant="registration"
          congressName={congress.name}
          subtitle="Kayıt paneli"
        />
        <RegistrationPortal context={context} />
      </div>
    </main>
  );
}
