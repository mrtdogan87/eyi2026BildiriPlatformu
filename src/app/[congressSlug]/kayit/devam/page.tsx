import { PlatformHero } from "@/components/submission/platform-hero";
import { RegistrationLinkGate } from "@/components/registration/registration-link-gate";
import { ensureCongress } from "@/lib/submission";
import { inspectRegistrationToken } from "@/lib/registration";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function RegistrationContinuePage({ params, searchParams }: PageProps) {
  const { congressSlug } = await params;
  const { token } = await searchParams;
  const trimmedToken = token?.trim() ?? "";
  const congress = await ensureCongress(congressSlug);

  const record = trimmedToken ? await inspectRegistrationToken(trimmedToken) : null;
  const isValid = Boolean(record && record.congressId === congress.id);

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="registration" congressName={congress.name} />

        <div className="card start-card">
          <h2 className="section-title">Kayıt Bağlantınızı Doğrulayın</h2>
          <RegistrationLinkGate
            congressSlug={congressSlug}
            isValid={isValid}
            token={trimmedToken}
          />
        </div>
      </div>
    </main>
  );
}
