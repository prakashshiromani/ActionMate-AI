import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#3B82F6",
};

export const metadata: Metadata = {
  title: "ActionMate AI — Don't Just Remind. Resolve.",
  description: "ActionMate is your AI-powered productivity agent. It detects schedule conflicts, drafts emails, blocks calendar slots — all autonomously using Gemini AI, Google Calendar & Gmail.",
  keywords: ["AI productivity", "Gemini AI", "task manager", "Google Calendar", "Gmail automation", "AI agent"],
  authors: [{ name: "ActionMate Team" }],
  openGraph: {
    title: "ActionMate AI — Don't Just Remind. Resolve.",
    description: "AI-powered productivity agent that detects conflicts and takes action — automatically.",
    type: "website",
    locale: "en_US",
    siteName: "ActionMate AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActionMate AI",
    description: "Don't just remind. Resolve. Your AI productivity agent.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
