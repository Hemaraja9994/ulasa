"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHydrated, useStore } from "@/store/useStore";

const PRIMARY = [
  { href: "/studio", label: "Studio" },
  { href: "/analyse", label: "Analyse" },
  { href: "/compare", label: "Compare" },
  { href: "/glossary", label: "Glossary" },
  { href: "/settings", label: "Settings" },
];

const MORE = [
  { href: "/", label: "Dashboard" },
  { href: "/protocols", label: "Elicitation protocols" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/report", label: "Report" },
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

  const linkStyle = (active: boolean) => ({
    color: active ? "var(--accent-text)" : "var(--text-muted)",
    background: active ? "var(--accent-soft)" : "transparent",
  });

  return (
    <header
      className="no-print sticky top-0 z-30 border-b backdrop-blur-md"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--accent)" }}>
            <svg className="h-4 w-4" style={{ color: "var(--on-accent)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v4" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>ULASA</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-1 md:flex" aria-label="Primary">
          {PRIMARY.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-[0.9375rem] font-medium no-underline transition-colors"
                style={linkStyle(active)}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[0.9375rem] font-medium"
              style={linkStyle(moreActive)}
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
                className="absolute right-0 mt-2 w-56 rounded-xl border p-1.5 shadow-lg"
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border p-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            onClick={() => setTheme(isLight ? "dark" : "light")}
            aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
            title={isLight ? "Dark theme" : "Light theme (best on projectors)"}
          >
            {hydrated && isLight ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
            )}
          </button>
          <button
            type="button"
            className="rounded-lg border p-2 md:hidden"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          {[...PRIMARY, ...MORE].map((link) => {
            const active = pathname === link.href;
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
    </header>
  );
}
