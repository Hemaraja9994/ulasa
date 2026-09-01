"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { getPack } from "@/nlp/registry";
import {
  exportChat,
  exportDocx,
  exportMeasuresCsv,
  exportPdf,
  exportSalt,
  exportUlasaJson,
  exportUtterancesCsv,
} from "@/reports/export";
import { pickExemplars } from "@/reports/interpret";
import type { MeasureValue } from "@/core/types";

export default function Analyse() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const rubrics = useStore((s) => s.rubrics);
  const reportDrafts = useStore((s) => s.reportDrafts);
  const log = useStore((s) => s.log);
  const [exportNotes, setExportNotes] = useState<string[]>([]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Standard Measures</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {sample.title} · {pack.name} · {analysis.analysisSetSize} complete and intelligible
            verbal utterances
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href="/studio" className="btn no-underline">Back to Studio</Link>
          <Link href="/report" className="btn btn-primary no-underline">Draft the report</Link>
        </div>
      </div>

      {/* --- cautions ------------------------------------------------------ */}
      {analysis.warnings.length > 0 && (
        <section className="notice notice-warn">
          <strong>Read before interpreting</strong>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* --- measures ------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.groups.map((group) => (
          <section key={group.id} className="card overflow-hidden">
            <h2
              className="border-b px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              {group.label}
            </h2>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {group.measures.map((measure) => (
                <MeasureRow key={measure.key} measure={measure} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* --- exemplars ----------------------------------------------------- */}
      {exemplars.length > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Exemplar utterances</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Shown in the original script. A number is easier to argue with when the utterance behind
            it is on the page.
          </p>
          <ul className="mt-3 space-y-2.5">
            {exemplars.map((ex, i) => (
              <li key={i}>
                <p className={pack.script === "Latin" ? "" : "indic"}>{ex.text}</p>
                {ex.gloss && (
                  <p className="text-sm" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    gloss: {ex.gloss}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ex.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- exports ------------------------------------------------------- */}
      <section className="card no-print p-4">
        <h2 className="text-sm font-semibold">Export</h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          Every export is generated in this browser and saved to your machine. Nothing is uploaded.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => exportPdf()}>
            PDF (via print)
          </button>
          <button
            className="btn"
            onClick={() => {
              void exportDocx(sample, analysis, {
                rubric: rubrics[sample.id] ?? null,
                narrative: reportDrafts[sample.id],
                exemplars: exemplars.map((e) => ({ text: e.text, gloss: e.gloss })),
              });
              log("export", `Exported a DOCX report for "${sample.title}".`);
            }}
          >
            DOCX report
          </button>
          <button className="btn" onClick={() => exportMeasuresCsv(sample, analysis)}>
            Measures CSV
          </button>
          <button className="btn" onClick={() => exportUtterancesCsv(sample)}>
            Utterances CSV
          </button>
          <button className="btn" onClick={() => setExportNotes(exportSalt(sample))}>
            SALT-style text
          </button>
          <button className="btn" onClick={() => setExportNotes(exportChat(sample))}>
            CHAT (.cha)
          </button>
          <button className="btn" onClick={() => exportUlasaJson(sample, analysis)}>
            ULASA JSON
          </button>
        </div>
        {exportNotes.length > 0 && (
          <div className="notice notice-warn mt-3">
            <strong>What that format could not carry</strong>
            <ul className="mt-1 list-disc pl-5">
              {exportNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          PDF is produced through your browser&apos;s print dialog rather than a JavaScript PDF
          library. That is deliberate: it is the only way to get Devanagari conjuncts, Tamil grantha
          letters and Malayalam chillu characters shaped correctly without embedding a font per
          script. Choose &ldquo;Save as PDF&rdquo; as the destination.
        </p>
      </section>
    </div>
  );
}

function MeasureRow({ measure }: { measure: MeasureValue }) {
  const unavailable = measure.value === null;
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm" style={{ color: unavailable ? "var(--text-muted)" : "var(--text)" }}>
          {measure.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {measure.status === "experimental" && (
            <span className="badge badge-experimental">experimental</span>
          )}
          <span
            className="tabular-nums"
            style={{ fontWeight: 600, color: unavailable ? "var(--text-muted)" : "var(--text)" }}
          >
            {unavailable ? "—" : measure.value}
            {!unavailable && measure.unit && (
              <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {" "}{measure.unit}
              </span>
            )}
          </span>
        </span>
      </div>
      {measure.note && (
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {measure.note}
        </p>
      )}
    </div>
  );
}
