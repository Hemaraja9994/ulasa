import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/600.css";
import "@fontsource/noto-sans-kannada/400.css";
import "@fontsource/noto-sans-kannada/600.css";
import "@fontsource/noto-sans-tamil/400.css";
import "@fontsource/noto-sans-tamil/600.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-telugu/600.css";
import "@fontsource/noto-sans-malayalam/400.css";
import "@fontsource/noto-sans-malayalam/600.css";
import "./globals.css";
import { Nav } from "@/components/Nav";

// Fonts are bundled from npm (@fontsource) and served from the static export.
// Each file is split by unicode-range, so a browser downloads only the scripts
// a page actually shows, and the app makes no request to a font CDN.

export const metadata: Metadata = {
  title: "ULASA — Universal Language Assessment and Sample Analysis",
  description:
    "Clinician-grade language sample analysis for English, Hindi, Kannada, Tamil, Telugu and Malayalam. Runs entirely in your browser: no account, no upload, no licence fee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-12 pt-7 md:px-6">{children}</main>
        <footer className="no-print border-t" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div
            className="mx-auto flex w-full max-w-[1360px] flex-col justify-between gap-2 px-4 py-[18px] sm:flex-row md:px-6"
            style={{ fontSize: "12.5px", color: "var(--text-muted)" }}
          >
            <span>Working concept: Dr. Amoolya G, AIISH Mysuru · Development: Mr. Hemaraja Nayaka.S</span>
            <span>Apache-2.0 · Does not diagnose</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
