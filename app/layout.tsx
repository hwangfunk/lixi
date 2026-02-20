import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif_Display } from "next/font/google";

import "./globals.css";

const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["400", "500", "700", "800"],
});

const displayFont = Noto_Serif_Display({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  display: "swap",
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: "Lì Xì Tết Bính Ngọ 2026",
  description: "Vòng quay lì xì Tết Việt Nam 2026 với giao diện lễ hội rực rỡ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
