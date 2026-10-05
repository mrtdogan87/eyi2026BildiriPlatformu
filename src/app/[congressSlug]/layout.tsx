import type { CSSProperties } from "react";
import { effectiveConfiguration } from "@/modules/congress/configuration";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { LanguageToggle } from "@/lib/i18n/language-toggle";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

export default async function CongressLayout({
  children, params,
}: {
  children: React.ReactNode; params: Promise<{ congressSlug: string }>;
}) {
  const { congressSlug } = await params;
  const congress = await prisma.congress.findUnique({ where: { slug: congressSlug } });
  if (!congress) notFound();
  const config = effectiveConfiguration(congress.configuration);
  const preferred = await getLocale();
  const locale = config.languages.includes(preferred === "en" ? "EN" : "TR") ? preferred : config.languages[0] === "EN" ? "en" : "tr";
  return (
    <LanguageProvider initialLocale={locale}>
      <div data-congress-theme={config.theme} style={congress.configuration ? ({ "--primary":config.accent,"--primary-soft":config.accent,"--primary-strong":config.accent,"--accent":config.accent } as CSSProperties) : undefined}>
      <div className="lang-toggle-bar">
        {config.languages.length > 1 && <LanguageToggle />}
      </div>
      {children}
      </div>
    </LanguageProvider>
  );
}
