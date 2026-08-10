import { notFound } from "next/navigation";
import { PlatformHero } from "@/components/submission/platform-hero";
import { SubmissionClosedNotice } from "@/components/submission/submission-closed";
import { SubmissionPortal } from "@/components/submission/submission-portal";
import {
  canAccessDraft,
  ensureCongress,
  getSubmissionConfig,
  getSubmissionSnapshot,
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
  const locale = await getLocale();

  await ensureCongress(congressSlug);
  const config = await getSubmissionConfig(congressSlug, locale);
  if (!config) {
    notFound();
  }

  const initialSnapshot =
    draft && (await canAccessDraft(draft)) ? await getSubmissionSnapshot(draft) : null;

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="submission" congressName={config.congressName} />

        {config.submissionsClosed ? (
          <SubmissionClosedNotice congressSlug={congressSlug} />
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
