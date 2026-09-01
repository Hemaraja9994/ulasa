"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Elicitation" },
  { href: "/studio", label: "Studio" },
  { href: "/analyse", label: "Analyse" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/report", label: "Report" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="no-print sticky top-0 z-20 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2.5 md:px-6">
        <Link href="/" className="mr-3 flex items-baseline gap-2 no-underline">
          <span style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.01em", fontSize: "1.05rem" }}>
            ULASA
          </span>
          <span className="hidden sm:inline" style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            language sample analysis
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-0.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1 no-underline"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: active ? 600 : 450,
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  background: active ? "var(--accent-soft)" : "transparent",
                }}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <span className="badge badge-local ml-auto" title="No data leaves this device unless you turn a cloud service on in Settings.">
          Local
        </span>
      </div>
    </header>
  );
}
