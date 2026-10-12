import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { getLocale } from "@/lib/i18n/server";
import { historyCaptureBootstrap } from "@/components/admin-ui/history-navigation";

export const metadata: Metadata = {
  title: "Kongre Yönetim Platformu",
  description: "Kurum ve kongreler için bildiri, kayıt ve ekip yönetimi",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>{children}<Script id="admin-history-capture" strategy="beforeInteractive">{historyCaptureBootstrap}</Script></body>
    </html>
  );
}
