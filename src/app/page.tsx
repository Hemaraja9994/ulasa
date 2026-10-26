"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES, useStore } from "@/store/useStore";
import { INPUT_METHODS } from "@/lib/inputMethods";
import { parseSaltText } from "@/core/io/salt";
import { FIXTURES } from "@/data/fixtures";
import { analyseSample, analysisSet } from "@/core/analyse";
import { Hydrated } from "@/components/Hydrated";
import { getPack } from "@/nlp/registry";
import { CONTEXT_LABELS, contextLabel, formatDate } from "@/lib/format";
import { useSampleActions } from "@/lib/useSampleActions";
import { findMeasure } from "@/lib/measures";
import type { Bcp47, ElicitationContext } from "@/core/types";

/** Feature tags for the demonstration cards. */
const DEMO_TAGS: Record<string, string[]> = {
  "en-preschool": ["Mazes", "Overregularisation"],
  "hi-conversation": ["Postpositions", "Code-mixing"],
  "kn-conversation": ["Diglossia", "Quotative ಅಂತ"],
  "ta-narrative": ["Agglutination", "Narrative"],
  "te-narrative": ["PNG agreement", "Narrative"],
  "ml-conversation": ["No agreement", "Sandhi"],
  bilingual: ["Code-mixing", "Classroom talk"],
  unintelligible: ["Intelligibility", "X · XXX"],
  short: ["Below 50 utterances"],
};

const RECENT_COLS = "minmax(0,1.6fr) 1fr 1fr 1.1fr 0.8fr 0.8fr 90px";

export default function Home() {
  const router = useRouter();
  const samples = useStore((s) => s.samples);
  const setActiveSample = useStore((s) => s.setActiveSample);
  const inputMethod = useStore((s) => s.inputMethod);
  const setInputMethod = useStore((s) => s.setInputMethod);
  const { createBlank, loadFixture, importFiles } = useSampleActions();

  const fileRef = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState("");
  const [language, setLanguage] = useState<Bcp47>("kn-IN");
  const [context, setContext] = useState<ElicitationContext>("conversation");
  const [importNotes, setImportNotes] = useState<string[]>([]);

  const demos = useMemo(
    () =>
      FIXTURES.map((f) => {
        const { sample } = parseSaltText(f.text, { language: f.language as Bcp47 });
        const target = sample.speakers.find((s) => s.isTarget);
        const first = sample.utterances.find((u) => u.speakerId === target?.id);
        return { ...f, line: first?.text ?? f.description, tags: DEMO_TAGS[f.id] ?? [] };
      }),
    [],
  );

  const recent = useMemo(
    () =>
      samples.slice(0, 5).map((s) => {
        const analysis = analyseSample(s);
        return {
          sample: s,
          n: analysisSet(s).length,
          mlu: findMeasure(analysis, "mlu_w")?.value ?? null,
          ndw: findMeasure(analysis, "ndw")?.value ?? null,
        };
      }),
    [samples],
  );

  function create() {
    if (inputMethod === "import") {
      fileRef.current?.click();
      return;
    }
    createBlank({ caseId, language, context });
  }

  function open(id: string) {
    setActiveSample(id);
    router.push("/analyse");
  }

  return (
    <div className="flex flex-col gap-10">
      {/* --- hero + new sample ------------------------------------------- */}
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5 pt-3">
          <span className="eyebrow self-start" style={{ fontSize: 11.5, letterSpacing: "0.07em", padding: "4px 10px" }}>
            Free · open source · runs in your browser
          </span>
          <h1 className="m-0 font-bold" style={{ fontSize: "clamp(32px, 4.4vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.03em", textWrap: "pretty" }}>
            Language sample analysis for English and five Indian languages
          </h1>
          <p className="m-0 max-w-[560px]" style={{ fontSize: 18, lineHeight: 1.6, color: "var(--text-muted)", textWrap: "pretty" }}>
            Transcribe or import a sample, get standard LSA measures with every number linked to the
            utterances behind it, track change across sessions and export a clinical report.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Supported languages">
            {SUPPORTED_LANGUAGES.map((l) => {
              const pack = getPack(l.id);
              return (
                <li key={l.id} className="flex items-baseline gap-1.5 rounded-full border px-3 py-1.5" style={{ background: "var(--surface)", borderColor: "var(--border)", fontSize: 14 }}>
                  <span className="font-semibold">{pack.nativeName}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{pack.name}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a href="#new-sample" className="btn btn-primary btn-lg no-underline" style={{ fontSize: 15, padding: "12px 20px" }}>
              Start a sample
            </a>
            <button type="button" className="btn btn-lg" style={{ fontSize: 15, padding: "12px 20px" }} onClick={() => loadFixture("kn-conversation", "/analyse")}>
              Open the Kannada demo
            </button>
          </div>
        </div>

        <section
          id="new-sample"
          className="flex scroll-mt-24 flex-col gap-4 rounded-[14px] border p-[22px]"
          style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 1px 3px rgba(20,22,43,.05)" }}
          aria-labelledby="new-sample-title"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="new-sample-title" className="m-0 font-semibold" style={{ fontSize: 17 }}>New sample</h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No name needed · de-identified by default</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex flex-col gap-[5px] font-medium" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Case ID
              <input className="input" style={{ fontSize: 15 }} placeholder="e.g. Case 034" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
            </label>
            <label className="flex flex-col gap-[5px] font-medium" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              Elicitation context
              <select className="select" style={{ fontSize: 15 }} value={context} onChange={(e) => setContext(e.target.value as ElicitationContext)}>
                {Object.entries(CONTEXT_LABELS).filter(([k]) => k !== "other").map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-medium" style={{ fontSize: 12.5, color: "var(--text-muted)" }} id="pack-label">Language pack</span>
            <div className="seg grid grid-cols-3 gap-1 sm:grid-cols-6" role="group" aria-labelledby="pack-label">
              {SUPPORTED_LANGUAGES.map((l) => {
                const pack = getPack(l.id);
                return (
                  <button key={l.id} type="button" className="seg-btn" style={{ padding: "7px 4px", fontSize: 14, fontWeight: 600 }} aria-pressed={language === l.id} title={pack.name} onClick={() => setLanguage(l.id)}>
                    {pack.nativeName}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-medium" style={{ fontSize: 12.5, color: "var(--text-muted)" }} id="method-label">How will the sample come in?</span>
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="method-label">
              {INPUT_METHODS.map((m) => {
                const on = inputMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInputMethod(m.id)}
                    className="flex flex-col gap-0.5 rounded-[10px] border px-3.5 py-3 text-left transition-colors"
                    style={{ background: on ? "var(--accent-soft)" : "var(--surface)", borderColor: on ? "var(--accent-mid)" : "var(--border)", cursor: "pointer" }}
                  >
                    <span className="font-semibold" style={{ fontSize: 14.5 }}>{m.label}</span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-muted)" }}>{m.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button type="button" className="btn btn-primary" style={{ fontSize: 15, padding: 11, borderRadius: 9 }} onClick={create}>
            {inputMethod === "import" ? "Choose a file to import" : "Create sample and open Studio"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.slt,.cha,.json"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void importFiles(files, { caseId, language }).then(setImportNotes);
              e.target.value = "";
            }}
          />
        </section>
      </section>

      {importNotes.length > 0 && (
        <div className="notice notice-warn">
          <strong>Import notes</strong>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {importNotes.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* --- recent samples ---------------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="recent-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="recent-title" className="m-0 font-semibold" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>Recent samples</h2>
          <button type="button" className="link-btn" style={{ fontSize: 14 }} onClick={() => router.push("/clients")}>
            All clients and sessions →
          </button>
        </div>
        <Hydrated>
          {recent.length === 0 ? (
            <div className="panel p-8 text-center" style={{ color: "var(--text-muted)" }}>
              <p className="m-0 font-medium" style={{ color: "var(--text)" }}>No samples yet</p>
              <p className="m-0 mt-1 text-sm">Create one above, or open a demonstration sample below.</p>
            </div>
          ) : (
            <div className="panel hscroll overflow-hidden">
              <div className="hscroll-inner">
                <div className="trow-head caps" style={{ gridTemplateColumns: RECENT_COLS }}>
                  <span>Sample</span><span>Language</span><span>Context</span><span>Analysis set</span>
                  <span className="text-right">MLU-w</span><span className="text-right">NDW</span><span />
                </div>
                {recent.map(({ sample, n, mlu, ndw }) => (
                  <div
                    key={sample.id}
                    role="link"
                    tabIndex={0}
                    className="trow trow-click"
                    style={{ gridTemplateColumns: RECENT_COLS }}
                    onClick={() => open(sample.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") open(sample.id); }}
                    aria-label={`Open ${sample.title} in Analyse`}
                  >
                    <span className="flex min-w-0 flex-col" style={{ lineHeight: 1.35 }}>
                      <span className="truncate font-semibold">{sample.title}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(sample.recordedAt)}</span>
                    </span>
                    <span>{getPack(sample.language).name}</span>
                    <span><span className="pill pill-neutral">{contextLabel(sample.elicitationContext)}</span></span>
                    <span className="flex items-center gap-2">
                      <span className="tnum font-semibold">{n}</span>
                      {n > 0 && n < 50 && <span className="pill pill-short" title="Below the 50-utterance convention">SHORT</span>}
                    </span>
                    <span className="tnum text-right">{mlu ?? "—"}</span>
                    <span className="tnum text-right">{ndw ?? "—"}</span>
                    <span className="text-right font-medium" style={{ color: "var(--accent)", fontSize: 13.5 }}>Open →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Hydrated>
      </section>

      {/* --- demonstration samples --------------------------------------- */}
      <section className="flex flex-col gap-3" aria-labelledby="demo-title">
        <div>
          <h2 id="demo-title" className="m-0 font-semibold" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>Demonstration samples</h2>
          <p className="m-0 mt-1" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
            Original transcripts written for ULASA. No copyrighted stimuli and no real child recordings.
          </p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => loadFixture(d.id)}
              className="demo-card flex flex-col gap-2.5 rounded-xl border p-[18px] text-left"
              title={d.description}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold" style={{ fontSize: 15 }}>{d.label}</span>
                <span className="mono flex-none rounded-full px-2 py-0.5 font-semibold" style={{ fontSize: 11.5, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
                  {d.language.toUpperCase()}
                </span>
              </span>
              <span style={{ fontSize: 16, lineHeight: 1.85 }}>{d.line}</span>
              <span className="flex flex-wrap gap-1.5">
                {d.tags.map((t) => (
                  <span key={t} className="rounded-md px-2 py-0.5 font-medium" style={{ fontSize: 11.5, background: "var(--surface-2)", color: "var(--text-muted)" }}>{t}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* --- trust strip -------------------------------------------------- */}
      <section className="grid gap-px overflow-hidden rounded-xl border md:grid-cols-3" style={{ background: "var(--border)", borderColor: "var(--border)" }}>
        {[
          ["Stays on this device", "Transcripts live in this browser's storage and audio in IndexedDB. There is no ULASA server to upload to."],
          ["Honest about every number", "Each measure is labelled established, experimental or unavailable for its language, with the reason written down."],
          ["Cloud is off until you turn it on", "Speech recognition and gloss run locally by default. Every off-device action is written to an audit log."],
        ].map(([title, body]) => (
          <div key={title} className="flex flex-col gap-1.5 p-5" style={{ background: "var(--surface)" }}>
            <span className="font-semibold" style={{ fontSize: 15 }}>{title}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-muted)" }}>{body}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
