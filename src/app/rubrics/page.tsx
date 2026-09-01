"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { RUBRICS, emptyScores, rubricFor, scoreRubric, type RubricId } from "@/core/rubrics";
import { RubricSheet } from "@/components/RubricSheet";
import { EmptyState } from "@/components/EmptyState";

/**
 * Rubrics — a scoring sheet, not a blog.
 *
 * The sheet that matches the sample's own elicitation context leads; the
 * other two stay reachable in the switcher and are shown, unscored, in the
 * side panel with a plain reason rather than being hidden.
 */
export default function RubricsPage() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const rubrics = useStore((s) => s.rubrics);
  const setRubric = useStore((s) => s.setRubric);

  const suggested = sample ? rubricFor(sample.elicitationContext) : "narrative";
  const [rubricId, setRubricId] = useState<RubricId>(suggested);

  useEffect(() => {
    if (sample) setRubricId(rubricFor(sample.elicitationContext));
  }, [sample?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Rubrics</h1>
        <EmptyState
          art="shield"
          heading="No sample is open"
          body="Rubric scores are saved against a sample. Open one from the Workbench first."
          action={
            <Link href="/" className="btn btn-primary no-underline">
              Go to the Workbench
            </Link>
          }
        />
      </div>
    );
  }

  const rubric = RUBRICS[rubricId];
  const scores = rubrics[sample.id]?.rubricId === rubricId ? rubrics[sample.id] : emptyScores(rubricId);
  const others = (Object.keys(RUBRICS) as RubricId[]).filter((id) => id !== rubricId);

  function commit(next: typeof scores) {
    setRubric(sample!.id, next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            Rubrics
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {rubric.description}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-2)" }} role="group" aria-label="Rubric sheet">
          {(Object.values(RUBRICS)).map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={rubricId === r.id}
              onClick={() => setRubricId(r.id)}
              className="min-h-11 rounded-md px-3 text-sm md:min-h-0 md:py-1"
              style={{
                fontWeight: rubricId === r.id ? 600 : 450,
                background: rubricId === r.id ? "var(--surface)" : "transparent",
                color: rubricId === r.id ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {r.label.replace(" scoring", "")}
              {r.id === suggested && <span style={{ color: "var(--accent)" }}> ·</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_300px]">
        <RubricSheet
          rubric={rubric}
          scores={scores}
          onScore={(key, value) => commit({ ...scores, scores: { ...scores.scores, [key]: value } })}
          onNotes={(notes) => commit({ ...scores, notes })}
        />

        <div className="flex flex-col gap-3.5">
          {others.map((id) => {
            const other = RUBRICS[id];
            const otherScores = rubrics[sample.id]?.rubricId === id ? rubrics[sample.id] : emptyScores(id);
            const otherResult = scoreRubric(other, otherScores);
            return (
              <div key={id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
                    {other.label}
                  </span>
                  <span className="num text-[12.5px]" style={{ color: "var(--text-faint)" }}>
                    {otherResult.composite ?? "—"} / {otherResult.maximum}
                  </span>
                </div>
                <ul className="space-y-1 text-[12.5px]" style={{ color: "var(--text-faint)" }}>
                  {other.dimensions.map((d) => (
                    <li key={d.key} className="flex justify-between gap-2">
                      <span className="truncate">{d.label}</span>
                      <span className="num shrink-0">— / 5</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] leading-snug" style={{ color: "var(--text-faint)" }}>
                  Not scored — the rubric follows the elicitation context, and this sample is{" "}
                  {sample.elicitationContext.replace(/_/g, " ")}.
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
