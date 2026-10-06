"use client";

import { useLanguage } from "./provider";

export function LanguageToggle({ available = ["tr", "en"] }: { available?: readonly ("tr" | "en")[] }) {
  const { locale, setLocale, pageLocales } = useLanguage();
  const allowed = pageLocales ?? available;
  return (
    <div className="lang-toggle" role="group" aria-label="Language / Dil">
      <button
        className={`lang-toggle-btn${locale === "tr" ? " is-active" : ""}`}
        disabled={!allowed.includes("tr")}
        title={!allowed.includes("tr") ? "Türkçe sürümü yayımlanmamış" : undefined}
        onClick={() => setLocale("tr")}
        type="button"
        aria-pressed={locale === "tr"}
      >
        TR
      </button>
      <button
        className={`lang-toggle-btn${locale === "en" ? " is-active" : ""}`}
        disabled={!allowed.includes("en")}
        title={!allowed.includes("en") ? "İngilizce sürümü yayımlanmamış / English version is not published" : undefined}
        onClick={() => setLocale("en")}
        type="button"
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
