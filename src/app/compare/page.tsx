"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { newSampleId, useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { parseSaltText } from "@/core/io/salt";
import { parseReferenceSet, REFERENCE_TEMPLATE, zScore, type ReferenceSet } from "@/core/reference";
import { FIXTURES } from "@/data/fixtures";
import { getPack } from "@/nlp/registry";
import { download } from "@/lib/download";
import { byDate, caseLabel, contextLabel, formatDate } from "@/lib/format";
import { findMeasure } from "@/lib/measures";
import type { AnalysisResult, Bcp47, MeasureValue, Sample } from "@/core/types";

/**
 * Compare: baseline vs follow-up for one child, optionally against a local
 * reference set the clinic imported. ULASA bundles no norms, so without such a
 * set (and for every sample under 50 utterances) the profile shows intra-child
 * change only. Change is never coloured good or bad.
 */

const MIN_SET = 50;
const DEMO_PAIR = ["en-preschool", "short"];

const PROFILE: { key: string; label: string; hint: string; dp: number }[] = [
  { key: "mlu_w", label: "MLU in words", hint: "Mean words per utterance", dp: 2 },
  { key: "ndw", label: "Number of different words", hint: "Distinct word types", dp: 0 },
  { key: "mattr", label: "MATTR", hint: "50-word moving window", dp: 2 },
  { key: "maze_pct", label: "Maze words", hint: "% of all words", dp: 1 },
  { key: "wpm", label: "Words per minute", hint: "Including mazes", dp: 1 },
  { key: "pct_with_errors", label: "Utterances with an error", hint: "% of analysis set", dp: 1 },
  { key: "pct_intelligible_utterances", label: "Intelligible utterances", hint: "% of target utterances", dp: 1 },
  { key: "pgu", label: "Percent grammatical utterances", hint: "Mark grammaticality in Code to enable", dp: 1 },
];

const COLS = "210px 64px 64px 70px minmax(0,1fr) 88px";

export default function Compare() {
  const hydrated = useHydrated();
  const router = useRouter();
  const samples = useStore((s) => s.samples);
  const active = useActiveSample();
  const pair = useStore((s) => s.comparePair);
  const setComparePair = useStore((s) => s.setComparePair);
  const referenceSets = useStore((s) => s.referenceSets);
  const reportDrafts = useStore((s) => s.reportDrafts);
  const setReportDraft = useStore((s) => s.setReportDraft);
  const setActiveSample = useStore((s) => s.setActiveSample);
  const addSample = useStore((s) => s.addSample);
  const log = useStore((s) => s.log);

  const [refOn, setRefOn] = useState(true);
  const [refId, setRefId] = useState<string>("");

  // Follow-up: the stored pair, else the open sample. Baseline: the stored pair,
  // else the earliest other session for the same case, else another sample.
  const { baseline, followUp } = useMemo(() => {
    const byId = (id?: string) => samples.find((s) => s.id === id) ?? null;
    const fu = byId(pair?.followUp) ?? active ?? samples[0] ?? null;
    let base = byId(pair?.baseline);
    if (!base || base.id === fu?.id) {
      const sameCase = fu && fu.caseId !== "unassigned"
        ? samples.filter((s) => s.caseId === fu.caseId && s.id !== fu.id).sort(byDate)
        : [];
      base = sameCase[0] ?? samples.find((s) => s.id !== fu?.id) ?? null;
    }
    return { baseline: base, followUp: fu };
  }, [samples, pair, active]);

  const resA = useMemo(() => (baseline ? analyseSample(baseline) : null), [baseline]);
  const resB = useMemo(() => (followUp ? analyseSample(followUp) : null), [followUp]);

  function loadDemoPair() {
    const ids: string[] = [];
    for (const fid of DEMO_PAIR) {
      const fixture = FIXTURES.find((f) => f.id === fid);
      if (!fixture) continue;
      const { sample } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
      const id = newSampleId();
      addSample({ ...sample, id, caseId: "Demo en-IN", title: fixture.label, recordedAt: new Date().toISOString() });
      ids.push(id);
    }
    if (ids.length === 2) {
      setComparePair({ baseline: ids[0], followUp: ids[1] });
      log("load_fixture", "Loaded the demonstration comparison pair.");
    }
  }

  if (!hydrated) {
    return <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading…</div>;
  }

  if (!baseline || !followUp || !resA || !resB || baseline.id === followUp.id) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <h1 className="m-0 text-lg font-semibold">Compare needs two samples</h1>
        <p className="m-0 max-w-xl text-sm" style={{ color: "var(--text-muted)" }}>
          Record a follow-up session for the same case, or load two original demonstration transcripts to try it.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={loadDemoPair}>Load demo pair</button>
          <Link href="/" className="btn no-underline">Go to Home</Link>
        </div>
      </div>
    );
  }

  const pack = getPack(followUp.language);
  const sameLanguage = baseline.language === followUp.language;
  const short = resA.analysisSetSize < MIN_SET || resB.analysisSetSize < MIN_SET;
  const candidates = referenceSets.filter((r) => r.language === followUp.language);
  const ref: ReferenceSet | null = candidates.find((r) => r.id === refId) ?? candidates[0] ?? null;
  // Reference comparison needs a set for this language, one language on both
  // sides, and both samples at the 50-utterance convention.
  const refUsable = !!ref && sameLanguage && !short;
  const showRef = refOn && refUsable;
  const zReason = !ref ? "no reference set" : !sameLanguage ? "languages differ" : short ? "sample < 50" : "";

  const rows = PROFILE.map((p) => {
    const a = findMeasure(resA, p.key);
    const b = findMeasure(resB, p.key);
    const r = showRef ? ref!.measures[p.key] ?? null : null;
    return { ...p, a, b, r, z: showRef ? zScore(ref, p.key, b?.value ?? null) : null };
  });

  const sentences = draftSentences(rows, baseline, followUp, resA, resB, showRef);

  function addToReport() {
    if (!followUp || sentences.length === 0) return;
    const existing = reportDrafts[followUp.id]?.trim();
    const para = sentences.join(" ");
    setReportDraft(followUp.id, existing ? `${existing}\n\n${para}` : para);
    setActiveSample(followUp.id);
    log("draft_report", `Added the session comparison to the report for "${followUp.title}".`);
    router.push("/report");
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="panel flex min-w-0 flex-col gap-3.5 px-6 py-[22px]" aria-labelledby="profile-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 id="profile-title" className="m-0 font-semibold" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Progress and reference profile</h1>
              <p className="m-0 mt-1" style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {caseLabel(followUp.caseId)} · {pack.name} · {contextLabel(followUp.elicitationContext).toLowerCase()} · baseline{" "}
                {formatDate(baseline.recordedAt)} vs follow-up {formatDate(followUp.recordedAt)}
              </p>
            </div>
            <div className="seg flex-none" role="group" aria-label="Reference view" style={{ fontSize: 13 }}>
              <button type="button" className="seg-btn" style={{ padding: "5px 12px", fontSize: 13 }} aria-pressed={showRef} disabled={!refUsable} onClick={() => setRefOn(true)} title={refUsable ? undefined : `Unavailable: ${zReason}`}>
                With local reference
              </button>
              <button type="button" className="seg-btn" style={{ padding: "5px 12px", fontSize: 13 }} aria-pressed={!showRef} onClick={() => setRefOn(false)}>
                Change only
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ border: "2px solid var(--text-muted)", background: "var(--surface)" }} />Baseline</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />Follow-up</span>
              {showRef && (
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-[18px] rounded-[3px]" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }} />Local reference ±1 SD</span>
              )}
            </div>
            {showRef && ref ? (
              <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: "var(--warn-soft)", color: "var(--warn-text)", fontSize: 11.5 }}>
                {ref.name} · {ref.source ?? "built locally"} · n = {ref.n}
              </span>
            ) : (
              <span style={{ fontSize: 12 }}>Intra-child change only{zReason ? ` · ${zReason}` : ""}</span>
            )}
          </div>

          {!sameLanguage && (
            <div className="notice notice-warn" style={{ fontSize: 13 }}>
              These samples are in different languages ({getPack(baseline.language).name} vs {pack.name}). Language-specific
              measures, MLU above all, are not comparable across languages.
            </div>
          )}

          <div className="hscroll">
            <div className="hscroll-inner">
              <div className="caps grid items-center gap-3 border-b py-2" style={{ gridTemplateColumns: COLS, borderColor: "var(--border)" }}>
                <span>Measure</span><span className="text-right">Base</span><span className="text-right">Now</span><span className="text-right">Change</span><span /><span className="text-right">z</span>
              </div>
              {rows.map((r) => <ProfileRow key={r.key} row={r} zReason={showRef ? "" : zReason} />)}
            </div>
          </div>

          <p className="m-0 mt-1 max-w-[760px]" style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-muted)" }}>
            ULASA bundles no norms. A reference set appears here only when your clinic built and imported one for this
            language. For Hindi, Kannada, Tamil, Telugu and Malayalam samples without such a set, the z column reads
            &ldquo;no reference set&rdquo; and the profile shows intra-child change only. Change is shown as a direction, not a
            judgement of improvement.
          </p>
        </section>

        <AllMeasures a={resA} b={resB} />
      </div>

      <aside className="flex flex-col gap-4">
        <div className="panel flex flex-col gap-3 p-[18px]">
          <span className="caps">Sessions compared</span>
          <SessionPicker
            label="baseline"
            value={baseline}
            samples={samples}
            onChange={(id) => setComparePair({ baseline: id, followUp: followUp.id })}
          />
          <SessionPicker
            label="follow-up"
            value={followUp}
            samples={samples}
            highlight
            onChange={(id) => setComparePair({ baseline: baseline.id, followUp: id })}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {baseline.elicitationContext === followUp.elicitationContext && sameLanguage
              ? `Both sessions: ${contextLabel(followUp.elicitationContext).toLowerCase()}, ${pack.name} pack.`
              : "The sessions differ in context or language. Compare like with like where you can."}
          </span>
        </div>

        <div className="panel flex flex-col gap-2.5 p-[18px]" style={{ fontSize: 14, lineHeight: 1.6 }}>
          <span className="caps">Drafted for the report</span>
          {sentences.length === 0 ? (
            <p className="m-0" style={{ color: "var(--text-muted)" }}>No measure is available in both sessions yet.</p>
          ) : (
            sentences.map((s, i) => <p key={i} className="m-0">{s}</p>)
          )}
          <button type="button" className="btn btn-primary mt-1.5" style={{ fontSize: 14, padding: 10 }} disabled={sentences.length === 0} onClick={addToReport}>
            Add to report
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Appended to the follow-up&apos;s report draft. Edit before filing.</span>
        </div>

        <ReferenceSets language={followUp.language} selectedId={ref?.id ?? ""} onSelect={setRefId} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Row = { key: string; label: string; hint: string; dp: number; a: MeasureValue | null; b: MeasureValue | null; r: { mean: number; sd: number } | null; z: number | null };

function ProfileRow({ row, zReason }: { row: Row; zReason: string }) {
  const va = row.a?.value ?? null;
  const vb = row.b?.value ?? null;
  const both = va !== null && vb !== null;
  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(row.dp));
  const delta = both ? vb - va : null;

  // Per-measure scale covering both values and the reference band, padded.
  const pts = [va, vb, row.r ? row.r.mean - row.r.sd : null, row.r ? row.r.mean + row.r.sd : null].filter((v): v is number => v !== null);
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  const pad = (hi - lo) * 0.25 || Math.max(1, Math.abs(hi) * 0.1);
  lo = Math.max(0, lo - pad);
  hi = hi + pad;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));

  return (
    <div className="grid items-center gap-3 border-b py-2.5" style={{ gridTemplateColumns: COLS, borderColor: "var(--surface-2)", opacity: both ? 1 : 0.55 }}>
      <span className="flex flex-col gap-px">
        <span className="font-medium" style={{ fontSize: 14 }}>{row.label}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{both || row.key === "pgu" ? row.hint : "Not available in both sessions"}</span>
      </span>
      <span className="tnum text-right" style={{ fontSize: 14, color: "var(--text-muted)" }}>{fmt(va)}</span>
      <span className="tnum text-right font-semibold" style={{ fontSize: 14 }}>{fmt(vb)}</span>
      <span className="mono text-right" style={{ fontSize: 13, color: "var(--accent-text)" }}>
        {delta === null ? "" : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toFixed(row.dp)}`}
      </span>
      <div className="relative h-[26px]" aria-hidden="true">
        <div className="absolute inset-x-0 top-3 h-0.5" style={{ background: "var(--surface-2)" }} />
        {row.r && both && (
          <div className="absolute top-1 h-[18px] rounded" style={{ left: `${pct(row.r.mean - row.r.sd)}%`, width: `${pct(row.r.mean + row.r.sd) - pct(row.r.mean - row.r.sd)}%`, background: "var(--surface-2)", border: "1px solid var(--border-strong)" }} />
        )}
        {both && (
          <>
            <div className="absolute top-3 h-0.5" style={{ left: `${Math.min(pct(va), pct(vb))}%`, width: `${Math.abs(pct(vb) - pct(va))}%`, background: "var(--accent)" }} />
            <div className="absolute top-1.5 h-2.5 w-2.5 rounded-full" style={{ left: `${pct(va)}%`, marginLeft: -7, border: "2px solid var(--text-muted)", background: "var(--surface)", boxSizing: "content-box" }} />
            <div className="absolute top-[5px] h-4 w-4 rounded-full" style={{ left: `${pct(vb)}%`, marginLeft: -8, background: "var(--accent)", boxShadow: "0 0 0 3px var(--surface)" }} />
          </>
        )}
      </div>
      <span className="mono text-right" style={{ fontSize: row.z === null && zReason ? 11 : 13, color: row.z === null ? "var(--text-muted)" : "var(--text)" }}>
        {row.z !== null ? `${row.z >= 0 ? "+" : "−"}${Math.abs(row.z).toFixed(1)}` : both ? zReason || "—" : ""}
      </span>
    </div>
  );
}

function SessionPicker({ label, value, samples, highlight, onChange }: { label: string; value: Sample; samples: Sample[]; highlight?: boolean; onChange: (id: string) => void }) {
  const n = useMemo(() => analyseSample(value).analysisSetSize, [value]);
  return (
    <label
      className="flex flex-col gap-1 rounded-lg border px-3 py-2.5"
      style={{ fontSize: 13.5, borderColor: highlight ? "var(--accent-mid)" : "var(--border)", background: highlight ? "var(--accent-soft)" : "transparent", color: highlight ? "var(--accent-text)" : "var(--text)" }}
    >
      <span className="flex justify-between gap-2">
        <span><b>{formatDate(value.recordedAt)}</b> · {label}</span>
        <span style={{ color: n < MIN_SET ? "var(--warn-text)" : undefined }}>{n} utt.</span>
      </span>
      <select className="select" style={{ fontSize: 13, padding: "4px 8px" }} value={value.id} onChange={(e) => onChange(e.target.value)} aria-label={`Choose the ${label} session`}>
        {samples.map((s) => (
          <option key={s.id} value={s.id}>{s.title} · {caseLabel(s.caseId)} · {getPack(s.language).name}</option>
        ))}
      </select>
    </label>
  );
}

function ReferenceSets({ language, selectedId, onSelect }: { language: Bcp47; selectedId: string; onSelect: (id: string) => void }) {
  const sets = useStore((s) => s.referenceSets);
  const addReferenceSet = useStore((s) => s.addReferenceSet);
  const deleteReferenceSet = useStore((s) => s.deleteReferenceSet);
  const log = useStore((s) => s.log);
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function importFile(file: File) {
    try {
      const { set, errors: errs } = parseReferenceSet(JSON.parse(await file.text()), `ref-${Math.random().toString(36).slice(2, 9)}`);
      setErrors(errs);
      if (set) {
        addReferenceSet(set);
        log("import_reference", `Imported the local reference set "${set.name}" (${set.language}, n = ${set.n}).`);
      }
    } catch {
      setErrors([`"${file.name}" is not readable JSON.`]);
    }
  }

  return (
    <div className="panel flex flex-col gap-2.5 p-[18px]" style={{ fontSize: 13 }}>
      <span className="caps">Local reference sets</span>
      {sets.length === 0 ? (
        <p className="m-0" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
          None imported. A set is a JSON file of means and SDs your clinic computed from its own samples.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {sets.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: r.id === selectedId ? "var(--accent-mid)" : "var(--border)" }}>
              <button type="button" className="link-btn min-w-0 truncate text-left" style={{ color: "var(--text)", fontSize: 13 }} disabled={r.language !== language} onClick={() => onSelect(r.id)} title={r.language !== language ? `For ${getPack(r.language).name} samples` : "Use this set"}>
                <b>{r.name}</b> · {getPack(r.language).name} · n = {r.n}
              </button>
              {confirmId === r.id ? (
                <span className="flex flex-none gap-2">
                  <button type="button" className="link-btn" style={{ color: "var(--danger-text)", fontSize: 12 }} onClick={() => { deleteReferenceSet(r.id); setConfirmId(null); log("delete_reference", `Deleted the reference set "${r.name}".`); }}>Delete</button>
                  <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setConfirmId(null)}>Keep</button>
                </span>
              ) : (
                <button type="button" className="link-btn flex-none" style={{ color: "var(--text-muted)", fontSize: 12 }} onClick={() => setConfirmId(r.id)} aria-label={`Delete ${r.name}`}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" style={{ fontSize: 13, padding: "6px 10px" }} onClick={() => fileRef.current?.click()}>Import set (.json)</button>
        <button
          type="button"
          className="btn flex-1"
          style={{ fontSize: 13, padding: "6px 10px" }}
          onClick={() => download(new Blob([JSON.stringify(REFERENCE_TEMPLATE, null, 2)], { type: "application/json" }), "ulasa-reference-set-template.json")}
        >
          Template
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
      {errors.length > 0 && (
        <ul className="notice notice-warn m-0 list-disc pl-7" style={{ fontSize: 12.5 }}>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
      )}
    </div>
  );
}

/** The full side-by-side table, for measures beyond the profile. */
function AllMeasures({ a, b }: { a: AnalysisResult; b: AnalysisResult }) {
  return (
    <details className="panel">
      <summary className="cursor-pointer px-5 py-3 font-semibold" style={{ fontSize: 14 }}>All measures, side by side</summary>
      <div className="hscroll border-t" style={{ borderColor: "var(--border)" }}>
        <table className="hscroll-inner w-full border-collapse text-left" style={{ fontSize: 13.5 }}>
          <thead>
            <tr className="caps" style={{ background: "var(--surface-2)" }}>
              <th className="px-4 py-2 font-semibold">Measure</th>
              <th className="px-4 py-2 text-right font-semibold">Base</th>
              <th className="px-4 py-2 text-right font-semibold">Now</th>
              <th className="px-4 py-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {b.groups.flatMap((g) => [
              <tr key={`g-${g.id}`}><td colSpan={4} className="caps px-4 pb-1 pt-3" style={{ color: "var(--accent-text)" }}>{g.label}</td></tr>,
              ...g.measures.filter((m) => m.key !== "codemix_note" && m.key !== "matrix_language").map((m) => {
                const ma = findMeasure(a, m.key);
                const va = ma?.value ?? null;
                const vb = m.value;
                const d = va !== null && vb !== null ? Math.round((vb - va) * 100) / 100 : null;
                return (
                  <tr key={m.key} className="border-t" style={{ borderColor: "var(--surface-2)" }}>
                    <td className="px-4 py-2">
                      {m.label}
                      {(m.status === "experimental" || ma?.status === "experimental") && <span className="pill-exp ml-2 rounded-full">Exp.</span>}
                    </td>
                    <td className="tnum px-4 py-2 text-right" style={{ color: "var(--text-muted)" }}>{va ?? "—"}</td>
                    <td className="tnum px-4 py-2 text-right font-semibold">{vb ?? "—"}</td>
                    <td className="mono px-4 py-2 text-right" style={{ color: "var(--accent-text)" }}>{d === null ? "—" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}`}</td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Plain descriptive sentences. Direction words only; no judgement of progress. */
function draftSentences(rows: Row[], base: Sample, fu: Sample, resA: AnalysisResult, resB: AnalysisResult, withRef: boolean): string[] {
  const out: string[] = [];
  const when = `between the ${formatDate(base.recordedAt)} and ${formatDate(fu.recordedAt)} sessions`;
  const dir = (a: number, b: number) => (b > a ? "rose" : b < a ? "fell" : "was unchanged");
  const find = (k: string) => rows.find((r) => r.key === k);

  const mlu = find("mlu_w");
  if (mlu?.a?.value != null && mlu.b?.value != null) {
    const a = mlu.a.value, b = mlu.b.value;
    out.push(a === b ? `Mean length of utterance in words was unchanged at ${b.toFixed(2)} ${when}.` : `Mean length of utterance in words ${dir(a, b)} from ${a.toFixed(2)} to ${b.toFixed(2)} ${when}.`);
  }
  const ndw = find("ndw");
  if (ndw?.a?.value != null && ndw.b?.value != null && ndw.a.value !== ndw.b.value) {
    out.push(`Number of different words ${dir(ndw.a.value, ndw.b.value)} from ${ndw.a.value} to ${ndw.b.value}.`);
  }
  const maze = find("maze_pct");
  if (maze?.a?.value != null && maze.b?.value != null && maze.a.value !== maze.b.value) {
    out.push(`Maze words ${dir(maze.a.value, maze.b.value)} from ${maze.a.value}% to ${maze.b.value}% of all words.`);
  }
  if (withRef) {
    for (const r of rows) {
      if (r.z === null || r.b?.value == null || Math.abs(r.z) <= 1) continue;
      out.push(`${r.label} (${r.b.value.toFixed(r.dp)}${r.b.unit === "%" ? "%" : ""}) lies ${r.z < 0 ? "below" : "above"} the local reference range (z = ${r.z < 0 ? "−" : "+"}${Math.abs(r.z).toFixed(1)}).`);
    }
  }
  if (out.length && (resA.analysisSetSize < MIN_SET || resB.analysisSetSize < MIN_SET)) {
    out.push("At least one session has fewer than 50 complete and intelligible utterances, so this change is provisional.");
  }
  return out;
}
