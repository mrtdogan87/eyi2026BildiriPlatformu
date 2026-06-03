"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, makeT, type Locale, type TFunction } from ".";

type LanguageContextValue = {
  locale: Locale;
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      setLocaleState(next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t: makeT(locale), setLocale }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

export function useT(): TFunction {
  return useLanguage().t;
}

export function useLocale(): Locale {
  return useLanguage().locale;
}
