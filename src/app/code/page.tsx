"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analysisSet, estimateClauses, targetUtterances } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { getPack } from "@/nlp/registry";
import { UtteranceTokens, isInsertion } from "@/components/UtteranceTokens";
import type { Grammaticality, Utterance } from "@/core/types";

/**
 * Coding: one row per target-speaker utterance for grammaticality (feeds PGU),
 * clause overrides (replace the heuristic) and error codes from the pack.
 *
 * Keyboard: ↑ / ↓ move between rows, G marks grammatical, U ungrammatical,
 * N clears the mark. Keys are ignored while typing in an input or select.
 */

const COLS = "52px minmax(0,1fr) 60px 150px 80px 220px";

const MAZE_KIND: Record<string, string> = {
  repetition: "repetition",
  revision: "revision",
  filled_pause: "filled pause",
  false_start: "false start",
};

export default function Code() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const replaceUtterances = useStore((s) => s.replaceUtterances);
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rows = useMemo(() => (sample ? targetUtterances(sample) : []), [sample]);
  const pack = sample ? getPack(sample.language) : null;

  const patch = useCallback(
    (id: string, changes: Partial<Utterance>) => {
      if (!sample) return;
      replaceUtterances(sample.id, sample.utterances.map((u) => (u.id === id ? { ...u, ...changes } : u)));
    },
    [sample, replaceUtterances],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (rows.length === 0) return;
      const key = e.key.toLowerCase();
      if (key === "arrowdown" || key === "arrowup") {
        e.preventDefault();
        setActive((i) => Math.max(0, Math.min(rows.length - 1, i + (key === "arrowdown" ? 1 : -1))));
      } else if (key === "g" || key === "u" || key === "n") {
        const u = rows[active];
        if (!u) return;
        const value: Grammaticality = key === "g" ? "grammatical" : key === "u" ? "ungrammatical" : "unmarked";
        patch(u.id, { grammaticality: value });
        if (key !== "n") setActive((i) => Math.min(rows.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, active, patch]);

  useEffect(() => {
    rowRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!hydrated) {
    return <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading…</div>;
  }
  if (!sample || !pack) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">No sample selected</h1>
        <Link href="/" className="btn btn-primary mt-4 no-underline">Go to Home</Link>
      </div>
    );
  }

  // PGU is computed over the C&I analysis set, exactly as the engine does.
  const set = analysisSet(sample);
  const marked = set.filter((u) => u.grammaticality !== "unmarked");
  const grammatical = set.filter((u) => u.grammaticality === "grammatical").length;
  const pgu = marked.length ? `${Math.round((grammatical / marked.length) * 1000) / 10}%` : "—";

  function markAll() {
    if (!sample) return;
    const ids = new Set(rows.filter((u) => u.grammaticality === "unmarked").map((u) => u.id));
    replaceUtterances(sample.id, sample.utterances.map((u) => (ids.has(u.id) ? { ...u, grammaticality: "grammatical" } : u)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 font-semibold" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Code utterances</h1>
          <p className="m-0 mt-1" style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Only the target speaker&apos;s utterances are scored. Marking grammaticality is what enables PGU; a
            clause override replaces the heuristic count.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex flex-col items-end gap-[5px]">
            <span style={{ fontSize: 13 }}>
              <b className="tnum">{marked.length}</b> of {set.length} marked · PGU <b>{pgu}</b>
            </span>
            <div className="h-1.5 w-[200px] overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }} aria-hidden="true">
              <div className="h-full rounded-full" style={{ background: "var(--accent)", width: `${set.length ? (marked.length / set.length) * 100 : 0}%` }} />
            </div>
          </div>
          <button type="button" className="btn" style={{ fontSize: 13.5, padding: "8px 12px" }} onClick={markAll} disabled={rows.every((u) => u.grammaticality !== "unmarked")}>
            Mark unmarked as grammatical
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
          Nothing to code yet. <Link href="/studio">Type a transcript first.</Link>
        </div>
      ) : (
        <div className="panel hscroll overflow-hidden">
          <div className="hscroll-inner" style={{ minWidth: 900 }}>
            <div className="trow-head caps" style={{ gridTemplateColumns: COLS, gap: 14 }}>
              <span>#</span><span>Utterance</span><span className="text-right">Words</span><span>Grammatical</span><span>Clauses</span><span>Codes &amp; flags</span>
            </div>
            <div className="max-h-[620px] overflow-auto" role="list" aria-label="Target utterances">
              {rows.map((u, i) => {
                const words = countableWords(u.tokens).length;
                const insertions = u.tokens.filter((t) => isInsertion(t, pack.id)).length;
                const isActive = i === active;
                return (
                  <div
                    key={u.id}
                    ref={(el) => { rowRefs.current[i] = el; }}
                    role="listitem"
                    aria-current={isActive ? "true" : undefined}
                    className="trow"
                    style={{
                      gridTemplateColumns: COLS,
                      gap: 14,
                      padding: "8px 18px",
                      background: u.grammaticality === "ungrammatical" ? "var(--danger-tint)" : "transparent",
                      boxShadow: isActive ? "inset 3px 0 0 var(--accent)" : undefined,
                      opacity: u.isAbandoned ? 0.6 : 1,
                    }}
                    onClick={() => setActive(i)}
                  >
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>C{i + 1}</span>
                    <UtteranceTokens tokens={u.tokens} matrixLang={pack.id} />
                    <span className="mono text-right" style={{ fontSize: 13 }}>{words}</span>
                    <GramControl value={u.grammaticality} onChange={(g) => { setActive(i); patch(u.id, { grammaticality: g }); }} />
                    <input
                      className="input mono"
                      style={{ width: 56, fontSize: 13, padding: "5px 8px", borderRadius: 6 }}
                      type="number"
                      min={0}
                      aria-label={`Clauses in utterance C${i + 1}`}
                      placeholder={String(estimateClauses({ ...u, clauseCountOverride: undefined }, pack))}
                      value={u.clauseCountOverride ?? ""}
                      onChange={(e) => patch(u.id, { clauseCountOverride: e.target.value === "" ? undefined : Number(e.target.value) })}
                    />
                    <div className="flex flex-wrap items-center gap-[5px]">
                      {u.mazes.map((m, k) => (
                        <span key={k} className="flag" style={{ background: "var(--saffron-soft)", color: "var(--saffron-text)" }}>maze · {MAZE_KIND[m.kind]}</span>
                      ))}
                      {insertions > 0 && (
                        <span className="flag" style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}>
                          {insertions} insertion{insertions === 1 ? "" : "s"}
                        </span>
                      )}
                      {u.intelligibility !== "intelligible" && (
                        <span className="flag" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{u.intelligibility}</span>
                      )}
                      {u.isAbandoned && <span className="flag" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>abandoned</span>}
                      {(u.codes ?? []).map((code) => (
                        <button
                          key={code}
                          type="button"
                          className="flag"
                          style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)", border: 0, cursor: "pointer" }}
                          title="Remove this code"
                          onClick={() => patch(u.id, { codes: (u.codes ?? []).filter((c) => c !== code) })}
                        >
                          {code} ×
                        </button>
                      ))}
                      <select
                        className="add-code"
                        aria-label={`Add a code to utterance C${i + 1}`}
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__abandoned") patch(u.id, { isAbandoned: !u.isAbandoned });
                          else if (v) patch(u.id, { codes: [...new Set([...(u.codes ?? []), v])] });
                        }}
                      >
                        <option value="">+ code</option>
                        <optgroup label={`${pack.name} error codes`}>
                          {pack.errorTaxonomy.map((err) => (
                            <option key={err.code} value={err.code}>{err.code} — {err.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Utterance">
                          <option value="__abandoned">{u.isAbandoned ? "Not abandoned" : "Abandoned / interrupted"}</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-[18px] gap-y-2" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        <span><kbd>G</kbd> grammatical</span>
        <span><kbd>U</kbd> ungrammatical</span>
        <span><kbd>N</kbd> clear</span>
        <span><kbd>↑ ↓</kbd> move</span>
        <span>
          {pack.script === "Latin"
            ? "Code against the child's own dialect of English, not a written standard."
            : `Spoken ${pack.name} forms are the expected register and are never coded against the written standard. Code-mixing is never an error.`}
        </span>
      </div>
    </div>
  );
}

function GramControl({ value, onChange }: { value: Grammaticality; onChange: (g: Grammaticality) => void }) {
  const opts: { v: Grammaticality; label: string; title: string; color: string }[] = [
    { v: "grammatical", label: "✓", title: "Grammatical (G)", color: "var(--ok-text)" },
    { v: "ungrammatical", label: "✕", title: "Ungrammatical (U)", color: "var(--danger-text)" },
    { v: "unmarked", label: "–", title: "Not marked (N)", color: "var(--text)" },
  ];
  return (
    <div className="flex gap-[3px] rounded-[7px] p-0.5" style={{ background: "var(--surface-2)" }} role="radiogroup" aria-label="Grammaticality">
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={(e) => { e.stopPropagation(); onChange(o.v); }}
            className="flex-1 rounded-[5px] border-0 py-1 font-semibold"
            style={{ fontSize: 13, cursor: "pointer", background: on ? "var(--surface)" : "transparent", color: on ? o.color : "var(--text-muted)" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
