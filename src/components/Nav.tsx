"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="no-print sticky top-0 z-30 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--chrome-border)",
        background: "color-mix(in srgb, var(--chrome-bg) 94%, transparent)",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 md:px-6">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm group-hover:opacity-90 transition-opacity">
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect width="48" height="48" rx="11" fill="var(--chrome-accent)" />
                <path
                  d="M13 12h-4v24h4M35 12h4v24h-4"
                  stroke="#0B1215"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M17 18h14M17 30h9" stroke="#0B1215" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight" style={{ color: "var(--chrome-text)" }}>
                  ULASA
                </span>
                <span
                  className="rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "var(--chrome-accent-soft)", color: "var(--chrome-accent-text)" }}
                >
                  Clinical
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] leading-tight" style={{ color: "var(--chrome-text-muted)" }}>
                Language Assessment & Sample Analysis
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all no-underline"
                  style={{
                    color: active ? "var(--chrome-accent-text)" : "var(--chrome-text-muted)",
                    background: active ? "var(--chrome-accent-soft)" : "transparent",
                    border: active ? "1px solid rgba(43, 192, 172, 0.5)" : "1px solid transparent",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status & mobile hamburger */}
        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: "var(--chrome-accent-soft)",
              color: "var(--chrome-accent-text)",
              border: "1px solid rgba(43, 192, 172, 0.5)",
            }}
            title="Local-First: All analysis is computed in this browser. No audio or transcripts are uploaded."
          >
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ background: "var(--chrome-accent)" }}
            ></span>
            <span className="font-semibold text-[11px]">100% On-Device / Private</span>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg border"
            style={{ borderColor: "var(--chrome-border)", color: "var(--chrome-text)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Collapsible Drawer */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{ borderColor: "var(--chrome-border)", background: "var(--chrome-bg)" }}
        >
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors no-underline"
                style={{
                  color: active ? "var(--chrome-accent-text)" : "var(--chrome-text)",
                  background: active ? "var(--chrome-accent-soft)" : "transparent",
                  border: active ? "1px solid rgba(43, 192, 172, 0.5)" : "1px solid transparent",
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
