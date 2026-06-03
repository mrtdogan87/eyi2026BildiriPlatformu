import "./globals.css";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "EYİ2026 / ISEOS2026 Platformu",
  description: "EYİ2026 / ISEOS2026 bildiri gönderim ve kayıt sistemi",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
