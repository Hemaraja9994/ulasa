"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSample, useHydrated } from "@/store/useStore";
import { analysisSet } from "@/core/analyse";
import { getPack } from "@/nlp/registry";
import { contextLabel, formatDuration } from "@/lib/format";

/** The clinical workflow for one sample, in order. */
export const STEPS = [
  { href: "/studio", label: "Transcribe" },
  { href: "/code", label: "Code" },
  { href: "/analyse", label: "Analyse" },
  { href: "/compare", label: "Compare" },
  { href: "/report", label: "Report" },
];

export const SAMPLE_ROUTES = STEPS.map((s) => s.href);

/**
 * The sample bar under the header: which sample is open, where it is in the
 * Transcribe → Code → Analyse → Compare → Report workflow, and the next step.
 */
export function SampleStepper() {
  const pathname = usePathname();
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const current = STEPS.findIndex((s) => s.href === pathname);
  const next = current >= 0 && current < STEPS.length - 1 ? STEPS[current + 1] : null;

  let title = "No sample open";
  let meta = "Choose a sample on Home or in Clients & sessions";
  if (hydrated && sample) {
    const pack = getPack(sample.language);
    const n = analysisSet(sample).length;
    title = sample.title;
    meta = [
      `${pack.nativeName} · ${pack.script} script`,
      contextLabel(sample.elicitationContext).toLowerCase(),
      formatDuration(sample.elapsedSeconds),
      `${n} utterance${n === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return (
    <div className="border-t" style={{ borderColor: "var(--surface-2)", background: "var(--surface)" }}>
      <div className="mx-auto flex min-h-14 w-full max-w-[1360px] items-center justify-between gap-5 px-4 py-2 md:px-6">
        <div className="hidden min-w-0 flex-col lg:flex" style={{ lineHeight: 1.25 }}>
          <span className="truncate font-semibold" style={{ fontSize: 15 }}>{title}</span>
          <span className="truncate" style={{ fontSize: 12, color: "var(--text-muted)" }}>{meta}</span>
        </div>

        <ol className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1" style={{ fontSize: 13 }} aria-label="Sample workflow">
          {STEPS.map((step, i) => {
            const active = i === current;
            const done = i < current;
            return (
              <li key={step.href} className="flex-none">
                <Link
                  href={step.href}
                  className="flex items-center gap-[7px] whitespace-nowrap rounded-full px-3 py-1.5 no-underline transition-colors"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent-text)" : "var(--text-muted)",
                    fontWeight: active ? 600 : 500,
                  }}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className="flex h-[19px] w-[19px] items-center justify-center rounded-full"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: active ? "var(--accent)" : done ? "var(--accent-soft)" : "var(--surface)",
                      color: active ? "var(--on-accent)" : done ? "var(--accent-text)" : "var(--text-muted)",
                      border: `1px solid ${active ? "var(--accent)" : done ? "var(--accent-soft)" : "var(--border-strong)"}`,
                    }}
                    aria-hidden="true"
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ol>

        {next ? (
          <Link href={next.href} className="btn btn-primary flex-none no-underline" style={{ fontSize: 14, padding: "8px 16px" }}>
            Next: {next.label}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary flex-none" style={{ fontSize: 14, padding: "8px 16px" }} onClick={() => window.print()}>
            Save as PDF
          </button>
        )}
      </div>
    </div>
  );
}
