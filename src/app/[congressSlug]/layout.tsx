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
  if (!(await prisma.congress.findUnique({ where: { slug: congressSlug }, select: { id: true } }))) notFound();
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
