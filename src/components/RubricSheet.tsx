"use client";

import { useId } from "react";
import { scoreRubric, type Rubric, type RubricScores } from "@/core/rubrics";

/**
 * A scoring sheet, not an article, for any `Rubric` from `rubrics.ts`.
 *
 * The rubric defines anchors at 0, 1, 3 and 5; 2 and 4 are intermediate, so
 * the anchor panel shows the nearest defined score and says so rather than
 * inventing wording the clinical author never wrote.
 */

const SCORES = [0, 1, 2, 3, 4, 5] as const;

function nearestAnchor(anchors: Rubric["dimensions"][number]["anchors"], score: number): { text: string; exact: boolean } {
  if (score === 0 || score === 1 || score === 3 || score === 5) {
    return { text: anchors[score as 0 | 1 | 3 | 5], exact: true };
  }
  // 2 sits between 1 and 3; 4 sits between 3 and 5.
  const nearest = score === 2 ? 3 : 5;
  return { text: anchors[nearest as 1 | 3 | 5], exact: false };
}

export function RubricSheet({
  rubric,
  scores,
  onScore,
  onNotes,
}: {
  rubric: Rubric;
  scores: RubricScores;
  onScore: (dimensionKey: string, score: number | null) => void;
  onNotes: (notes: string) => void;
}) {
  const notesId = useId();
  const result = scoreRubric(rubric, scores);

  function moveFocus(row: number, delta: number) {
    const cells = document.querySelectorAll<HTMLButtonElement>(`[data-rubric-row="${row}"]`);
    const list = Array.from(cells);
    const current = list.findIndex((el) => el === document.activeElement);
    const next = list[Math.min(list.length - 1, Math.max(0, current + delta))];
    next?.focus();
  }

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div
        className="grid items-center gap-2 px-4 py-2.5"
        style={{ background: "var(--chrome-2)", gridTemplateColumns: "1.5fr 2.4fr repeat(6, 40px)" }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--chrome-label)" }}>
          Dimension
        </div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--chrome-label)" }}>
          Anchor at the selected score
        </div>
        {SCORES.map((s) => (
          <div key={s} className="num text-center text-[10.5px] font-semibold" style={{ color: "var(--chrome-label)" }}>
            {s}
          </div>
        ))}
      </div>

      {rubric.dimensions.map((dim, row) => {
        const score = scores.scores[dim.key];
        const anchor = score !== null && score !== undefined ? nearestAnchor(dim.anchors, score) : null;
        return (
          <div
            key={dim.key}
            className="grid items-center gap-2 px-4 py-[11px]"
            style={{ borderTop: "1px solid var(--row-rule)", gridTemplateColumns: "1.5fr 2.4fr repeat(6, 40px)" }}
          >
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }} title={dim.prompt}>
                {dim.label}
              </div>
              <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "var(--text-faint)" }}>
                {dim.prompt}
              </div>
            </div>
            <div className="text-[12.5px] leading-snug" style={{ color: "var(--text-muted)" }}>
              {anchor ? (
                <>
                  {anchor.text}
                  {!anchor.exact && (
                    <span className="ml-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                      (intermediate)
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--text-faint)" }}>Not yet scored</span>
              )}
            </div>
            {SCORES.map((s) => {
              const selected = score === s;
              return (
                <button
                  key={s}
                  type="button"
                  data-rubric-row={row}
                  aria-pressed={selected}
                  aria-label={`${dim.label}: score ${s}`}
                  onClick={() => onScore(dim.key, selected ? null : s)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") { e.preventDefault(); moveFocus(row, 1); }
                    if (e.key === "ArrowLeft") { e.preventDefault(); moveFocus(row, -1); }
                  }}
                  className="mx-auto flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-[12px] font-semibold"
                  style={
                    selected
                      ? { background: "var(--accent)", color: "#FFFFFF" }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-faint)" }
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Composite row */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
        style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Composite
          </div>
          <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {result.scored} of {result.total} dimensions scored
            {result.mean !== null ? ` · mean ${result.mean.toFixed(1)}` : ""} · reported with the profile, never alone
          </div>
        </div>
        <div className="num text-[22px] font-semibold" style={{ color: "var(--text)" }}>
          {result.composite ?? "—"} / {result.maximum}
        </div>
      </div>

      <div className="p-4">
        <label htmlFor={notesId} className="meta-label mb-1.5 block">
          Clinician note
        </label>
        <textarea
          id={notesId}
          className="textarea"
          style={{ minHeight: "5rem" }}
          value={scores.notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Anything about the sample that bears on these scores…"
        />
      </div>
    </div>
  );
}
