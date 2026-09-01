"use client";

/**
 * Three empty states, one component: no samples, nothing to analyse, no
 * provider armed. Each is an inline SVG, a heading, a line of explanation and
 * exactly one action — never a bare bordered box, which is what the dashboard
 * used to show and which reads as a broken build.
 */

type Art = "brackets" | "bars" | "shield";

function Illustration({ art }: { art: Art }) {
  const stroke = "var(--text-faint)";
  if (art === "bars") {
    // Three descending bars on a rule: a transcript with nothing measured yet.
    return (
      <svg width="72" height="48" viewBox="0 0 72 48" fill="none" aria-hidden="true">
        <path d="M8 40h56" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M18 40V16M34 40V24M50 40V30" stroke={stroke} strokeWidth="4" strokeLinecap="round" opacity=".7" />
      </svg>
    );
  }
  if (art === "shield") {
    return (
      <svg width="48" height="52" viewBox="0 0 48 52" fill="none" aria-hidden="true">
        <path d="M24 4l17 7v13c0 11-8.5 16-17 19-8.5-3-17-8-17-19V11l17-7z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M17 26l5 5 10-10" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Empty bracket pair over a dashed baseline: a transcript with no lines.
  return (
    <svg width="76" height="48" viewBox="0 0 76 48" fill="none" aria-hidden="true">
      <path d="M26 10h-8v28h8M50 10h8v28h-8" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 24h16" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 6" />
    </svg>
  );
}

export function EmptyState({
  art = "brackets",
  heading,
  body,
  action,
}: {
  art?: Art;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
      style={{ borderColor: "var(--border-strong)", background: "var(--surface-2)" }}
    >
      <Illustration art={art} />
      <div className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
        {heading}
      </div>
      <p className="max-w-md text-[13px]" style={{ color: "var(--text-muted)" }}>
        {body}
      </p>
      {action}
    </div>
  );
}
