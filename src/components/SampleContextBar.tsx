"use client";

import Link from "next/link";
import { useStore, useActiveSample, useHydrated } from "@/store/useStore";
import { analysisSet, targetUtterances } from "@/core/analyse";
import { LanguageBadge, scriptTextProps } from "@/components/LanguageBadge";
import type { CaseRecord } from "@/core/types";

/**
 * The persistent working context.
 *
 * The nav knew the route but never the sample, so a clinician moving Studio →
 * Analyse → Report had no on-screen proof of which case was open. This row
 * carries that proof on every route. With no sample open it collapses
 * entirely rather than showing empty scaffolding.
 */

/** SALT-style age notation: 6 years 4 months reads `6;04`. */
function formatAge(record: CaseRecord | undefined): string | null {
  if (!record || record.ageYears === undefined) return null;
  const months = record.ageMonths ?? 0;
  return `${record.ageYears};${String(months).padStart(2, "0")}`;
}

function savedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SampleContextBar() {
  const sample = useActiveSample();
  const cases = useStore((s) => s.cases);
  const hydrated = useHydrated();

  // Before hydration the store is still the empty default, so rendering here
  // would flash a bar that then disappears. Collapse until we actually know.
  if (!hydrated || !sample) return null;

  const set = analysisSet(sample);
  const all = targetUtterances(sample);
  const caseRecord = cases.find((c) => c.id === sample.caseId);
  const age = formatAge(caseRecord);
  const caseCode = sample.caseId !== "unassigned" ? sample.caseId.toUpperCase() : null;
  const saved = savedAt(sample.updatedAt);

  return (
    <div
      className="no-print sticky top-[57px] z-20 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Desktop */}
      <div className="mx-auto hidden w-full max-w-6xl items-center justify-between gap-4 px-4 py-2 md:flex md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="meta-label shrink-0">Active sample</span>
          <LanguageBadge lang={sample.language} secondary={sample.secondaryLanguages} />
          <span className="truncate font-semibold" style={{ fontSize: "15px" }} {...scriptTextProps(sample.language)}>
            {sample.title}
          </span>
          {(caseCode || age) && (
            <span className="mono shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
              {[caseCode, age].filter(Boolean).join(" · ")}
            </span>
          )}
          <span className="h-[15px] w-px shrink-0" style={{ background: "var(--border)" }} />
          <span className="num shrink-0 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
            {all.length} utterances · {set.length} complete &amp; intelligible
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saved && (
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              Saved in this browser · {saved}
            </span>
          )}
          <Link
            href="/"
            className="rounded-[7px] border px-[11px] py-[5px] text-[12.5px] font-medium no-underline"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--chip-neutral-text)" }}
          >
            Switch sample
          </Link>
        </div>
      </div>

      {/* Mobile: one 8px/14px strip — badge, truncated title, counts right */}
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3.5 py-2 md:hidden">
        <LanguageBadge lang={sample.language} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold" {...scriptTextProps(sample.language)}>
          {sample.title}
        </span>
        <span className="num shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
          {all.length} · {set.length} C&amp;I
        </span>
      </div>
    </div>
  );
}
