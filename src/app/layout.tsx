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
          className="no-print mx-auto w-full max-w-6xl px-4 pb-10 pt-6 md:px-6 space-y-2 border-t mt-12"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontSize: "0.82rem" }}
        >
          <p>
            ULASA quantifies language production to support a qualified professional. It does not
            diagnose. Your samples are stored in this browser only — nothing is uploaded.
          </p>
          <p className="font-medium" style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Working concept: Dr. Amoolya G, Assistant Professor in Speech Language Pathology, AIISH, Mysore &bull; Developed by: Mr. Hemaraja Nayaka.S
          </p>
        </footer>
      </body>
    </html>
  );
}
