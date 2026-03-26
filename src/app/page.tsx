import Link from "next/link";
import { PlatformHero } from "@/components/submission/platform-hero";

export default function HomePage() {
  return (
    <main className="page-shell">
      <PlatformHero />

      <div className="card start-card">
        <Link className="button primary" href="/eyi-2026/bildiri-gonder">
          Bildiri Gönder
        </Link>
      </div>
    </main>
  );
}
