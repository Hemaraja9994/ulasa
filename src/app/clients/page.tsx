"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useHydrated, useStore } from "@/store/useStore";
import { analyseSample } from "@/core/analyse";
import { getPack } from "@/nlp/registry";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useSampleActions } from "@/lib/useSampleActions";
import { byDate, caseLabel, contextLabel, formatAge, formatDate, formatShortDate } from "@/lib/format";
import { findMeasure } from "@/lib/measures";
import { deleteAudio } from "@/lib/audio";
import type { Sample } from "@/core/types";

/**
 * Clients & sessions: samples grouped by their de-identified case ID. Cases
 * are identified by ID and age only; ULASA never asks for a name.
 */

const MIN_SET = 50;
const COLS = "1.1fr 1fr 1.1fr 0.7fr 0.8fr 0.8fr 100px 36px";

export default function Clients() {
  const router = useRouter();
  const hydrated = useHydrated();
  const samples = useStore((s) => s.samples);
  const cases = useStore((s) => s.cases);
  const activeSampleId = useStore((s) => s.activeSampleId);
  const reportDrafts = useStore((s) => s.reportDrafts);
  const setActiveSample = useStore((s) => s.setActiveSample);
  const setComparePair = useStore((s) => s.setComparePair);
  const deleteSample = useStore((s) => s.deleteSample);
  const log = useStore((s) => s.log);
  const { createBlank } = useSampleActions();

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sample | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Sample[]>();
    for (const s of samples) map.set(s.caseId, [...(map.get(s.caseId) ?? []), s]);
    return [...map.entries()]
      .map(([id, list]) => {
        const sessions = [...list].sort(byDate);
        const rec = cases.find((c) => c.code === id);
        return {
          id,
          sessions,
          languages: [...new Set(sessions.map((s) => getPack(s.language).name))],
          age: formatAge(rec?.ageYears, rec?.ageMonths),
          latest: sessions[sessions.length - 1].recordedAt ?? "",
        };
      })
      .sort((a, b) => (a.id === "unassigned" ? 1 : b.id === "unassigned" ? -1 : b.latest.localeCompare(a.latest)));
  }, [samples, cases]);

  const visible = groups.filter((g) => caseLabel(g.id).toLowerCase().includes(query.trim().toLowerCase()));
  const activeCase = samples.find((s) => s.id === activeSampleId)?.caseId;
  const current = groups.find((g) => g.id === picked) ?? groups.find((g) => g.id === activeCase) ?? groups[0] ?? null;

  const rows = useMemo(
    () =>
      (current?.sessions ?? []).map((s) => {
        const a = analyseSample(s);
        return {
          sample: s,
          n: a.analysisSetSize,
          mlu: findMeasure(a, "mlu_w")?.value ?? null,
          ndw: findMeasure(a, "ndw")?.value ?? null,
          reported: Boolean(reportDrafts[s.id]?.trim()),
        };
      }),
    [current, reportDrafts],
  );

  if (!hydrated) {
    return <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading your samples…</div>;
  }

  if (!current) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <h1 className="m-0 text-lg font-semibold">No clients yet</h1>
        <p className="m-0 text-sm" style={{ color: "var(--text-muted)" }}>Create a sample on Home with a case ID and it will appear here.</p>
        <button type="button" className="btn btn-primary" onClick={() => router.push("/")}>Go to Home</button>
      </div>
    );
  }

  const latest = current.sessions[current.sessions.length - 1];
  const maxMlu = Math.max(1, ...rows.map((r) => r.mlu ?? 0));
  const first = rows[0];
  const last = rows[rows.length - 1];
  const sameLanguage = current.sessions.every((s) => s.language === latest.language);
  const indic = getPack(latest.language).script !== "Latin";
  let trend = "One session so far";
  if (rows.length > 1 && sameLanguage && first.mlu !== null && last.mlu !== null) {
    const d = Math.round((last.mlu - first.mlu) * 100) / 100;
    trend = `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} since baseline${indic ? " · intra-child change only" : ""}`;
  } else if (rows.length > 1) {
    trend = "Sessions in different languages are not comparable";
  }

  function open(id: string) {
    setActiveSample(id);
    router.push("/analyse");
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="panel overflow-hidden" aria-label="Cases">
        <div className="border-b p-3" style={{ borderColor: "var(--border)" }}>
          <input className="input" style={{ fontSize: 14 }} placeholder="Search case IDs" aria-label="Search case IDs" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="max-h-[70vh] overflow-auto">
          {visible.length === 0 && <p className="m-0 p-4 text-sm" style={{ color: "var(--text-muted)" }}>No case matches “{query}”.</p>}
          {visible.map((g) => {
            const on = g.id === current.id;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(g.id)}
                className="flex w-full items-center justify-between gap-2.5 border-0 px-4 py-3 text-left"
                style={{ borderBottom: "1px solid var(--surface-2)", borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`, background: on ? "var(--bg)" : "var(--surface)", color: "var(--text)", cursor: "pointer" }}
              >
                <span className="flex min-w-0 flex-col" style={{ lineHeight: 1.35 }}>
                  <span className="truncate font-semibold" style={{ fontSize: 14.5 }}>{caseLabel(g.id)}</span>
                  <span className="truncate" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{[g.languages.join(", "), g.age && `age ${g.age}`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="mono flex-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {g.sessions.length} session{g.sessions.length === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 font-semibold" style={{ fontSize: 24, letterSpacing: "-0.02em" }}>{caseLabel(current.id)}</h1>
            <p className="m-0 mt-1" style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {[current.languages.join(" · "), current.age && `age ${current.age}`, `${current.sessions.length} session${current.sessions.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn"
              style={{ fontSize: 14, padding: "8px 14px" }}
              disabled={current.sessions.length < 2}
              title={current.sessions.length < 2 ? "Needs two sessions" : "Earliest session vs the latest"}
              onClick={() => {
                setComparePair({ baseline: current.sessions[0].id, followUp: latest.id });
                setActiveSample(latest.id);
                router.push("/compare");
              }}
            >
              Compare sessions
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 14, padding: "8px 14px" }}
              onClick={() => createBlank({ caseId: current.id, language: latest.language, context: latest.elicitationContext })}
            >
              New session
            </button>
          </div>
        </div>

        <div className="panel flex flex-col gap-2.5 px-5 py-[18px]">
          <div className="flex flex-wrap justify-between gap-2" style={{ fontSize: 13 }}>
            <span className="font-semibold">MLU in words across sessions</span>
            <span style={{ color: "var(--text-muted)" }}>{trend}</span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex h-[110px] items-end gap-7 border-b px-2" style={{ borderColor: "var(--border)", minWidth: "fit-content" }} role="img" aria-label="MLU in words for each session">
              {rows.map((r, i) => (
                <div key={r.sample.id} className="flex w-[72px] flex-none flex-col items-center gap-1.5">
                  <span className="tnum font-semibold" style={{ fontSize: 13 }}>{r.mlu ?? "—"}</span>
                  <div className="w-9 rounded-t-[5px]" style={{ height: r.mlu ? Math.round((r.mlu / maxMlu) * 80) : 2, background: i === rows.length - 1 ? "var(--accent)" : "var(--accent-mid)" }} />
                </div>
              ))}
            </div>
            <div className="flex gap-7 px-2 pt-1.5" style={{ minWidth: "fit-content" }}>
              {rows.map((r) => (
                <span key={r.sample.id} className="w-[72px] flex-none text-center" style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatShortDate(r.sample.recordedAt)}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel hscroll overflow-hidden">
          <div className="hscroll-inner">
            <div className="trow-head caps" style={{ gridTemplateColumns: COLS }}>
              <span>Date</span><span>Language</span><span>Context</span><span className="text-right">Utt.</span>
              <span className="text-right">MLU-w</span><span className="text-right">NDW</span><span className="text-right">Status</span><span />
            </div>
            {rows.map((r) => (
              <div
                key={r.sample.id}
                role="link"
                tabIndex={0}
                className="trow trow-click"
                style={{ gridTemplateColumns: COLS }}
                onClick={() => open(r.sample.id)}
                onKeyDown={(e) => { if (e.key === "Enter") open(r.sample.id); }}
                aria-label={`Open the ${formatDate(r.sample.recordedAt)} session in Analyse`}
              >
                <span className="flex min-w-0 flex-col" style={{ lineHeight: 1.35 }}>
                  <span className="font-semibold">{formatDate(r.sample.recordedAt)}</span>
                  <span className="truncate" style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.sample.title}</span>
                </span>
                <span>{getPack(r.sample.language).name}</span>
                <span>{contextLabel(r.sample.elicitationContext)}</span>
                <span className="tnum text-right" style={{ color: r.n < MIN_SET ? "var(--warn-text)" : "var(--text)" }} title={r.n < MIN_SET ? "Below the 50-utterance convention" : undefined}>{r.n}</span>
                <span className="tnum text-right">{r.mlu ?? "—"}</span>
                <span className="tnum text-right">{r.ndw ?? "—"}</span>
                <span className="text-right">
                  <span className="pill" style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 9px", background: r.reported ? "var(--success-soft)" : "var(--surface-2)", color: r.reported ? "var(--success-text)" : "var(--text-muted)" }}>
                    {r.reported ? "Reported" : "Draft"}
                  </span>
                </span>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border-0"
                  style={{ background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                  aria-label={`Delete the ${formatDate(r.sample.recordedAt)} session`}
                  title="Delete session"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.sample); }}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="m-0" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Cases are identified by ID only. &ldquo;Reported&rdquo; means a report summary has been drafted. Audio for each session can
          be deleted separately from its transcript in the Studio.
        </p>
      </section>

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        sampleTitle={deleteTarget?.title ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            // The audio goes with the session; nothing is left behind in IndexedDB.
            if (deleteTarget.audioKey) void deleteAudio(deleteTarget.audioKey);
            deleteSample(deleteTarget.id);
            log("delete_sample", `Deleted "${deleteTarget.title}".`);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
