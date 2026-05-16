type Props = {
  caption?: string;
  variant?: "default" | "submission" | "registration" | "hub";
  congressName?: string;
  subtitle?: string;
};

export function PlatformHero({ caption, variant = "default", congressName, subtitle }: Props) {
  const title =
    variant === "submission"
      ? "Bildiri Gönderimi"
      : variant === "registration"
        ? "Kongre Kaydı"
        : variant === "hub"
          ? congressName ?? "Bildiri Yönetim Platformu"
          : "Bildiri Yönetim Platformu";

  const heroSubtitle =
    subtitle ?? congressName ?? "23. Uluslararası Ekonometri, Yöneylem Araştırması ve İstatistik Sempozyumu";

  return (
    <section className="hero">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{heroSubtitle}</p>
      {caption ? (
        <p className="hero-caption">
          <strong>{caption}</strong>
        </p>
      ) : null}
    </section>
  );
}
