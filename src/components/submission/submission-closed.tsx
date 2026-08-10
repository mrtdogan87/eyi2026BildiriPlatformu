import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";

type Props = {
  congressSlug: string;
};

/** Bildiri gönderimi kapatıldığında gönderim sayfalarının yerine gösterilen bilgi ekranı. */
export async function SubmissionClosedNotice({ congressSlug }: Props) {
  const { t } = await getServerT();

  return (
    <div className="card start-card">
      <div className="submission-closed">
        <span className="submission-closed-icon" aria-hidden="true">
          <Lock size={30} strokeWidth={1.8} />
        </span>
        <h2 className="section-title">{t("submission.closedTitle")}</h2>
        <p>{t("submission.closedBody")}</p>
        <Link className="button primary" href={`/${congressSlug}/kayit`}>
          {t("submission.closedRegistrationCta")} <ArrowRight size={18} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
