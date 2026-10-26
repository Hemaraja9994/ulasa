"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { newSampleId, useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { parseSaltText } from "@/core/io/salt";
import { FIXTURES } from "@/data/fixtures";
import { GLOSSARY_BY_KEY } from "@/data/glossary";
import { getPack } from "@/nlp/registry";
import type { AnalysisResult, Bcp47, MeasureValue } from "@/core/types";

/** Demo pair: a full-length and a short English sample, both original ULASA fixtures. */
const DEMO_PAIR = ["en-preschool", "short"];

interface Row {
  key: string;
  label: string;
  group: string;
  unit?: string;
  a: MeasureValue | null;
  b: MeasureValue | null;
}

function buildRows(a: AnalysisResult, b: AnalysisResult): Row[] {
  const rows: Row[] = [];
  const index = new Map<string, Row>();
  const add = (res: AnalysisResult, side: "a" | "b") => {
    for (const group of res.groups) {
      for (const m of group.measures) {
        let row = index.get(m.key);
        if (!row) {
          row = { key: m.key, label: m.label, group: group.label, unit: m.unit, a: null, b: null };
          index.set(m.key, row);
          rows.push(row);
        }
        row[side] = m;
      }
    }
  };
  add(a, "a");
  add(b, "b");
  return rows;
}

function fmt(m: MeasureValue | null) {
  if (!m || m.value === null) return "—";
  return String(m.value);
}

export default function Compare() {
  const hydrated = useHydrated();
  const samples = useStore((s) => s.samples);
  const addSample = useStore((s) => s.addSample);
  const log = useStore((s) => s.log);
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  useEffect(() => {
    if (!hydrated || samples.length === 0) return;
    if (!aId || !samples.some((s) => s.id === aId)) setAId(samples[0].id);
    if (!bId || !samples.some((s) => s.id === bId)) setBId(samples[Math.min(1, samples.length - 1)].id);
  }, [hydrated, samples, aId, bId]);

  const sampleA = samples.find((s) => s.id === aId) ?? null;
  const sampleB = samples.find((s) => s.id === bId) ?? null;
  const resA = useMemo(() => (sampleA ? analyseSample(sampleA) : null), [sampleA]);
  const resB = useMemo(() => (sampleB ? analyseSample(sampleB) : null), [sampleB]);
  const rows = useMemo(() => (resA && resB ? buildRows(resA, resB) : []), [resA, resB]);

  function loadDemoPair() {
    const ids: string[] = [];
    for (const fid of DEMO_PAIR) {
      const fixture = FIXTURES.find((f) => f.id === fid);
      if (!fixture) continue;
      const { sample } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
      const id = newSampleId();
      addSample({ ...sample, id, title: fixture.label });
      ids.push(id);
    }
    if (ids.length === 2) {
      setAId(ids[0]);
      setBId(ids[1]);
      log("load_fixture", "Loaded the demonstration comparison pair.");
    }
  }

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  let lastGroup = "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compare two samples</h1>
          <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
            Side-by-side measures for, e.g., baseline vs. follow-up, or two elicitation contexts. Δ is
            B minus A. Compare like with like: sample length, context and language all move these numbers.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={loadDemoPair}>Load demo pair</button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={rows.length === 0}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {samples.length < 2 && (
        <div className="notice notice-info no-print">
          You need at least two samples. Click <strong>Load demo pair</strong> to try it with two original
          demonstration transcripts, or import your own on the <Link href="/" style={{ textDecoration: "underline" }}>dashboard</Link>.
        </div>
      )}

      {samples.length >= 1 && (
        <section className="card no-print grid gap-3 p-4 sm:grid-cols-2">
          {([["A", aId, setAId], ["B", bId, setBId]] as const).map(([lab, val, set]) => (
            <label key={lab} className="block">
              <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>Sample {lab}</span>
              <select className="select" value={val} onChange={(e) => set(e.target.value)}>
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({getPack(s.language).name})
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
      )}

      {sampleA && sampleB && resA && resB && (
        <>
          {sampleA.language !== sampleB.language && (
            <div className="notice notice-warn">
              These samples are in different languages ({getPack(sampleA.language).name} vs.{" "}
              {getPack(sampleB.language).name}). Language-specific measures are not directly comparable.
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Measure</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                      A · {sampleA.title}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">
                      B · {sampleB.title}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Δ (B − A)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const va = r.a?.value ?? null;
                    const vb = r.b?.value ?? null;
                    const delta = va !== null && vb !== null ? Math.round((vb - va) * 100) / 100 : null;
                    const showGroup = r.group !== lastGroup;
                    lastGroup = r.group;
                    const experimental = r.a?.status === "experimental" || r.b?.status === "experimental";
                    return [
                      showGroup ? (
                        <tr key={`g-${r.group}`}>
                          <td
                            colSpan={4}
                            className="border-t px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider"
                            style={{ borderColor: "var(--border)", color: "var(--accent-text)" }}
                          >
                            {r.group}
                          </td>
                        </tr>
                      ) : null,
                      <tr key={r.key} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-4 py-2">
                          <span title={GLOSSARY_BY_KEY[r.key]?.short}>{r.label}</span>
                          {r.unit && <span className="text-xs" style={{ color: "var(--text-muted)" }}> · {r.unit}</span>}
                          {experimental && <span className="badge badge-experimental ml-2">experimental</span>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(r.a)}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold">{fmt(r.b)}</td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums ${delta === null || delta === 0 ? "" : delta > 0 ? "delta-up" : "delta-down"}`}
                        >
                          {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                        </td>
                      </tr>,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Analysis sets: A = {resA.analysisSetSize}, B = {resB.analysisSetSize} complete and intelligible
            verbal utterances. Δ colour only shows direction; it is not a judgement of improvement.
          </p>
        </>
      )}
    </div>
  );
}
