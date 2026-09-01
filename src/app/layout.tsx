import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SampleContextBar } from "@/components/SampleContextBar";
import { ThemeScript } from "@/components/ThemeScript";

/*
 * IBM Plex carries the UI; Plex Mono carries codes, case IDs, timecodes, file
 * names and measure keys. Self-hosted by next/font, so no third-party request
 * is made at runtime — the privacy claim has to hold for fonts too.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ULASA — Universal Language Assessment and Sample Analysis",
  description:
    "Clinician-grade language sample analysis for English, Hindi, Kannada, Tamil, Telugu and Malayalam. Runs entirely in your browser: no account, no upload, no licence fee.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <ThemeScript />
        <Nav />
        <SampleContextBar />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
        <footer
          className="no-print mx-auto w-full max-w-6xl px-4 pb-10 pt-6 md:px-6 border-t mt-12 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-8"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontSize: "12.5px" }}
        >
          <p className="md:max-w-2xl">
            ULASA quantifies language production to support a qualified professional. It does not
            diagnose. Your samples are stored in this browser only — nothing is uploaded.
          </p>
          <p className="md:text-right md:shrink-0">
            Working concept: Dr. Amoolya G, Assistant Professor in Speech Language Pathology, AIISH, Mysore
            <br className="hidden md:inline" />
            <span className="md:hidden"> &bull; </span>
            Developed by: Mr. Hemaraja Nayaka.S
          </p>
        </footer>
      </body>
    </html>
  );
}
