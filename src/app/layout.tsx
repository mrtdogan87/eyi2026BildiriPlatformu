import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Bildiri Yonetim",
  description: "Kongreler icin bildiri gonderim sistemi",
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
