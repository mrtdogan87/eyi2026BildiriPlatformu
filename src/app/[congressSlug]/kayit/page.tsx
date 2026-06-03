import Link from "next/link";
import { PlatformHero } from "@/components/submission/platform-hero";
import { RegistrationEmailForm } from "@/components/registration/registration-email-form";
import { ensureCongress } from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function RegistrationStartPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const congress = await ensureCongress(congressSlug);
  const { t } = await getServerT();

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="registration" congressName={congress.name} />

        <div className="card start-card">
          <h2 className="section-title">{t("registration.startTitle")}</h2>
          <p className="flow-intro">{t("registration.startIntro")}</p>
          <RegistrationEmailForm congressSlug={congressSlug} />
        </div>

        <p className="flow-note">
          {t("registration.flowNotePrefix")}{" "}
          <Link href={`/${congressSlug}/bildiri-gonder`}>{t("registration.flowNoteLink")}</Link>{" "}
          {t("registration.flowNoteSuffix")}
        </p>
      </div>
    </main>
  );
}
