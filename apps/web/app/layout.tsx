import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "../components/theme-provider";
import { ThemeToggle } from "../components/theme-toggle";
import { ScanSearch } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SEO & GEO Analyzer Pro | Legacy AI / Floyd's Labs",
  description: "Enterprise-grade SEO and GEO analysis platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-background text-foreground min-h-screen flex flex-col transition-colors duration-300`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
              {/* Brand */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <ScanSearch className="h-4 w-4" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-bold text-sm tracking-tight truncate">
                    SEO &amp; GEO Analyzer Pro
                  </span>
                  <span className="hidden sm:inline-block text-xs text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted">
                    Enterprise
                  </span>
                </div>
              </div>

              {/* Nav + Actions */}
              <div className="flex items-center gap-2">
                <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                  <a
                    href="https://www.legacyai.space"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Legacy AI
                  </a>
                  <a
                    href="https://www.floydslabs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Floyd&apos;s Labs
                  </a>
                </nav>
                <div className="w-px h-5 bg-border hidden md:block" />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* ── Main ───────────────────────────────────────────────── */}
          <main className="flex-grow w-full">{children}</main>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <footer className="border-t border-border/60 bg-muted/30 py-4">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
              <span>
                SEO &amp; GEO Analyzer Pro &mdash; &copy; 2026 Legacy AI / Floyd&apos;s Labs
              </span>
              <span className="hidden sm:block">
                Enterprise SEO &amp; Generative Engine Optimization Platform
              </span>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
