import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, makeT, type Locale, type TFunction } from ".";

export async function getLocale(languages?: readonly ("TR" | "EN")[]): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  return languages?.length && !languages.includes(locale === "en" ? "EN" : "TR") ? (languages[0] === "EN" ? "en" : "tr") : locale;
}

export async function getServerT(languages?: readonly ("TR" | "EN")[]): Promise<{ locale: Locale; t: TFunction }> {
  const locale = await getLocale(languages);
  return { locale, t: makeT(locale) };
}
