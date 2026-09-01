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
        borderColor: "var(--border)", 
        background: "color-mix(in srgb, var(--surface) 88%, transparent)" 
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 md:px-6">
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div 
              className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm group-hover:opacity-90 transition-opacity"
              style={{ background: "var(--accent)" }}
            >
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v3" />
                <path d="M6 6v11" />
                <path d="M10 3v18" />
                <path d="M14 8v7" />
                <path d="M18 5v13" />
                <path d="M22 10v4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  ULASA
                </span>
                <span 
                  className="rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                >
                  Clinical
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
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
                    color: active ? "var(--accent-text)" : "var(--text-muted)",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: active ? "1px solid var(--accent)" : "1px solid transparent",
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
              background: "rgba(16, 185, 129, 0.12)", 
              color: "#059669", 
              border: "1px solid rgba(16, 185, 129, 0.3)" 
            }}
            title="Local-First: All analysis is computed in this browser. No audio or transcripts are uploaded."
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-[11px]">100% On-Device / Private</span>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg border text-muted hover:bg-surface-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
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
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
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
                  color: active ? "var(--accent-text)" : "var(--text)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  border: active ? "1px solid var(--accent)" : "1px solid transparent",
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
