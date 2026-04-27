import { notFound } from "next/navigation";
import { PlatformHero } from "@/components/submission/platform-hero";
import { SubmissionPortal } from "@/components/submission/submission-portal";
import {
  canAccessDraft,
  ensureCongress,
  getSubmissionConfig,
  getSubmissionSnapshot,
} from "@/lib/submission";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const congressSlug = "eyi-2026";
  await ensureCongress(congressSlug);

  const config = await getSubmissionConfig(congressSlug);
  if (!config) {
    notFound();
  }

  const { draft } = await searchParams;
  const initialSnapshot =
    draft && (await canAccessDraft(draft)) ? await getSubmissionSnapshot(draft) : null;

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="submission" congressName={config.congressName} />

        <SubmissionPortal
          congressSlug={congressSlug}
          initialSnapshot={initialSnapshot}
          config={config}
        />
      </div>
    </main>
  );
}
