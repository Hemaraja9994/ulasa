"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PrivacyChip } from "@/components/PrivacyChip";
import { useStore } from "@/store/useStore";

/**
 * Row one of the persistent chrome.
 *
 * Seven destinations, in the order of the clinical path: Workbench →
 * Elicitation → Studio → Analyse → Report, with Rubrics and Settings off it.
 * The bar is graphite in both themes — it is the instrument's frame, not a
 * themed surface. Below md it collapses to a drawer, but the mark and the
 * privacy chip never collapse: where the computation is happening is not a
 * detail you have to open a menu to discover.
 */

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/elicitation", label: "Elicitation" },
  { href: "/studio", label: "Studio" },
  { href: "/analyse", label: "Analyse" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/report", label: "Report" },
  { href: "/settings", label: "Settings" },
];

/** Transcription brackets around three utterances of decreasing length. */
function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="var(--signal, #2BC0AC)" />
      <path d="M13 12h-4v24h4M35 12h4v24h-4" stroke="#0B1215" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17h14" stroke="#0B1215" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 24h9" stroke="#0B1215" strokeWidth="3" strokeLinecap="round" opacity=".75" />
      <path d="M17 31h12" stroke="#0B1215" strokeWidth="3" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function cycle() {
    // Light → Dark → System, the same three the Settings screen offers.
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
  }

  const label = !mounted
    ? "Toggle theme"
    : `Theme: ${theme}. Switch to ${theme === "light" ? "dark" : theme === "dark" ? "system" : "light"}.`;

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
      style={{ borderColor: "#2A343C", background: "#1B2329" }}
      aria-label={label}
      title={label}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8B4C0" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
      </svg>
    </button>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // `/protocols` still resolves (it redirects), so keep its nav item lit.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/elicitation" && pathname.startsWith("/protocols"));

  return (
    <header className="no-print sticky top-0 z-30" style={{ background: "var(--chrome)" }}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
            <Mark />
            <span className="flex flex-col">
              <span className="text-[15.5px] font-bold leading-tight tracking-tight" style={{ color: "var(--chrome-ink)" }}>
                ULASA
              </span>
              <span className="hidden text-[10.5px] leading-tight sm:inline" style={{ color: "var(--chrome-muted)" }}>
                Language Assessment &amp; Sample Analysis
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-[3px] md:flex" aria-label="Primary">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold no-underline transition-colors"
                  style={{
                    color: active ? "#6FE0CE" : "var(--chrome-muted)",
                    background: active ? "rgba(43,192,172,.16)" : "transparent",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <PrivacyChip onChrome />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border md:hidden"
            style={{ borderColor: "#2A343C", background: "#1B2329", color: "var(--chrome-ink)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="space-y-1 border-t px-4 py-3 md:hidden"
          style={{ borderColor: "#2A343C", background: "var(--chrome)" }}
          aria-label="Primary"
        >
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium no-underline"
                style={{
                  color: active ? "#6FE0CE" : "var(--chrome-ink)",
                  background: active ? "rgba(43,192,172,.16)" : "transparent",
                }}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
