import type { Metadata } from "next";
import { Dancing_Script, Geist, Geist_Mono, Long_Cang } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-brand-script",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "block",
});

const chineseScript = Long_Cang({
  variable: "--font-chinese-script",
  subsets: ["latin"],
  weight: "400",
  display: "block",
});

export const metadata: Metadata = {
  title: "Auto Delivery",
  description: "Card-key based automatic delivery system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} ${chineseScript.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
