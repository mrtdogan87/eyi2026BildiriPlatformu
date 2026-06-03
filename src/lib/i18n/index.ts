import { messages } from "./messages";

export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "tr" || value === "en";
}

function lookup(obj: unknown, path: string): string | undefined {
  const result = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
  return typeof result === "string" ? result : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = lookup(messages[locale], key) ?? lookup(messages[DEFAULT_LOCALE], key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] != null ? String(vars[name]) : `{${name}}`,
  );
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): TFunction {
  return (key, vars) => translate(locale, key, vars);
}
