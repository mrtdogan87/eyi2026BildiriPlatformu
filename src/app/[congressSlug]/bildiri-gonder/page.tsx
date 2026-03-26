import { PlatformHero } from "@/components/submission/platform-hero";
import { SubmissionPortal } from "@/components/submission/submission-portal";
import { canAccessDraft, getSubmissionSnapshot } from "@/lib/submission";

type PageProps = {
  params: Promise<{ congressSlug: string }>;
  searchParams: Promise<{ draft?: string }>;
};

export default async function SubmissionPage({ params, searchParams }: PageProps) {
  const { congressSlug } = await params;
  const { draft } = await searchParams;

  const initialSnapshot =
    draft && (await canAccessDraft(draft)) ? await getSubmissionSnapshot(draft) : null;

  return (
    <main className="page-shell">
      <PlatformHero />

      <SubmissionPortal congressSlug={congressSlug} initialSnapshot={initialSnapshot} />
    </main>
  );
}
