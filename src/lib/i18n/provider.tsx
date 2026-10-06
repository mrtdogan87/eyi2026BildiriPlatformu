"use client";

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { LOCALE_COOKIE, makeT, type Locale, type TFunction } from ".";

type LanguageContextValue = {
  locale: Locale;
  pageLocales: readonly Locale[] | undefined;
  setPageLocales: (locales: readonly Locale[] | undefined) => void;
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
  const [pageLocales, setPageLocales] = useState<readonly Locale[] | undefined>();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      setLocaleState(next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.location.assign(url.pathname + url.search + url.hash);
    },
    [],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, pageLocales, setPageLocales, t: makeT(locale), setLocale }),
    [locale, pageLocales, setLocale],
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

export function PageLanguageAvailability({available}:{available:readonly Locale[]}) {
  const {setPageLocales}=useLanguage();
  const key=available.join(',');
  useEffect(()=>{setPageLocales(key?key.split(',') as Locale[]:[]);return ()=>setPageLocales(undefined);},[key,setPageLocales]);
  return null;
}
