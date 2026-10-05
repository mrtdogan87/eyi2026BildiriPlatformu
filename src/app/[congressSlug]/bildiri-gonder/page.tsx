import { effectiveConfiguration } from "@/modules/congress/configuration";
import { publicCongress } from "@/integrations/congress/public-context";
import { moduleEnabled } from "@/platform/context";
import { notFound } from "next/navigation";
import { PlatformHero } from "@/components/submission/platform-hero";
import { ConfiguredPortal } from "@/components/submission/configured-portal";
import { SubmissionPortal } from "@/components/submission/submission-portal";
import {
  canAccessDraft,
  getSubmissionConfig,
  getSubmissionSnapshot,
  isSubmissionClosedForDraft,
} from "@/lib/submission";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
  searchParams: Promise<{ draft?: string }>;
};

export default async function SubmissionPage({ params, searchParams }: PageProps) {
  const { congressSlug } = await params;
  const { draft } = await searchParams;


  const congress = await publicCongress(congressSlug);
  if (!(await moduleEnabled(congress.id, "SUBMISSIONS"))) return null;
  const locale = await getLocale(effectiveConfiguration(congress.configuration).languages);
  const config = await getSubmissionConfig(congressSlug, locale);
  if (!config) {
    notFound();
  }

  const snapshot =
    draft && (await canAccessDraft(draft)) ? await getSubmissionSnapshot(draft) : null;

  const initialSnapshot = snapshot?.congressSlug === congressSlug ? snapshot : null;
  if (initialSnapshot) {
    config.deliveryAccess = { metadata: !(await isSubmissionClosedForDraft(initialSnapshot.id)), fullText: !(await isSubmissionClosedForDraft(initialSnapshot.id, 'FULL_TEXT')) };
    config.submissionsClosed = !config.deliveryAccess.metadata && !config.deliveryAccess.fullText;
  }
  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="submission" congressName={config.congressName} languages={config.workflow?.languages} />

        {config.workflow || config.submissionsClosed || (config.deliveryAccess && (!config.deliveryAccess.metadata || !config.deliveryAccess.fullText)) ? (
          <ConfiguredPortal congressSlug={congressSlug} config={config} initialSnapshot={initialSnapshot}/>
        ) : (
          <SubmissionPortal
            congressSlug={congressSlug}
            initialSnapshot={initialSnapshot}
            config={config}
          />
        )}
      </div>
    </main>
  );
}
