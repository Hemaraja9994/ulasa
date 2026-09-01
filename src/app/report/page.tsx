"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { draftPerformanceReport, pickExemplars } from "@/reports/interpret";
import { exportDocx, exportPdf } from "@/reports/export";
import { getPack } from "@/nlp/registry";
import { RUBRICS, scoreRubric } from "@/core/rubrics";

export default function Report() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const rubric = useStore((s) => (sample ? s.rubrics[sample.id] : undefined));
  const drafts = useStore((s) => s.reportDrafts);
  const setReportDraft = useStore((s) => s.setReportDraft);
  const log = useStore((s) => s.log);
  const [editing, setEditing] = useState(false);

  const analysis = useMemo(() => (sample ? analyseSample(sample) : null), [sample]);

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!sample || !analysis) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">No sample selected</h1>
        <Link href="/" className="btn btn-primary mt-4 no-underline">Go to the dashboard</Link>
      </div>
    );
  }

  const pack = getPack(sample.language);
  const exemplars = pickExemplars(sample);
  const text = drafts[sample.id] ?? "";

  function generate() {
    const generated = draftPerformanceReport(sample!, analysis!, rubric ?? null);
    setReportDraft(sample!.id, generated);
    setEditing(true);
    log("draft_report", `Drafted a performance report for "${sample!.title}" from the computed measures.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Performance report</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {sample.title} · {pack.name}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button className="btn" onClick={generate}>
            {text ? "Regenerate draft" : "Draft from the measures"}
          </button>
          <button className="btn" onClick={() => setEditing((v) => !v)} disabled={!text}>
            {editing ? "Preview" : "Edit"}
          </button>
          <button className="btn" onClick={() => exportPdf()} disabled={!text}>
            PDF
          </button>
          <button
            className="btn btn-primary"
            disabled={!text}
            onClick={() => {
              void exportDocx(sample, analysis, {
                rubric: rubric ?? null,
                narrative: text,
                exemplars: exemplars.map((e) => ({ text: e.text, gloss: e.gloss })),
              });
              log("export", `Exported the performance report for "${sample.title}" as DOCX.`);
            }}
          >
            DOCX
          </button>
        </div>
      </div>

      <div className="notice notice-warn no-print">
        The draft below is template composition over the numbers on the Analyse page — deterministic,
        local, and traceable. No language model is involved and nothing is sent anywhere. It is still
        a draft: a fluent paragraph is exactly the kind of thing that gets pasted into a clinical
        record unread. Edit every sentence before it goes into a file.
      </div>

      {!text ? (
        <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }}>
          <p>No draft yet.</p>
          <button className="btn btn-primary mt-3" onClick={generate}>
            Draft from the measures
          </button>
        </div>
      ) : editing ? (
        <textarea
          className="textarea"
          style={{ minHeight: "34rem", lineHeight: 1.75 }}
          value={text}
          onChange={(e) => setReportDraft(sample.id, e.target.value)}
          aria-label="Performance report draft"
        />
      ) : (
        <article className="card space-y-3 p-6" style={{ lineHeight: 1.75 }}>
          <header className="mb-4 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-lg font-semibold">{sample.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {pack.name} · {sample.elicitationContext.replace(/_/g, " ")} ·{" "}
              {analysis.analysisSetSize} complete and intelligible verbal utterances
            </p>
          </header>

          {text.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}

          {exemplars.length > 0 && (
            <section className="pt-2">
              <h3 className="text-sm font-semibold">Exemplar utterances</h3>
              <ul className="mt-2 space-y-2">
                {exemplars.map((ex, i) => (
                  <li key={i}>
                    <p className={pack.script === "Latin" ? "" : "indic"}>{ex.text}</p>
                    {ex.gloss && (
                      <p className="text-sm" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        gloss: {ex.gloss}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rubric && (() => {
            const def = RUBRICS[rubric.rubricId];
            const result = scoreRubric(def, rubric);
            if (result.composite === null) return null;
            return (
              <section className="pt-2">
                <h3 className="text-sm font-semibold">{def.label}</h3>
                <p className="text-sm">
                  Composite {result.composite} of {result.maximum} across {result.scored} scored
                  dimensions.
                </p>
                {rubric.notes && <p className="text-sm">{rubric.notes}</p>}
              </section>
            );
          })()}

          <footer className="border-t pt-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            ULASA does not diagnose. It quantifies language production to support a qualified
            professional&apos;s judgement. {pack.normativeNotes}
          </footer>
        </article>
      )}
    </div>
  );
}
