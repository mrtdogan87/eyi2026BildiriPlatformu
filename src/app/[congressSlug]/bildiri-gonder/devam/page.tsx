import { DraftLinkGate } from "@/components/submission/draft-link-gate";
import { PlatformHero } from "@/components/submission/platform-hero";
import { SubmissionClosedNotice } from "@/components/submission/submission-closed";
import {
  getDraftTokenWindowMinutes,
  inspectDraftToken,
  isSubmissionClosed,
} from "@/lib/submission";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type ContinueDraftPageProps = {
  params: Promise<{ congressSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ContinueDraftPage({
  params,
  searchParams,
}: ContinueDraftPageProps) {
  const { congressSlug } = await params;
  const { token } = await searchParams;
  const trimmedToken = token?.trim() ?? "";
  const submission = trimmedToken ? await inspectDraftToken(trimmedToken) : null;
  const { t } = await getServerT();
  const submissionsClosed = await isSubmissionClosed(congressSlug);

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero
          variant="submission"
          subtitle={t("submission.secureLinkSubtitle")}
        />

        {submissionsClosed ? (
          <SubmissionClosedNotice congressSlug={congressSlug} />
        ) : (
          <div className="card start-card">
            <h2 className="section-title">{t("submission.continueDraftTitle")}</h2>
            <DraftLinkGate
              congressSlug={congressSlug}
              isValid={Boolean(trimmedToken && submission)}
              token={trimmedToken}
              windowMinutes={getDraftTokenWindowMinutes()}
            />
          </div>
        )}
      </div>
    </main>
  );
}
