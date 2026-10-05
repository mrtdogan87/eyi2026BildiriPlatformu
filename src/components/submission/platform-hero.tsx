import { getServerT } from "@/lib/i18n/server";

type Props = {
  languages?: readonly ("TR" | "EN")[];
  caption?: string;
  variant?: "default" | "submission" | "registration" | "hub";
  congressName?: string;
  subtitle?: string;
};

export async function PlatformHero({
  caption, languages,
  variant = "default",
  congressName,
  subtitle,
}: Props) {
  const { t } = await getServerT(languages);
  const eventShortName = congressName ?? t("common.platformName");
  const congressDisplayName = congressName;

  const eyebrow =
    variant === "submission"
      ? t("submission.heroEyebrow")
      : variant === "registration"
        ? t("registration.heroEyebrow")
        : variant === "hub"
          ? t("hub.eyebrow", { title: eventShortName })
          : eventShortName;

  const title =
    variant === "submission"
      ? t("submission.heroTitle")
      : variant === "registration"
        ? t("registration.heroTitle")
        : variant === "hub"
          ? congressName ?? t("common.platformName")
          : t("common.platformName");

  const heroSubtitle = subtitle ?? congressDisplayName ?? t("common.platformName");

  return (
    <section className={`hero platform-hero platform-hero-${variant}`}>
      <div>
        <span className="platform-hero-eyebrow">{eyebrow}</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{heroSubtitle}</p>
      </div>
      {caption ? (
        <p className="hero-caption">
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
