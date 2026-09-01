"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { emptyScores, RUBRICS, rubricFor, scoreRubric, type RubricId } from "@/core/rubrics";

export default function Rubrics() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const stored = useStore((s) => (sample ? s.rubrics[sample.id] : undefined));
  const setRubric = useStore((s) => s.setRubric);

  const [rubricId, setRubricId] = useState<RubricId>(
    stored?.rubricId ?? (sample ? rubricFor(sample.elicitationContext) : "narrative"),
  );

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">No sample selected</h1>
        <Link href="/" className="btn btn-primary mt-4 no-underline">Go to the dashboard</Link>
      </div>
    );
  }

  const rubric = RUBRICS[rubricId];
  const scores = stored?.rubricId === rubricId ? stored : emptyScores(rubricId);
  const result = scoreRubric(rubric, scores);

  function setScore(key: string, value: number | null) {
    setRubric(sample!.id, { ...scores, scores: { ...scores.scores, [key]: value } });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Macrostructure rubrics</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {sample.title}
          </p>
        </div>
        <select
          className="select"
          style={{ width: "auto" }}
          value={rubricId}
          onChange={(e) => setRubricId(e.target.value as RubricId)}
        >
          {Object.values(RUBRICS).map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="notice notice-info">
        These dimensions are scored by you, not by the software. Narrative macrostructure cannot be
        extracted reliably from surface text in any of the six languages ULASA supports, and a
        confident automatic score here would be the easiest way to produce a wrong one. Read the
        whole sample first, then score.
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{rubric.description}</p>

      <div className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">Composite</span>
          <span className="text-lg font-semibold tabular-nums">
            {result.composite === null ? "not scored" : `${result.composite} / ${result.maximum}`}
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {result.scored} of {result.total} dimensions scored
          {result.mean !== null && ` · mean ${result.mean.toFixed(1)} of 5`}
          {result.scored > 0 && result.scored < result.total &&
            " · a partial composite is not comparable to a fully scored one; use the mean instead"}
        </p>
      </div>

      <div className="space-y-3">
        {rubric.dimensions.map((dimension) => {
          const value = scores.scores[dimension.key];
          return (
            <section key={dimension.key} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">{dimension.label}</h2>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className="btn"
                      style={{
                        padding: "0.15rem 0.55rem",
                        fontSize: "0.82rem",
                        background: value === n ? "var(--accent)" : undefined,
                        borderColor: value === n ? "var(--accent)" : undefined,
                        color: value === n ? "#fff" : undefined,
                      }}
                      onClick={() => setScore(dimension.key, value === n ? null : n)}
                      aria-pressed={value === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>{dimension.prompt}</p>
              <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2" style={{ color: "var(--text-muted)" }}>
                {([0, 1, 3, 5] as const).map((anchor) => (
                  <div key={anchor}>
                    <dt className="inline font-semibold">{anchor}: </dt>
                    <dd className="inline">{dimension.anchors[anchor]}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Notes on macrostructure</span>
        <textarea
          className="textarea"
          style={{ minHeight: "7rem" }}
          value={scores.notes}
          onChange={(e) => setRubric(sample.id, { ...scores, notes: e.target.value })}
          placeholder="What the scores above do not capture — cultural narrative conventions, the child's engagement with the task, anything you would say to a colleague."
        />
      </label>

      <div className="flex gap-2">
        <Link href="/analyse" className="btn no-underline">Back to measures</Link>
        <Link href="/report" className="btn btn-primary no-underline">Draft the report</Link>
      </div>
    </div>
  );
}
