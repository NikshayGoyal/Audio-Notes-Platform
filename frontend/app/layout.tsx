import type { Metadata } from "next";
import Link from "next/link";
import { AudioLines, GitBranch, Layers3 } from "lucide-react";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Notes",
  description: "Turn recordings into searchable transcripts and useful notes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="ambient ambient-one" aria-hidden="true" />
          <div className="ambient ambient-two" aria-hidden="true" />
          <header className="site-header">
            <Link className="brand" href="/" aria-label="Audio Notes home">
              <span className="brand-mark"><AudioLines size={20} strokeWidth={2.4} /></span>
              <span className="brand-copy"><strong>Audio Notes</strong><small>AI workspace</small></span>
            </Link>
            <nav className="primary-nav" aria-label="Primary navigation">
              <Link href="/"><AudioLines size={16} /> Notes</Link>
              <Link href="/architecture"><Layers3 size={16} /> How it works</Link>
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <span><AudioLines size={15} /> Built for clear thinking, one recording at a time.</span>
            <a href="/architecture"><GitBranch size={15} /> Technical overview</a>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
