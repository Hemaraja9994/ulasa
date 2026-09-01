"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { RUBRICS, rubricFor, scoreRubric } from "@/core/rubrics";
import { draftPerformanceReport, pickExemplars } from "@/reports/interpret";
import { exportChat, exportDocx, exportMeasuresCsv, exportPdf, exportSalt } from "@/reports/export";
import { getPack } from "@/nlp/registry";
import { EmptyState } from "@/components/EmptyState";
import { scriptTextProps } from "@/components/LanguageBadge";
import type { MeasureValue } from "@/core/types";

/**
 * Report — an A4 preview that could go in a case file, and the rail that
 * exports it.
 *
 * The sheet reads as paper on a desk, not as another app screen: `--paper`
 * stays light in both themes, and print drops the desk, the rail and the app
 * chrome entirely, leaving only the sheet. Section 1 comes from
 * `interpret.ts` rather than being written here — the view does not invent
 * clinical language.
 */

const CASE_LABEL = "Language Sample Analysis";

export default function ReportPage() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const rubrics = useStore((s) => s.rubrics);
  const cases = useStore((s) => s.cases);
  const [busy, setBusy] = useState<string | null>(null);
  const [include, setInclude] = useState({
    validity: true,
    measures: true,
    experimental: true,
    rubric: true,
    transcript: false,
    mazeTranscript: false,
  });

  const analysis = useMemo(() => (sample ? analyseSample(sample) : null), [sample]);
  const rubricId = sample ? rubricFor(sample.elicitationContext) : "narrative";
  const rubric = RUBRICS[rubricId];
  const rubricScores = sample ? rubrics[sample.id] : undefined;
  const rubricResult = rubricScores?.rubricId === rubricId ? scoreRubric(rubric, rubricScores) : null;

  const validityParagraph = useMemo(() => {
    if (!sample || !analysis) return "";
    return draftPerformanceReport(sample, analysis, rubricScores ?? null).split("\n\n")[0];
  }, [sample, analysis, rubricScores]);

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!sample || !analysis) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Report</h1>
        <EmptyState
          art="shield"
          heading="Nothing to report yet"
          body="A report is built from a sample's computed measures. Open one from the Workbench and transcribe it first."
          action={
            <Link href="/" className="btn btn-primary no-underline">
              Go to the Workbench
            </Link>
          }
        />
      </div>
    );
  }

  const pack = getPack(sample.language);
  const caseRecord = cases.find((c) => c.id === sample.caseId);
  const caseCode = sample.caseId !== "unassigned" ? sample.caseId.toUpperCase() : "No case code";
  const age =
    caseRecord?.ageYears !== undefined
      ? `${caseRecord.ageYears};${String(caseRecord.ageMonths ?? 0).padStart(2, "0")}`
      : "—";
  const measures: MeasureValue[] = analysis.groups
    .flatMap((g) => g.measures)
    .filter((m) => include.experimental || m.status !== "experimental");
  const reportDate = new Date(analysis.computedAt).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function runExport(kind: "pdf" | "docx" | "csv" | "salt") {
    setBusy(kind);
    try {
      if (kind === "pdf") {
        exportPdf();
      } else if (kind === "csv") {
        exportMeasuresCsv(sample!, analysis!);
      } else if (kind === "salt") {
        exportSalt(sample!);
      } else {
        await exportDocx(sample!, analysis!, {
          rubric: include.rubric ? rubricScores ?? null : null,
          narrative: include.validity ? draftPerformanceReport(sample!, analysis!, rubricScores ?? null) : undefined,
          exemplars: include.transcript ? pickExemplars(sample!) : undefined,
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            Report
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Generated in this tab from the computed measures. Nothing passes through a server.
          </p>
        </div>
      </div>

      <div
        className="grid items-start gap-4 rounded-xl p-4 lg:grid-cols-[1fr_300px]"
        style={{ background: "var(--desk)" }}
      >
        {/* A4 sheet */}
        <div className="flex flex-col items-center gap-2.5">
          <div
            className="print-sheet w-full max-w-[794px] box-border"
            style={{ background: "var(--paper)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 24px rgba(13,17,22,.12)", padding: "clamp(24px, 5vw, 52px) clamp(20px, 5vw, 56px)" }}
          >
            {/* Masthead */}
            <div className="flex items-start justify-between gap-4 pb-3.5" style={{ borderBottom: "2px solid var(--chrome-2)" }}>
              <div className="flex items-center gap-2.5">
                <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path d="M13 12h-4v24h4M35 12h4v24h-4" stroke="#0D1116" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 17h14M17 24h9M17 31h12" stroke="#0D1116" strokeWidth="2.8" strokeLinecap="round" />
                </svg>
                <div>
                  <div className="text-[17px] font-bold tracking-[-0.01em]" style={{ color: "#0D1116" }}>
                    {CASE_LABEL}
                  </div>
                  <div className="text-[11.5px]" style={{ color: "#56616D" }}>
                    ULASA · computed on device · no norms applied
                  </div>
                </div>
              </div>
              <div className="mono text-right text-[11px] leading-relaxed" style={{ color: "#56616D" }}>
                {caseCode}
                <br />
                {reportDate}
                <br />
                Sheet 1 of 1
              </div>
            </div>

            {/* Four-up header */}
            <div className="print-row grid grid-cols-2 gap-3.5 py-4 sm:grid-cols-4" style={{ borderBottom: "1px solid #D8DDE3" }}>
              {[
                ["Age", age],
                ["Language", `${pack.name} (${sample.language})`],
                ["Context", sample.elicitationContext.replace(/_/g, " ")],
                ["Analysis set", `${analysis.analysisSetSize} C&I of ${sample.utterances.length}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.09em]" style={{ color: "#7A8794" }}>
                    {label}
                  </div>
                  <div className="num mt-0.5 text-sm font-semibold" style={{ color: "#0D1116" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* 1 — validity */}
            {include.validity && (
              <div className="print-row py-3.5">
                <SectionTitle>1 · Sample validity</SectionTitle>
                <p className="mt-1.5 text-[13px] leading-[1.7]" style={{ color: "#2A3138" }} {...scriptTextProps(sample.language)}>
                  {validityParagraph}
                </p>
              </div>
            )}

            {/* 2 — measures */}
            {include.measures && (
              <div className="print-row py-3.5">
                <SectionTitle>2 · Measures</SectionTitle>
                <div className="mt-2" style={{ border: "1px solid #D8DDE3" }}>
                  <div className="grid grid-cols-[2fr_1fr_1.4fr_1fr] gap-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ background: "var(--paper-rule)", color: "#56616D" }}>
                    <div>Measure</div>
                    <div className="text-right">Value</div>
                    <div>Unit</div>
                    <div>Status</div>
                  </div>
                  {measures.map((m) => (
                    <div key={m.key} className="grid grid-cols-[2fr_1fr_1.4fr_1fr] items-baseline gap-2 px-2.5 py-1.5 text-[12.5px]" style={{ borderTop: "1px solid #EAE8E2" }}>
                      <div>{m.label}</div>
                      <div className="mono num text-right font-semibold">{m.value ?? "—"}</div>
                      <div style={{ color: "#56616D" }}>{m.unit ?? ""}</div>
                      <div
                        className="text-[11px] font-semibold uppercase tracking-[0.04em]"
                        style={{ color: m.status === "experimental" ? "var(--experimental)" : m.status === "unavailable" ? "#7A8794" : "var(--accent-text)" }}
                      >
                        {m.status}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-[1.5]" style={{ color: "#56616D" }}>
                  Experimental measures are printed because they were computed, and labelled because the language pack has no published protocol for them. They are not comparable to established measures or to any norm table.
                </p>
              </div>
            )}

            {/* 3 — rubric */}
            {include.rubric && (
              <div className="print-row py-3.5">
                <SectionTitle>3 · {rubric.label.replace(" scoring", "")} rubric</SectionTitle>
                {rubricResult && rubricResult.scored > 0 ? (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {rubric.dimensions
                        .filter((d) => typeof rubricScores!.scores[d.key] === "number")
                        .map((d) => (
                          <div key={d.key} style={{ border: "1px solid #D8DDE3", padding: "7px 9px" }}>
                            <div className="text-[10.5px]" style={{ color: "#56616D" }}>
                              {d.label}
                            </div>
                            <div className="num text-sm font-semibold">{rubricScores!.scores[d.key]} / 5</div>
                          </div>
                        ))}
                    </div>
                    <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "#2A3138" }}>
                      Composite {rubricResult.composite} of {rubricResult.maximum} across {rubricResult.scored} scored
                      dimensions, mean {rubricResult.mean?.toFixed(1)}.
                      {rubricScores?.notes ? ` ${rubricScores.notes}` : ""} Rubric scores are clinician judgements
                      stored with the sample, not computed values.
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-[12.5px]" style={{ color: "#7A8794" }}>
                    No dimensions have been scored yet. Score the {rubric.label.toLowerCase()} in Rubrics to include it here.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4 pt-2.5" style={{ borderTop: "1px solid #D8DDE3" }}>
              <p className="max-w-[430px] text-[10.5px] leading-[1.55]" style={{ color: "#56616D" }}>
                ULASA quantifies language production to support a qualified professional. It does not diagnose. Computed entirely on the examiner&rsquo;s device.
              </p>
              <p className="text-right text-[10.5px] leading-[1.55]" style={{ color: "#56616D" }}>
                Examiner signature ______________________
                <br />
                Date ____________
              </p>
            </div>
          </div>
          <p className="no-print text-xs" style={{ color: "var(--text-muted)" }}>
            A4 · 210 × 297 mm · prints without the app chrome
          </p>
        </div>

        {/* Export rail */}
        <div className="no-print flex flex-col gap-3.5">
          <div className="card p-4">
            <div className="meta-label mb-2.5">Export</div>
            <div className="flex flex-col gap-2">
              <ExportButton primary label="PDF — print sheet" busy={busy === "pdf"} onClick={() => runExport("pdf")} />
              <ExportButton label="DOCX — editable report" busy={busy === "docx"} onClick={() => void runExport("docx")} />
              <ExportButton label="CSV — measures table" busy={busy === "csv"} onClick={() => runExport("csv")} />
              <ExportButton label="SALT — .txt transcript" busy={busy === "salt"} onClick={() => runExport("salt")} />
            </div>
            <p className="mt-2.5 text-xs leading-normal" style={{ color: "var(--text-faint)" }}>
              Files are generated in this tab and saved by your browser. Nothing passes through a server.
            </p>
          </div>

          <div className="card p-4">
            <div className="meta-label mb-2.5">Include</div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ["validity", "Sample validity paragraph"],
                  ["measures", "Measures table"],
                  ["experimental", "Experimental measures, labelled"],
                  ["rubric", `${rubric.label.replace(" scoring", "")} rubric`],
                  ["transcript", "Full transcript appendix"],
                  ["mazeTranscript", "Maze-marked transcript"],
                ] as [keyof typeof include, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex min-h-11 items-center gap-2.5 text-[13.5px] md:min-h-0" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={include[key]}
                    onChange={(e) => setInclude((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)" }}>
            <div className="text-[13.5px] font-semibold leading-snug" style={{ color: "var(--accent-text)" }}>
              The case code is the only identifier in this report.
            </div>
            <div className="mt-1.5 text-[12.5px] leading-snug" style={{ color: "var(--accent-text)" }}>
              ULASA never asks for a legal name. Add identifying details in your own record system, not here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-bold uppercase tracking-[0.04em]" style={{ color: "#0D1116" }}>
      {children}
    </div>
  );
}

function ExportButton({
  label,
  onClick,
  primary,
  busy,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`btn min-h-11 justify-start md:min-h-0 ${primary ? "btn-primary" : ""}`}
    >
      {busy ? "Working…" : label}
    </button>
  );
}
