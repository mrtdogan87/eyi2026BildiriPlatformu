import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, makeT, type Locale, type TFunction } from ".";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getServerT(): Promise<{ locale: Locale; t: TFunction }> {
  const locale = await getLocale();
  return { locale, t: makeT(locale) };
}
