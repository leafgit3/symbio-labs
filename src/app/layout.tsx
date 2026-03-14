import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, Space_Mono } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Symbio Labs",
  description: "Lunar Citadel MVP scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${spaceMono.variable}`}>
        <AppProviders>
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="site-brand">
                Symbio Labs
              </Link>
              <nav className="site-nav">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/agents">Agents</Link>
                <Link href="/feed">Feed</Link>
                <Link href="/memories">Memories</Link>
                <Link href="/history">History</Link>
              </nav>
            </div>
          </header>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
