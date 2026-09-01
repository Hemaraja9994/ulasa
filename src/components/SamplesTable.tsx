"use client";

import { useRouter } from "next/navigation";
import { analysisSet } from "@/core/analyse";
import { LanguageBadge, langRailColor, scriptTextProps } from "@/components/LanguageBadge";
import { timeAgo } from "@/lib/relativeTime";
import type { Sample } from "@/core/types";

/**
 * The case table, and its mobile equivalent.
 *
 * Below md the rows become cards rather than a horizontally scrolling table:
 * a clinician on a phone between sessions is checking which sample is which,
 * not scrubbing across seven columns. Every control on that path is 44px.
 */

/** SALT/SUGAR convention: below this the diversity measures are unstable. */
const MIN_ANALYSIS_SET = 50;

/** Column widths, from the design's `2.4fr .8fr 1.1fr .75fr 1fr .85fr 1fr`. */
const COLS = ["30.4%", "10.1%", "13.9%", "9.5%", "12.7%", "10.8%", "12.6%"];

export function AnalysisSetPill({ setSize }: { setSize: number }) {
  if (setSize === 0) {
    return (
      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
        —
      </span>
    );
  }
  if (setSize < MIN_ANALYSIS_SET) {
    return (
      <span
        className="badge badge-warn num"
        title={`Fewer than ${MIN_ANALYSIS_SET} complete and intelligible utterances. Diversity measures are unstable at this length.`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3l9 17H3z" />
          <path d="M12 9v5M12 17.5v.5" />
        </svg>
        {setSize} SHORT
      </span>
    );
  }
  return (
    <span
      className="num inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent-text)" }}
    >
      {setSize} C&amp;I
    </span>
  );
}

function IconButton({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors md:h-[30px] md:w-[30px] ${
        danger ? "hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]" : "hover:bg-[var(--surface-2)]"
      }`}
      style={{ borderColor: "var(--border)", background: "var(--surface)", color: danger ? "var(--danger)" : "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

const ExportIcon = (
  <svg className="h-4 w-4 md:h-3.5 md:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const DeleteIcon = (
  <svg className="h-4 w-4 md:h-3.5 md:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

/** Matches the real grid, so nothing shifts when the data arrives. */
export function SamplesTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your samples…</span>
      <div className="hidden md:block">
        <div className="grid px-[18px] py-[9px]" style={{ background: "var(--chrome-2)", gridTemplateColumns: COLS.join(" ") }}>
          {["Sample", "Language", "Context", "Utterances", "Analysis set", "Updated", "Actions"].map((h, i) => (
            <div key={h} className={`text-[10.5px] font-semibold uppercase tracking-[0.09em] ${i >= 3 ? "text-right" : ""}`} style={{ color: "var(--chrome-label)" }}>
              {h}
            </div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid items-center gap-2 px-[18px] py-[14px]" style={{ borderTop: "1px solid var(--row-rule)", gridTemplateColumns: COLS.join(" ") }}>
            <div className="space-y-1.5">
              <div className="h-3.5 w-3/4 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-2.5 w-1/2 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j} className="h-3.5 rounded" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-2 p-3 md:hidden">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    </div>
  );
}

export function SamplesTable({
  samples,
  activeSampleId,
  onOpen,
  onExport,
  onDelete,
}: {
  samples: Sample[];
  activeSampleId: string | null;
  onOpen: (sample: Sample) => void;
  onExport: (sample: Sample) => void;
  onDelete: (sample: Sample) => void;
}) {
  const router = useRouter();
  void router;

  return (
    <>
      {/* Desktop table. A real <table> so screen readers announce the columns. */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-left text-sm" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ background: "var(--chrome-2)" }}>
              {[
                { label: "Sample", right: false },
                { label: "Language", right: false },
                { label: "Context", right: false },
                { label: "Utterances", right: true },
                { label: "Analysis set", right: true },
                { label: "Updated", right: true },
                { label: "Actions", right: true },
              ].map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className={`px-3 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.09em] ${h.right ? "text-right" : ""}`}
                  style={{ color: "var(--chrome-label)" }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => {
              const set = analysisSet(sample);
              const isActive = sample.id === activeSampleId;
              const caseCode = sample.caseId !== "unassigned" ? sample.caseId.toUpperCase() : null;

              return (
                <tr
                  key={sample.id}
                  className="row-hover transition-colors"
                  style={{
                    borderTop: "1px solid var(--row-rule)",
                    background: isActive ? "var(--row-hover)" : undefined,
                  }}
                >
                  <td className="py-[11px] pr-3" style={{ borderLeft: `3px solid ${langRailColor(sample.language)}` }}>
                    <div className="pl-[15px]">
                      <button
                        type="button"
                        onClick={() => onOpen(sample)}
                        className="block truncate text-left text-[15px] font-semibold"
                        style={{ color: "var(--text)" }}
                        {...scriptTextProps(sample.language)}
                      >
                        {sample.title}
                      </button>
                      {caseCode && (
                        <span className="mono block text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                          {caseCode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-[11px]">
                    <LanguageBadge lang={sample.language} secondary={sample.secondaryLanguages} />
                  </td>
                  <td className="px-3 py-[11px]">
                    <span className="chip-neutral truncate">{sample.elicitationContext.replace(/_/g, " ")}</span>
                  </td>
                  <td className="num px-3 py-[11px] text-right font-semibold" style={{ color: "var(--text)" }}>
                    {sample.utterances.length}
                  </td>
                  <td className="px-3 py-[11px] text-right">
                    <AnalysisSetPill setSize={set.length} />
                  </td>
                  <td className="px-3 py-[11px] text-right text-xs" style={{ color: "var(--text-muted)" }}>
                    {timeAgo(sample.updatedAt)}
                  </td>
                  <td className="px-3 py-[11px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpen(sample)}
                        className="rounded-[7px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors"
                        style={
                          isActive
                            ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" }
                            : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }
                        }
                      >
                        Open
                      </button>
                      <IconButton title={`Export ${sample.title}`} onClick={() => onExport(sample)}>
                        {ExportIcon}
                      </IconButton>
                      <IconButton title={`Delete ${sample.title}`} danger onClick={() => onDelete(sample)}>
                        {DeleteIcon}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {samples.map((sample) => {
          const set = analysisSet(sample);
          const isActive = sample.id === activeSampleId;
          const caseCode = sample.caseId !== "unassigned" ? sample.caseId.toUpperCase() : null;

          return (
            <div
              key={sample.id}
              className="rounded-lg border p-3.5"
              style={{
                borderColor: "var(--border)",
                borderLeft: `3px solid ${langRailColor(sample.language)}`,
                background: isActive ? "var(--row-hover)" : "var(--surface)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 text-[15px] font-semibold" {...scriptTextProps(sample.language)}>
                  {sample.title}
                </span>
                <LanguageBadge lang={sample.language} secondary={sample.secondaryLanguages} />
              </div>
              <div className="mono mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
                {[caseCode, timeAgo(sample.updatedAt)].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="chip-neutral">{sample.elicitationContext.replace(/_/g, " ")}</span>
                <span className="num text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                  {sample.utterances.length} utt
                </span>
                <AnalysisSetPill setSize={set.length} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(sample)}
                  className="min-h-11 flex-1 rounded-lg border text-sm font-semibold"
                  style={
                    isActive
                      ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" }
                      : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }
                  }
                >
                  Open
                </button>
                <IconButton title={`Export ${sample.title}`} onClick={() => onExport(sample)}>
                  {ExportIcon}
                </IconButton>
                <IconButton title={`Delete ${sample.title}`} danger onClick={() => onDelete(sample)}>
                  {DeleteIcon}
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
