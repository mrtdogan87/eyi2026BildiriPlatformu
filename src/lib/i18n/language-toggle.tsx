"use client";

import { useLanguage } from "./provider";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / Dil">
      <button
        className={`lang-toggle-btn${locale === "tr" ? " is-active" : ""}`}
        onClick={() => setLocale("tr")}
        type="button"
        aria-pressed={locale === "tr"}
      >
        TR
      </button>
      <button
        className={`lang-toggle-btn${locale === "en" ? " is-active" : ""}`}
        onClick={() => setLocale("en")}
        type="button"
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
