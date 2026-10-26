"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { draftPerformanceReport, pickExemplars } from "@/reports/interpret";
import {
  exportChat,
  exportDocx,
  exportMeasuresCsv,
  exportPdf,
  exportSalt,
  exportUlasaJson,
  exportUtterancesCsv,
} from "@/reports/export";
import { getPack } from "@/nlp/registry";
import { RUBRICS, scoreRubric } from "@/core/rubrics";
import { caseLabel, contextLabel, formatAge, formatDate, formatDuration, parseAge } from "@/lib/format";
import { displayValue, findMeasure, statusLabel } from "@/lib/measures";
import type { AnalysisResult, Sample } from "@/core/types";

/**
 * Report: an A4 preview with sections the clinician switches on or off, and
 * every export. PDF goes through the browser's print dialog so Indic scripts
 * shape correctly; the app chrome and this page's control panel do not print.
 */

const MIN_SET = 50;

const SECTIONS = [
  { key: "caution", label: "Sample-size caution" },
  { key: "measures", label: "Measures table" },
  { key: "summary", label: "Summary" },
  { key: "exemplars", label: "Exemplar utterances" },
  { key: "disclaimer", label: "Scope statement" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

const REPORT_KEYS: [string, string][] = [
  ["analysis_set", "Analysis set (C&I verbal utterances)"],
  ["ntw", "Total words"],
  ["mlu_w", "MLU in words"],
  ["mlu_m", "MLU in morphemes"],
  ["ndw", "Number of different words"],
  ["ttr", "Type–token ratio"],
  ["mtld", "MTLD"],
  ["maze_pct", "Maze words"],
  ["clausal_density", "Clausal density"],
  ["pgu", "Percent grammatical utterances"],
  ["codemix_ratio", "Code-mix ratio"],
  ["wpm", "Words per minute"],
];

export default function Report() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const analysis = useMemo(() => (sample ? analyseSample(sample) : null), [sample]);

  if (!hydrated) {
    return <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading…</div>;
  }
  if (!sample || !analysis) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">No sample selected</h1>
        <Link href="/" className="btn btn-primary mt-4 no-underline">Go to Home</Link>
      </div>
    );
  }
  return <ReportView key={sample.id} sample={sample} analysis={analysis} />;
}

function ReportView({ sample, analysis }: { sample: Sample; analysis: AnalysisResult }) {
  const rubric = useStore((s) => s.rubrics[sample.id]);
  const text = useStore((s) => s.reportDrafts[sample.id] ?? "");
  const setReportDraft = useStore((s) => s.setReportDraft);
  const cases = useStore((s) => s.cases);
  const addCase = useStore((s) => s.addCase);
  const updateCase = useStore((s) => s.updateCase);
  const log = useStore((s) => s.log);

  const [on, setOn] = useState<Record<SectionKey, boolean>>({ caution: true, measures: true, summary: true, exemplars: true, disclaimer: true });
  const [editing, setEditing] = useState(false);
  const [exportNotes, setExportNotes] = useState<string[]>([]);

  const pack = getPack(sample.language);
  const isIndic = pack.script !== "Latin";
  const exemplars = pickExemplars(sample);
  const short = analysis.analysisSetSize < MIN_SET;
  const caseRecord = cases.find((c) => c.code === sample.caseId);
  const age = formatAge(caseRecord?.ageYears, caseRecord?.ageMonths);
  const [ageText, setAgeText] = useState(age ?? "");
  useEffect(() => setAgeText(age ?? ""), [age]);

  function saveAge() {
    const parsed = parseAge(ageText);
    if (!parsed || sample.caseId === "unassigned") return;
    if (caseRecord) updateCase(caseRecord.id, { ageYears: parsed.years, ageMonths: parsed.months });
    else
      addCase({
        id: `case-${Math.random().toString(36).slice(2, 9)}`,
        code: sample.caseId,
        ageYears: parsed.years,
        ageMonths: parsed.months,
        languages: [sample.language],
        consentRecorded: false,
        createdAt: new Date().toISOString(),
      });
  }

  function generate() {
    setReportDraft(sample.id, draftPerformanceReport(sample, analysis, rubric ?? null));
    log("draft_report", `Drafted a performance report for "${sample.title}" from the computed measures.`);
  }

  const rows = REPORT_KEYS.flatMap(([key, label]) => {
    const m = findMeasure(analysis, key);
    if (!m) return [];
    // Code-mix is reported only where it applies; an English sample shows none.
    if (key === "codemix_ratio" && !isIndic && !m.value) return [];
    const status = key === "analysis_set" ? (short ? "Below convention" : "At convention") : statusLabel(m);
    return [{ key, label, value: displayValue(m), status }];
  });

  const exportBtn = { fontSize: 13.5, padding: 8 };

  return (
    <div className="report-grid grid grid-cols-[minmax(0,1fr)] items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="no-print flex flex-col gap-4 lg:sticky lg:top-[140px]">
        <div className="panel flex flex-col gap-2.5 p-4">
          <span className="caps">Include</span>
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-[9px]" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={on[s.key]} onChange={() => setOn((o) => ({ ...o, [s.key]: !o[s.key] }))} className="h-4 w-4" style={{ accentColor: "var(--accent)" }} />
              {s.label}
            </label>
          ))}
        </div>

        <div className="panel flex flex-col gap-2 p-4">
          <span className="caps">Summary</span>
          <button type="button" className="btn" style={{ fontSize: 13.5 }} onClick={generate}>{text ? "Regenerate from the measures" : "Draft from the measures"}</button>
          <button type="button" className="btn" style={{ fontSize: 13.5 }} disabled={!text} onClick={() => setEditing((v) => !v)}>{editing ? "Done editing" : "Edit summary"}</button>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Template composition over the computed numbers: local, deterministic, no language model. Edit every sentence
            before it goes into a file.
          </span>
          <label className="mt-1 flex flex-col gap-1 font-medium" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            Age (y;m)
            <input
              className="input mono"
              style={{ fontSize: 14 }}
              placeholder={sample.caseId === "unassigned" ? "Set a case ID first" : "e.g. 5;2"}
              disabled={sample.caseId === "unassigned"}
              value={ageText}
              onChange={(e) => setAgeText(e.target.value)}
              onBlur={saveAge}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" className="btn btn-primary" style={{ fontSize: 14, padding: 10 }} onClick={() => exportPdf()}>Save as PDF</button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn"
              style={exportBtn}
              onClick={() => {
                void exportDocx(sample, analysis, {
                  rubric: rubric ?? null,
                  narrative: text,
                  exemplars: exemplars.map((e) => ({ text: e.text, gloss: e.gloss })),
                });
                log("export", `Exported a DOCX report for "${sample.title}".`);
              }}
            >
              DOCX
            </button>
            <button type="button" className="btn" style={exportBtn} onClick={() => exportMeasuresCsv(sample, analysis)}>Measures CSV</button>
            <button type="button" className="btn" style={exportBtn} onClick={() => exportUtterancesCsv(sample)}>Utterances CSV</button>
            <button type="button" className="btn" style={exportBtn} onClick={() => setExportNotes(exportSalt(sample))}>SALT text</button>
            <button type="button" className="btn" style={exportBtn} onClick={() => setExportNotes(exportChat(sample))}>CHAT</button>
            <button type="button" className="btn" style={exportBtn} onClick={() => exportUlasaJson(sample, analysis)}>JSON</button>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
            PDF goes through the browser&apos;s print dialog so every script shapes correctly. Every file is generated in
            this browser.
          </span>
          {exportNotes.length > 0 && (
            <div className="notice notice-warn" style={{ fontSize: 12.5 }}>
              <strong>What that format could not carry</strong>
              <ul className="mt-1 list-disc pl-5">{exportNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          )}
        </div>
      </aside>

      <article className="a4-page flex flex-col gap-[22px]" style={{ fontSize: 14, lineHeight: 1.6 }}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: "var(--text)" }}>
          <div>
            <div className="caps" style={{ letterSpacing: "0.08em" }}>Language sample analysis report</div>
            <div className="mt-1 font-semibold" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>{caseLabel(sample.caseId)}</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{sample.title}</div>
          </div>
          <dl className="m-0 grid grid-cols-[auto_auto] gap-x-3.5 gap-y-0.5" style={{ fontSize: 12.5 }}>
            <dt style={{ color: "var(--text-muted)" }}>Date</dt><dd className="m-0">{formatDate(sample.recordedAt)}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Age</dt><dd className="m-0">{age ?? "—"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Language</dt><dd className="m-0">{pack.name}{isIndic ? " (spoken register)" : ""}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Context</dt>
            <dd className="m-0">{[contextLabel(sample.elicitationContext), formatDuration(sample.elapsedSeconds)].filter(Boolean).join(" · ")}</dd>
          </dl>
        </header>

        {on.caution && short && (
          <div className="rounded-md border px-3.5 py-2.5" style={{ fontSize: 12.5, borderColor: "var(--warn-border)", background: "var(--warn-soft)", color: "var(--warn-text)" }}>
            Analysis set of {analysis.analysisSetSize} utterances is below the 50-utterance convention. All figures are provisional.
          </div>
        )}

        {on.measures && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold" style={{ fontSize: 15 }}>Measures</h2>
            <div className="overflow-hidden rounded-md border" style={{ borderColor: "var(--border)" }}>
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_80px_120px] gap-2.5 border-b px-3 py-[7px] last:border-b-0" style={{ fontSize: 13, borderColor: "var(--surface-2)" }}>
                  <span>{r.label}</span>
                  <span className="tnum text-right font-semibold">{r.value}</span>
                  <span className="text-right" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {on.summary && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold" style={{ fontSize: 15 }}>Summary</h2>
            {!text ? (
              <div className="no-print rounded-md border border-dashed p-5 text-center" style={{ borderColor: "var(--border-strong)", color: "var(--text-muted)" }}>
                No summary yet.{" "}
                <button type="button" className="link-btn" onClick={generate}>Draft it from the measures</button>
              </div>
            ) : editing ? (
              <textarea
                className="textarea no-print"
                style={{ minHeight: "24rem", lineHeight: 1.7, fontSize: 14 }}
                value={text}
                onChange={(e) => setReportDraft(sample.id, e.target.value)}
                aria-label="Report summary"
              />
            ) : (
              text.split(/\n{2,}/).map((para, i) => <p key={i} className="m-0">{para}</p>)
            )}
            {editing && text && <div className="hidden print:block">{text.split(/\n{2,}/).map((p, i) => <p key={i} className="m-0 mb-2">{p}</p>)}</div>}
          </section>
        )}

        {rubric && (() => {
          const def = RUBRICS[rubric.rubricId];
          const result = scoreRubric(def, rubric);
          if (result.composite === null) return null;
          return (
            <section className="flex flex-col gap-1">
              <h2 className="m-0 font-semibold" style={{ fontSize: 15 }}>{def.label}</h2>
              <p className="m-0">Composite {result.composite} of {result.maximum} across {result.scored} scored dimensions.</p>
              {rubric.notes && <p className="m-0">{rubric.notes}</p>}
            </section>
          );
        })()}

        {on.exemplars && exemplars.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold" style={{ fontSize: 15 }}>Exemplar utterances</h2>
            <div className="flex flex-col gap-2">
              {exemplars.map((ex, i) => (
                <div key={i} className="flex flex-col">
                  <span className={isIndic ? "indic" : ""} style={{ fontSize: 15 }}>{ex.text}</span>
                  {ex.gloss && <span style={{ fontSize: 12.5, fontStyle: "italic", color: "var(--text-muted)" }}>gloss: {ex.gloss}</span>}
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.reason}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {on.disclaimer && (
          <div className="border-t pt-3" style={{ fontSize: 12, color: "var(--text-muted)", borderColor: "var(--border)" }}>
            ULASA quantifies language production to support a qualified professional&apos;s judgement. It does not diagnose.
            Measures marked experimental rest on heuristics or protocols not yet validated for this language. {pack.normativeNotes}
          </div>
        )}

        <div className="flex justify-between gap-6 pt-7" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          <span className="w-[220px] border-t pt-1.5" style={{ borderColor: "var(--text)" }}>Speech-language pathologist</span>
          <span className="w-[140px] border-t pt-1.5" style={{ borderColor: "var(--text)" }}>Date</span>
        </div>
      </article>
    </div>
  );
}
