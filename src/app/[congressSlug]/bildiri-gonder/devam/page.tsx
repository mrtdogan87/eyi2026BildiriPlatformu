import { DraftLinkGate } from "@/components/submission/draft-link-gate";
import { PlatformHero } from "@/components/submission/platform-hero";
import { getDraftTokenWindowMinutes, inspectDraftToken } from "@/lib/submission";

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

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="submission" />

        <div className="card start-card">
          <h2 className="section-title">Taslağa Güvenli Devam</h2>
          <DraftLinkGate
            congressSlug={congressSlug}
            isValid={Boolean(trimmedToken && submission)}
            token={trimmedToken}
            windowMinutes={getDraftTokenWindowMinutes()}
          />
        </div>
      </div>
    </main>
  );
}
