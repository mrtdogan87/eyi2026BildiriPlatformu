import { PlatformHero } from "@/components/submission/platform-hero";
import { SubmissionPortal } from "@/components/submission/submission-portal";
import { canAccessDraft, getSubmissionSnapshot } from "@/lib/submission";

type HomePageProps = {
  searchParams: Promise<{ draft?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const congressSlug = "eyi-2026";
  const { draft } = await searchParams;
  const initialSnapshot =
    draft && (await canAccessDraft(draft)) ? await getSubmissionSnapshot(draft) : null;

  return (
    <main className="page-shell submission-shell">
      <div className="page-box submission-page-box">
        <PlatformHero variant="submission" />

        <SubmissionPortal congressSlug={congressSlug} initialSnapshot={initialSnapshot} />
      </div>
    </main>
  );
}
