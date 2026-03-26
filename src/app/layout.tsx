import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EYİ 2026 Bildiri Platformu",
  description: "EYİ 2026 bildiri gönderim ve yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
