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
      className="no-print sticky top-0 z-20 border-b backdrop-blur-md"
      style={{ 
        borderColor: "var(--border)", 
        background: "rgba(9, 10, 13, 0.82)" 
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
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
                <span className="text-base font-black tracking-tight" style={{ color: "var(--text)" }}>
                  ULASA
                </span>
                <span className="rounded bg-red-950/80 px-1 py-0.2 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-800/50">
                  v0.1
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] leading-none" style={{ color: "var(--text-muted)" }}>
                Language Assessment & Sample Analysis
              </span>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all no-underline"
                  style={{
                    color: active ? "#ffffff" : "var(--text-muted)",
                    background: active ? "linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(185, 28, 28, 0.28))" : "transparent",
                    border: active ? "1px solid rgba(239, 68, 68, 0.45)" : "1px solid transparent",
                    boxShadow: active ? "0 0 12px rgba(239, 68, 68, 0.2)" : "none",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="badge badge-local flex items-center gap-1.5 text-[11px]" 
            title="Local-first: All analysis and data remain private in this browser."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Local First
          </span>
        </div>
      </div>
    </header>
  );
}
