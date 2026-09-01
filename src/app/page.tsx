"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { newSampleId, SUPPORTED_LANGUAGES, useHydrated, useStore } from "@/store/useStore";
import { parseSaltText } from "@/core/io/salt";
import { parseChat } from "@/core/io/chat";
import { FIXTURES } from "@/data/fixtures";
import { analysisSet } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { mlu, round } from "@/core/measures";
import { Hydrated } from "@/components/Hydrated";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Dropzone } from "@/components/Dropzone";
import { EmptyState } from "@/components/EmptyState";
import { FilterChips, FilterChipOption } from "@/components/FilterChips";
import { SamplesTable, SamplesTableSkeleton } from "@/components/SamplesTable";
import { LanguageBadge, langRailColor, scriptTextProps } from "@/components/LanguageBadge";
import { exportUlasaJson } from "@/reports/export";
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

const CAPABILITIES = [
  "MLU in words (MLU-w)",
  "NDW and NDW-50",
  "TTR and MATTR-50",
  "MTLD and HD-D",
  "SD of utterance length",
  "Maze rate and verbal facility",
  "Percent grammatical utterances",
  "Clausal density and intelligibility",
];

function Workbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const samples = useStore((s) => s.samples);
  const activeSampleId = useStore((s) => s.activeSampleId);
  const addSample = useStore((s) => s.addSample);
  const deleteSample = useStore((s) => s.deleteSample);
  const setActiveSample = useStore((s) => s.setActiveSample);
  const log = useStore((s) => s.log);
  const hasHydrated = useHydrated();

  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<Bcp47>("en-IN");
  const [context, setContext] = useState<ElicitationContext>("conversation");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Sample | null>(null);

  // The filter lives in the URL so a filtered view can be shared or bookmarked.
  const filter = searchParams.get("lang") ?? "all";
  const setFilter = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("lang");
      else params.set("lang", next);
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  function createBlank() {
    const id = newSampleId();
    const name = title.trim() || "Untitled sample";
    addSample({
      id,
      caseId: "unassigned",
      title: name,
      language,
      elicitationContext: context,
      speakers: [
        { id: "spk-0", code: "C", role: "child", isTarget: true },
        { id: "spk-1", code: "E", role: "examiner", isTarget: false },
      ],
      utterances: [],
    });
    log("create_sample", `Created "${name}" in ${language}.`);
    setTitle("");
    // The clinical path is Workbench → Elicitation → Studio → Analyse → Report,
    // so a new sample goes to Elicitation, not straight to the editor.
    router.push("/elicitation");
  }

  function loadFixture(fixtureId: string) {
    const fixture = FIXTURES.find((f) => f.id === fixtureId);
    if (!fixture) return;
    const { sample, warnings } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
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

      const { sample, warnings } = isChat ? parseChat(text) : parseSaltText(text, { language, title: file.name });
      addSample({ ...sample, id: newSampleId(), title: sample.title || file.name });
      if (warnings.length > 0) allWarnings.push(...warnings);
      log("import", `Imported ${isChat ? "CHAT" : "SALT-style"} transcript "${file.name}".`);
    }
    setImportWarnings(allWarnings);
    if (files.length === 1) router.push("/studio");
  }

  const filterOptions: FilterChipOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    samples.forEach((s) => {
      counts[s.language] = (counts[s.language] || 0) + 1;
    });
    const opts: FilterChipOption[] = [
      { id: "all", label: "All", count: samples.length },
      { id: "recent", label: "Recent" },
    ];
    SUPPORTED_LANGUAGES.forEach((l) => {
      if (counts[l.id]) {
        opts.push({
          id: l.id,
          label: l.label.split(" — ")[0],
          count: counts[l.id],
          dotColor: langRailColor(l.id),
        });
      }
    });
    return opts;
  }, [samples]);

  const filteredSamples = useMemo(() => {
    let list = samples;
    if (filter !== "all" && filter !== "recent") list = list.filter((s) => s.language === filter);
    if (filter === "recent") list = [...list].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.caseId.toLowerCase().includes(q));
    }
    return list;
  }, [samples, filter, search]);

  // Real figures for the demonstration cards, from the same parser and measure
  // functions the app runs on a clinician's own samples.
  const fixtureStats = useMemo(() => {
    const stats: Record<string, { utteranceCount: number; mluW: number | null }> = {};
    for (const fixture of FIXTURES) {
      const { sample } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
      const set = analysisSet(sample);
      stats[fixture.id] = {
        utteranceCount: sample.utterances.length,
        mluW: set.length > 0 ? round(mlu(set.map((u) => countableWords(u.tokens).length))) : null,
      };
    }
    return stats;
  }, []);

  function openSample(sample: Sample) {
    setActiveSample(sample.id);
    router.push("/studio");
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
          Workbench
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {hasHydrated
            ? `${samples.length} sample${samples.length === 1 ? "" : "s"} in this browser. Nothing is stored anywhere else.`
            : "Samples in this browser. Nothing is stored anywhere else."}
        </p>
      </section>

      {/* Command band */}
      <section className="card overflow-hidden">
        <div className="grid items-end gap-3.5 p-4 md:p-[18px] lg:grid-cols-[1.7fr_1fr_1.2fr_auto]">
          <label className="block">
            <span className="meta-label mb-1.5 block">Sample title</span>
            <input
              className="input min-h-[46px] md:min-h-0"
              style={{ fontSize: "15px" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Case 014 — baseline"
              {...scriptTextProps(language)}
            />
          </label>

          <label className="block">
            <span className="meta-label mb-1.5 block">Language</span>
            <select
              className="select min-h-[46px] font-medium md:min-h-0"
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
            <span className="meta-label mb-1.5 block">Elicitation context</span>
            <select
              className="select min-h-[46px] font-medium md:min-h-0"
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

          <div className="flex items-center gap-2.5">
            <button type="button" className="btn btn-primary min-h-[46px] flex-1 md:min-h-0 lg:flex-none" onClick={createBlank}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create sample
            </button>
            <button
              type="button"
              className="btn min-h-[46px] flex-1 md:min-h-0 lg:flex-none"
              onClick={() => fileRef.current?.click()}
              title="Import SALT, CHAT, or ULASA JSON"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Import file
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
          </div>
        </div>

        <div className="grid gap-3.5 px-4 pb-4 md:px-[18px] md:pb-[16px] lg:grid-cols-[1fr_210px] lg:items-center">
          <Dropzone onFiles={(files) => void handleFiles(files)} />
          <p className="text-[12.5px] leading-normal" style={{ color: "var(--text-muted)" }}>
            Parsers unchanged. A malformed file reports the line it failed on.
          </p>
        </div>
      </section>

      {importWarnings.length > 0 && (
        <div className="notice notice-warn">
          <strong>Import notes:</strong>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Case table */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
              Your samples
            </h2>
            {samples.length > 0 && <FilterChips options={filterOptions} activeId={filter} onChange={setFilter} />}
          </div>
          {samples.length > 0 && (
            <label
              className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 sm:w-[210px]"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or case code"
                aria-label="Search samples by title or case code"
                className="w-full bg-transparent text-[13px] outline-none"
                style={{ color: "var(--text)" }}
              />
            </label>
          )}
        </div>

        <Hydrated fallback={<SamplesTableSkeleton />}>
          {samples.length === 0 ? (
            <EmptyState
              art="brackets"
              heading="No samples yet"
              body="Create one above, import a .txt / .cha / .json, or open a demonstration sample."
            />
          ) : filteredSamples.length === 0 ? (
            <EmptyState
              art="brackets"
              heading="Nothing matches this filter"
              body="No sample matches the current language filter and search."
              action={
                <button type="button" className="btn" onClick={() => { setFilter("all"); setSearch(""); }}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <SamplesTable
              samples={filteredSamples}
              activeSampleId={activeSampleId}
              onOpen={openSample}
              onExport={(sample) => exportUlasaJson(sample, null)}
              onDelete={setDeleteTarget}
            />
          )}
        </Hydrated>
      </section>

      {/* Demonstration samples */}
      <section className="space-y-3">
        <div>
          <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
            Demonstration samples
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            Synthetic transcripts for training and for testing a language pack. Opening one does not touch your cases.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIXTURES.map((fixture) => {
            const tags = FEATURE_TAGS[fixture.id] || [];
            const stats = fixtureStats[fixture.id];

            return (
              <div
                key={fixture.id}
                role="button"
                tabIndex={0}
                className="card flex cursor-pointer flex-col justify-between p-4 text-left"
                style={{ borderTop: `3px solid ${langRailColor(fixture.language)}` }}
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
                    <h3 className="text-[16px] font-semibold leading-snug" style={{ color: "var(--text)" }} {...scriptTextProps(fixture.language)}>
                      {fixture.label}
                    </h3>
                    <LanguageBadge lang={fixture.language} />
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {fixture.description}
                  </p>
                </div>

                <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[5px] px-2 py-0.5 text-[11.5px]"
                          style={{ background: "var(--chip-neutral)", color: "var(--chip-neutral-text)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {stats && (
                    <div className="mono num text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {stats.utteranceCount} utt{stats.mluW !== null ? ` · MLU-w ${stats.mluW}` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Capabilities + privacy */}
      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="card p-5">
          <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
            Computed on this device
          </h2>
          <p className="mb-3.5 mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            Every measure below is a pure function over your transcript. Status follows the language pack, not the marketing.
          </p>
          <ul className="grid grid-cols-1 gap-2 text-[13.5px] sm:grid-cols-2" style={{ color: "var(--text)" }}>
            {CAPABILITIES.map((label) => (
              <li key={label} className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12l6 6L20 6" />
                </svg>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3.5 flex items-center gap-2 border-t pt-3.5 text-[13.5px]" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
              style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)" }}
            >
              EXPERIMENTAL
            </span>
            <span>MLU in morphemes, where the pack has no published morpheme protocol</span>
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)" }}>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" style={{ color: "var(--accent-text)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 4v6c0 5-4 7.5-8 9-4-1.5-8-4-8-9V7l8-4z" />
              <path d="M9 12.5l2 2 4.5-4.5" strokeLinecap="round" />
            </svg>
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--accent-text)" }}>
              Privacy and the local engine
            </h2>
          </div>
          <p className="mt-2.5 text-sm" style={{ color: "var(--accent-text)" }}>
            Nothing is sent to any ULASA server, because there is no ULASA server.
          </p>
          <ul className="mt-3 space-y-1.5 text-[13.5px]" style={{ color: "var(--accent-text)" }}>
            {[
              "Transcripts live in this browser’s localStorage. Audio lives in IndexedDB.",
              "No account, no telemetry, no analytics script.",
              "The optional sidecar runs on 127.0.0.1 and is announced in the chip above when reachable.",
              "Cloud ASR and translation are off. Arming one requires a typed confirmation and turns the chip red.",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="font-bold" style={{ color: "var(--accent)" }}>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center rounded-lg border px-3.5 py-2 text-[13.5px] font-semibold no-underline"
            style={{ borderColor: "var(--accent)", background: "var(--surface)", color: "var(--accent-text)" }}
          >
            Review privacy settings
          </Link>
        </div>
      </section>

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        sample={deleteTarget}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSample(deleteTarget.id);
          log("delete_sample", `Deleted "${deleteTarget.title}".`);
          setDeleteTarget(null);
        }}
        onExportThenDelete={() => {
          if (!deleteTarget) return;
          exportUlasaJson(deleteTarget, null);
          deleteSample(deleteTarget.id);
          log("delete_sample", `Exported and deleted "${deleteTarget.title}".`);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  // useSearchParams needs a Suspense boundary in a statically exported app.
  return (
    <Suspense fallback={<SamplesTableSkeleton />}>
      <Workbench />
    </Suspense>
  );
}
