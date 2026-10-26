"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHydrated, useStore } from "@/store/useStore";
import { SAMPLE_ROUTES, SampleStepper } from "@/components/SampleStepper";

/**
 * Primary navigation. "Studio" stays lit on Studio and Code, "Analyse" on
 * Analyse, Compare and Report, so the clinician always sees which half of the
 * workflow they are in. Reference pages live under "More".
 */
const PRIMARY = [
  { href: "/", label: "Home", match: ["/"] },
  { href: "/clients", label: "Clients & sessions", match: ["/clients"] },
  { href: "/studio", label: "Studio", match: ["/studio", "/code"] },
  { href: "/analyse", label: "Analyse", match: ["/analyse", "/compare", "/report"] },
];

const MORE = [
  { href: "/glossary", label: "Glossary" },
  { href: "/protocols", label: "Elicitation protocols" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const hydrated = useHydrated();

  // Apply the saved appearance on every page, not only on /settings.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [moreOpen]);

  // "system" currently renders the dark palette, so treat it as dark here.
  const isLight = theme === "light";
  const moreActive = MORE.some((l) => l.href === pathname);
  const inSample = SAMPLE_ROUTES.includes(pathname);

  const linkStyle = (active: boolean) => ({
    color: active ? "var(--accent-text)" : "var(--text-muted)",
    background: active ? "var(--accent-soft)" : "transparent",
  });

  return (
    <header
      className="no-print sticky top-0 z-30 border-b"
      style={{ borderColor: "var(--border)", background: "var(--header-bg)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      <div className="mx-auto flex h-[60px] w-full max-w-[1360px] items-center justify-between gap-6 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="ULASA home">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ background: "var(--accent)" }}>
              <svg className="h-4 w-4" style={{ color: "var(--on-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v4" />
              </svg>
            </span>
            <span className="font-bold" style={{ fontSize: 17, letterSpacing: "-0.01em", color: "var(--text)" }}>ULASA</span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
            {PRIMARY.map((link) => {
              const active = link.match.includes(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap rounded-lg px-3 py-[7px] font-medium no-underline transition-colors"
                  style={{ ...linkStyle(active), fontSize: 14.5 }}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-[7px] font-medium"
                style={{ ...linkStyle(moreActive), fontSize: 14.5 }}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
              >
                More
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute left-0 mt-2 w-56 rounded-xl border p-1.5 shadow-lg"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  {MORE.map((link) => (
                    <Link
                      key={link.href}
                      role="menuitem"
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-[0.9375rem] no-underline"
                      style={{ ...linkStyle(pathname === link.href), color: pathname === link.href ? "var(--accent-text)" : "var(--text)" }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="pill pill-privacy" title="Transcripts, audio and reports stay in this browser. Nothing is uploaded.">
            <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--success)" }} aria-hidden="true" />
            <span className="hidden sm:inline">On this device · nothing uploaded</span>
            <span className="sm:hidden">On device</span>
          </span>
          <button
            type="button"
            className="rounded-lg border p-1.5"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            onClick={() => setTheme(isLight ? "dark" : "light")}
            aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
            title={isLight ? "Dark theme" : "Light theme (best on projectors)"}
          >
            {hydrated && isLight ? (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
            )}
          </button>
          <button
            type="button"
            className="rounded-lg border p-1.5 md:hidden"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t px-4 py-3 md:hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Mobile">
          {[...PRIMARY, ...MORE.map((l) => ({ ...l, match: [l.href] }))].map((link) => {
            const active = link.match.includes(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-base font-medium no-underline"
                style={{ ...linkStyle(active), color: active ? "var(--accent-text)" : "var(--text)" }}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      {inSample && <SampleStepper />}
    </header>
  );
}
