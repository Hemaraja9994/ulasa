"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { newSampleId, SUPPORTED_LANGUAGES, useStore } from "@/store/useStore";
import { parseSaltText } from "@/core/io/salt";
import { parseChat } from "@/core/io/chat";
import { FIXTURES } from "@/data/fixtures";
import { analysisSet } from "@/core/analyse";
import { Hydrated } from "@/components/Hydrated";
import { getPack } from "@/nlp/registry";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Dropzone } from "@/components/Dropzone";
import { FilterChips, FilterChipOption } from "@/components/FilterChips";
import { exportUlasaJson, exportSalt, exportChat } from "@/reports/export";
import type { Bcp47, ElicitationContext, Sample } from "@/core/types";

const FEATURE_TAGS: Record<string, string[]> = {
  "en-preschool": ["Mazes", "Developmental errors", "WPM"],
  "hi-conversation": ["Ergative ने", "Postposition case", "Code-mixing"],
  "kn-conversation": ["Spoken register", "PNG cues", "Clausal density"],
  "ta-narrative": ["Agglutination", "Participles", "Connectives"],
  "te-narrative": ["Mahat agreement", "Quotative అని", "Switch points"],
  "ml-conversation": ["Tense-only suffixes", "No agreement", "Sandhi"],
  bilingual: ["Dense code-mixing", "Switch points", "Classroom register"],
  unintelligible: ["Intelligibility %", "X / XXX markers", "NDW filter"],
  short: ["SHORT warning", "Under 50 utt.", "Norm block"],
};

export default function Dashboard() {
  const router = useRouter();
  const samples = useStore((s) => s.samples);
  const addSample = useStore((s) => s.addSample);
  const deleteSample = useStore((s) => s.deleteSample);
  const setActiveSample = useStore((s) => s.setActiveSample);
  const log = useStore((s) => s.log);

  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<Bcp47>("en-IN");
  const [context, setContext] = useState<ElicitationContext>("conversation");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [showDropzone, setShowDropzone] = useState(false);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Sample | null>(null);

  function createBlank() {
    const id = newSampleId();
    addSample({
      id,
      caseId: "unassigned",
      title: title.trim() || "Untitled sample",
      language,
      elicitationContext: context,
      speakers: [
        { id: "spk-0", code: "C", role: "child", isTarget: true },
        { id: "spk-1", code: "E", role: "examiner", isTarget: false },
      ],
      utterances: [],
    });
    log("create_sample", `Created "${title.trim() || "Untitled sample"}" in ${language}.`);
    setTitle("");
    router.push("/studio");
  }

  function loadFixture(fixtureId: string) {
    const fixture = FIXTURES.find((f) => f.id === fixtureId);
    if (!fixture) return;
    const { sample, warnings } = parseSaltText(fixture.text, {
      language: fixture.language as Bcp47,
    });
    addSample({ ...sample, id: newSampleId(), title: fixture.label });
    setImportWarnings(warnings);
    log("load_fixture", `Loaded the "${fixture.label}" demonstration sample.`);
    router.push("/studio");
  }

  async function handleFiles(files: File[]) {
    const allWarnings: string[] = [];
    for (const file of files) {
      const text = await file.text();
      const isChat = file.name.endsWith(".cha") || text.trimStart().startsWith("@UTF8");

      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          const sample = parsed.sample ?? parsed;
          addSample({ ...sample, id: newSampleId() });
          log("import", `Imported ULASA JSON "${file.name}".`);
        } catch {
          allWarnings.push(`"${file.name}" is not a readable ULASA JSON file.`);
        }
        continue;
      }

      const { sample, warnings } = isChat
        ? parseChat(text)
        : parseSaltText(text, { language, title: file.name });

      addSample({ ...sample, id: newSampleId(), title: sample.title || file.name });
      if (warnings.length > 0) allWarnings.push(...warnings);
      log("import", `Imported ${isChat ? "CHAT" : "SALT-style"} transcript "${file.name}".`);
    }
    setImportWarnings(allWarnings);
    if (files.length === 1) {
      router.push("/studio");
    }
  }

  // Filter options for samples table
  const filterOptions: FilterChipOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    samples.forEach((s) => {
      counts[s.language] = (counts[s.language] || 0) + 1;
    });

    const opts: FilterChipOption[] = [{ id: "all", label: "All Samples", count: samples.length }];
    SUPPORTED_LANGUAGES.forEach((l) => {
      if (counts[l.id]) {
        opts.push({ id: l.id, label: l.label, count: counts[l.id] });
      }
    });
    return opts;
  }, [samples]);

  const filteredSamples = useMemo(() => {
    if (filter === "all") return samples;
    return samples.filter((s) => s.language === filter);
  }, [samples, filter]);

  function getContextBadgeColor(ctx: ElicitationContext) {
    switch (ctx) {
      case "conversation":
        return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
      case "play":
        return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300";
      case "narrative_retell":
      case "personal_narrative":
        return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300";
      case "expository":
      case "persuasion":
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
      default:
        return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    }
  }

  return (
    <div className="space-y-8">
      {/* --- Clinical Header ------------------------------------------------ */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Language Sample Analysis
            </h1>
            <p className="mt-1 max-w-3xl text-sm" style={{ color: "var(--text-muted)" }}>
              Clinician-grade transcription, morphosyntactic scoring, and report generation for English and five Indian languages.
              Runs 100% on-device in your browser.
            </p>
          </div>
        </div>

        {/* Supported language pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { code: "EN", name: "English (India)" },
            { code: "HI", name: "हिन्दी Hindi" },
            { code: "KN", name: "ಕನ್ನಡ Kannada" },
            { code: "TA", name: "தமிழ் Tamil" },
            { code: "TE", name: "తెలుగు Telugu" },
            { code: "ML", name: "മലയാളം Malayalam" },
          ].map((lang) => (
            <span
              key={lang.code}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-medium"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
              }}
            >
              <span className="font-mono text-[10px] font-bold" style={{ color: "var(--accent)" }}>
                {lang.code}
              </span>
              <span>{lang.name}</span>
            </span>
          ))}
        </div>
      </section>

      {/* --- Start / Import Sample ------------------------------------------ */}
      <section className="card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Start a Sample
          </h2>
          <button
            type="button"
            className="text-xs font-medium underline"
            style={{ color: "var(--accent)" }}
            onClick={() => setShowDropzone((v) => !v)}
          >
            {showDropzone ? "Hide batch dropzone" : "Batch dropzone"}
          </button>
        </div>

        {/* 3-Column Inline Form */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Sample Title
            </span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Case 014 — baseline"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Language Pack
            </span>
            <select
              className="select font-medium"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Bcp47)}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Elicitation Context
            </span>
            <select
              className="select font-medium"
              value={context}
              onChange={(e) => setContext(e.target.value as ElicitationContext)}
            >
              <option value="conversation">Conversation</option>
              <option value="play">Play</option>
              <option value="narrative_retell">Story retell</option>
              <option value="personal_narrative">Personal narrative</option>
              <option value="expository">Expository</option>
              <option value="persuasion">Persuasion</option>
              <option value="picture_description">Picture description</option>
              <option value="parent_child">Parent–child</option>
              <option value="classroom">Classroom</option>
            </select>
          </label>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Supported imports:</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">.txt (SALT)</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">.cha (CHAT)</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">.json (ULASA)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => fileRef.current?.click()}
              title="Import SALT, CHAT, or ULASA JSON"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Import File</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.slt,.cha,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFiles([file]);
                e.target.value = "";
              }}
            />

            <button type="button" className="btn btn-primary" onClick={createBlank}>
              Create Sample
            </button>
          </div>
        </div>

        {/* Collapsible Drag & Drop Zone */}
        {showDropzone && (
          <div className="pt-2">
            <Dropzone onFiles={(files) => void handleFiles(files)} />
          </div>
        )}
      </section>

      {importWarnings.length > 0 && (
        <div className="notice notice-warn">
          <strong>Import notes:</strong>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Your Samples Table --------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Your Samples
          </h2>
          {samples.length > 0 && (
            <FilterChips
              options={filterOptions}
              activeId={filter}
              onChange={setFilter}
            />
          )}
        </div>

        <Hydrated>
          {samples.length === 0 ? (
            <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }}>
              <p className="font-medium text-base" style={{ color: "var(--text)" }}>No samples recorded yet</p>
              <p className="mt-1 text-sm">
                Create a new sample above, or click a demonstration sample below to explore the clinical workflow.
              </p>
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No samples match the selected language filter.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: "var(--border)" }}>
                        Sample Title
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: "var(--border)" }}>
                        Language
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: "var(--border)" }}>
                        Context
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b" style={{ borderColor: "var(--border)" }}>
                        Analysis Set
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b text-right" style={{ borderColor: "var(--border)" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSamples.map((sample) => {
                      const set = analysisSet(sample);
                      const pack = getPack(sample.language);
                      const isShort = set.length > 0 && set.length < 50;

                      return (
                        <tr
                          key={sample.id}
                          className="hover:bg-surface-2 transition-colors border-b last:border-b-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-semibold text-left transition-colors"
                              style={{ color: "var(--accent)" }}
                              onClick={() => {
                                setActiveSample(sample.id);
                                router.push("/studio");
                              }}
                            >
                              {sample.title}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{pack.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getContextBadgeColor(sample.elicitationContext)}`}>
                              {sample.elicitationContext.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {set.length === 0 ? (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>0 utterances</span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-semibold">{set.length}</span>
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>utt.</span>
                                {isShort && (
                                  <span
                                    className="badge badge-warn"
                                    title="Standard LSA recommends at least 50 complete and intelligible verbal utterances."
                                  >
                                    ⚠️ SHORT
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "0.25rem 0.55rem", fontSize: "0.8rem" }}
                                onClick={() => {
                                  setActiveSample(sample.id);
                                  router.push("/studio");
                                }}
                                title="Open Transcription Studio"
                              >
                                Studio
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "0.25rem 0.55rem", fontSize: "0.8rem" }}
                                onClick={() => {
                                  setActiveSample(sample.id);
                                  router.push("/analyse");
                                }}
                                title="View Computed Analysis"
                              >
                                Analyse
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                                onClick={() => exportUlasaJson(sample, null)}
                                title="Export as ULASA JSON"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", color: "var(--danger)" }}
                                onClick={() => setDeleteTarget(sample)}
                                title="Delete sample"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Hydrated>
      </section>

      {/* --- Demonstration Samples Grid ------------------------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Demonstration Samples
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Original transcripts written specifically for ULASA. Contains no copyrighted materials or real child recordings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIXTURES.map((fixture) => {
            const tags = FEATURE_TAGS[fixture.id] || [];

            return (
              <div
                key={fixture.id}
                role="button"
                tabIndex={0}
                className="card p-4 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
                onClick={() => loadFixture(fixture.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    loadFixture(fixture.id);
                  }
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--text)" }}>
                      {fixture.label}
                    </h3>
                    <span className="badge badge-local font-mono text-[10px] shrink-0">
                      {fixture.language}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {fixture.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded px-1.5 py-0.2 text-[10px] font-medium"
                          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--accent)" }}>
                    <span>Load demonstration transcript</span>
                    <span>&rarr;</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- Capabilities & Privacy Trust Card ------------------------------- */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Core Capabilities */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
              Automated Clinical Metrics
            </h2>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Everything below executes locally in this browser at zero cost:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: "var(--text)" }}>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Length:</strong> MLU-w, MLU-m, SD</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Lexical:</strong> NDW, TTR, MATTR</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Diversity:</strong> MTLD, HD-D vocd</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Facility:</strong> Mazes & pauses</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Syntax:</strong> Clausal density</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Errors:</strong> Language taxonomies</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Rubrics:</strong> Narrative & Persuasion</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>
              <span><strong>Export:</strong> PDF, DOCX, CSV, SALT</span>
            </li>
          </ul>
        </div>

        {/* Privacy & Local Architecture */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
              Privacy & Local Architecture
            </h2>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Built strictly for clinical compliance and patient privacy:
          </p>
          <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <span><strong>100% On-Device:</strong> Transcripts live in localStorage; audio records in IndexedDB.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <span><strong>Zero Server Egress:</strong> No ULASA telemetry, tracking, or cloud uploads.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">✓</span>
              <span><strong>Optional Cloud:</strong> External ASR/MT is disabled by default and configurable in <Link href="/settings" style={{ color: "var(--accent)" }}>Settings</Link>.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* --- Delete Confirmation Modal -------------------------------------- */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        sampleTitle={deleteTarget?.title ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
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
