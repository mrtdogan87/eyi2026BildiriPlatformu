import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PlatformHero } from "@/components/submission/platform-hero";
import { getServerT } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
};

export default async function SuccessPage({ params }: PageProps) {
  const { congressSlug } = await params;
  const { t } = await getServerT();

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero
          variant="submission"
          subtitle={t("submission.successSubtitle")}
          caption={t("submission.successCaption")}
        />

        <div className="completion-panel">
          <div className="completion-icon" aria-hidden="true">
            <CheckCircle2 size={34} strokeWidth={1.9} />
          </div>
          <div>
            <h2 className="section-title">{t("submission.successTitle")}</h2>
            <p className="flow-intro">{t("submission.successIntro")}</p>
          </div>
          <div className="completion-actions">
            <Link className="button primary" href={`/${congressSlug}/bildiri-gonder`}>
              {t("submission.newPaper")}
            </Link>
            <Link className="button ghost" href={`/${congressSlug}`}>
              {t("submission.applicationCenter")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
