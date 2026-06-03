import { getServerT } from "@/lib/i18n/server";

type Props = {
  caption?: string;
  variant?: "default" | "submission" | "registration" | "hub";
  congressName?: string;
  subtitle?: string;
};

export async function PlatformHero({
  caption,
  variant = "default",
  congressName,
  subtitle,
}: Props) {
  const { locale, t } = await getServerT();
  const eventShortName = locale === "en" ? "ISEOS 2026" : "EYİ 2026";
  const normalizedCongressName = congressName?.toLocaleLowerCase("tr-TR") ?? "";
  const isEyiCongress =
    normalizedCongressName.includes("eyi") || normalizedCongressName.includes("ekonometri");
  const congressDisplayName =
    locale === "en" && isEyiCongress
      ? t("submission.heroDefaultSubtitle")
      : congressName;

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

  const heroSubtitle = subtitle ?? congressDisplayName ?? t("submission.heroDefaultSubtitle");

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
