import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { createClient } from '@/utils/supabase/server';
import { ThemeProvider } from "./providers/theme-provider";
import React from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeInsightAI | AIでFXトレード分析・改善",
  description: "XM Tradingの履歴をアップロードし、AIがパーソナライズされた分析と改善アドバイスを提供。トレードを次のレベルへ。",
  keywords: ["FXトレード分析", "AIトレード", "XM Trading", "トレード改善", "FXツール", "トレード履歴"],
  authors: [{ name: "Kazuhiro Kurokawa", url: "https://yourwebsite.com" }], // TODO: ここに自分のサイトを入れる
  openGraph: {
    title: "TradeInsightAI | AIでFXトレード分析・改善",
    description: "AIがあなたのFXトレード履歴を分析し、具体的な改善ポイントをアドバイス。利益向上をサポートします。",
    url: "https://tradeinsightai.com",
    siteName: "TradeInsightAI",
    images: [
      {
        url: "https://tradeinsightai.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "TradeInsightAI",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeInsightAI | AIでFXトレード分析・改善",
    description: "AIがあなたのFXトレード履歴を分析し、具体的な改善ポイントをアドバイス。利益向上をサポートします。",
    creator: "@yourtwitterhandle",
    images: ["https://tradeinsightai.com/twitter-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isAuthenticated = !!session;

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider defaultTheme="system">
          <div className="flex">
            {isAuthenticated && <Sidebar />}
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
