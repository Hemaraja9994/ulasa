import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "ULASA — Universal Language Assessment and Sample Analysis",
  description:
    "Clinician-grade language sample analysis for English, Hindi, Kannada, Tamil, Telugu and Malayalam. Runs entirely in your browser: no account, no upload, no licence fee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
        <footer
          className="no-print mx-auto w-full max-w-6xl px-4 pb-10 pt-4 md:px-6"
          style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}
        >
          <p>
            ULASA quantifies language production to support a qualified professional. It does not
            diagnose. Your samples are stored in this browser only — nothing is uploaded.
          </p>
        </footer>
      </body>
    </html>
  );
}
