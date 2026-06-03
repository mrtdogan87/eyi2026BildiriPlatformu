import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

export default async function CongressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <LanguageProvider initialLocale={locale}>
      <div className="lang-toggle-bar">
        <LanguageToggle />
      </div>
      {children}
    </LanguageProvider>
  );
}
