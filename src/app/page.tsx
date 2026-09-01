"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { newSampleId, SUPPORTED_LANGUAGES, useHydrated, useStore } from "@/store/useStore";
import { parseSaltText } from "@/core/io/salt";
import { parseChat } from "@/core/io/chat";
import { FIXTURES } from "@/data/fixtures";
import { analysisSet } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { mlu, round } from "@/core/measures";
import { Hydrated } from "@/components/Hydrated";
import { getPack } from "@/nlp/registry";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Dropzone } from "@/components/Dropzone";
import { FilterChips, FilterChipOption } from "@/components/FilterChips";
import { exportUlasaJson } from "@/reports/export";
import { langRailColor, langBadgeCode } from "@/lib/langColor";
import { timeAgo } from "@/lib/relativeTime";
import type { Bcp47, ElicitationContext, Sample } from "@/core/types";

const MIN_ANALYSIS_SET = 50;

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

/** Small icon-button used for the Export / Delete row actions. */
function IconButton({
  title,
  danger,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg border transition-colors"
      style={{ borderColor: "var(--border)", background: "var(--surface)", color: danger ? "var(--danger)" : "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

function AnalysisSetPill({ setSize }: { setSize: number }) {
  if (setSize === 0) {
    return <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
  }
  const isShort = setSize < MIN_ANALYSIS_SET;
  if (isShort) {
    return (
      <span
        className="badge badge-warn num"
        title={`Fewer than ${MIN_ANALYSIS_SET} complete and intelligible utterances. Diversity measures are unstable at this length.`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 3l9 17H3z" />
          <path d="M12 9v5M12 17.5v.5" />
        </svg>
        {setSize} SHORT
      </span>
    );
  }
  return (
    <span
      className="num inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: "var(--accent-soft)", color: "var(--accent-text)", border: "1px solid var(--accent-soft)" }}
    >
      {setSize} C&amp;I
    </span>
  );
}

export default function Dashboard() {
  const router = useRouter();
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
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  // Filter options: All, Recent, then one chip per language present, each
  // carrying that language's rail colour as its dot.
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
        opts.push({ id: l.id, label: l.label.split(" — ")[0], count: counts[l.id], dotColor: langRailColor(l.id) });
      }
    });
    return opts;
  }, [samples]);

  const filteredSamples = useMemo(() => {
    let list = samples;
    if (filter !== "all" && filter !== "recent") {
      list = list.filter((s) => s.language === filter);
    }
    if (filter === "recent") {
      list = [...list].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.caseId.toLowerCase().includes(q),
      );
    }
    return list;
  }, [samples, filter, search]);

  // Real utterance / MLU-w stats for each demonstration transcript, computed
  // once from the same SALT parser and measure functions the app uses on a
  // clinician's own samples — not mocked numbers.
  const fixtureStats = useMemo(() => {
    const stats: Record<string, { utteranceCount: number; mluW: number | null }> = {};
    for (const fixture of FIXTURES) {
      const { sample } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
      const set = analysisSet(sample);
      const wordsPerUtterance = set.map((u) => countableWords(u.tokens).length);
      stats[fixture.id] = {
        utteranceCount: sample.utterances.length,
        mluW: set.length > 0 ? round(mlu(wordsPerUtterance)) : null,
      };
    }
    return stats;
  }, []);

  return (
    <div className="space-y-6">
      {/* --- Header ----------------------------------------------------------- */}
      <section>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          Workbench
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {hasHydrated
            ? `${samples.length} sample${samples.length === 1 ? "" : "s"} in this browser. Nothing is stored anywhere else.`
            : "Samples in this browser. Nothing is stored anywhere else."}
        </p>
      </section>

      {/* --- Command band: create / import / dropzone ------------------------- */}
      <section className="card overflow-hidden">
        <div className="p-4 md:p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.2fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Sample title
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
              Language
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
              Elicitation context
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

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-primary flex-1 lg:flex-none" onClick={createBlank}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create sample
            </button>
            <button
              type="button"
              className="btn flex-1 lg:flex-none"
              onClick={() => fileRef.current?.click()}
              title="Import SALT, CHAT, or ULASA JSON"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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

        <div
          className="px-4 pb-4 md:px-5 md:pb-5 pt-4 border-t grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <Dropzone onFiles={(files) => void handleFiles(files)} />
          <p className="text-xs leading-relaxed lg:max-w-[220px]" style={{ color: "var(--text-muted)" }}>
            Files are parsed in this tab. Nothing is uploaded. A malformed file reports the line it failed on.
          </p>
        </div>
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

      {/* --- Your samples ------------------------------------------------------ */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              Your samples
            </h2>
            {samples.length > 0 && <FilterChips options={filterOptions} activeId={filter} onChange={setFilter} />}
          </div>
          {samples.length > 0 && (
            <div
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 w-full sm:w-56"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or case code"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--text)" }}
              />
            </div>
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
              No samples match the current filter.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="card overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr style={{ background: "var(--table-header-bg)" }}>
                        {["Sample", "Language", "Context", "Utterances", "Analysis set", "Updated", "Actions"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wider ${
                                i >= 3 && i <= 4 ? "text-right" : i === 6 ? "text-right" : ""
                              }`}
                              style={{ color: "var(--table-header-text)" }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSamples.map((sample) => {
                        const set = analysisSet(sample);
                        const pack = getPack(sample.language);
                        const isActive = sample.id === activeSampleId;

                        return (
                          <tr
                            key={sample.id}
                            className="border-b last:border-b-0 transition-colors"
                            style={{ borderColor: "var(--border)", background: isActive ? "var(--surface-2)" : undefined }}
                          >
                            <td className="py-3 pr-4" style={{ borderLeft: `3px solid ${langRailColor(sample.language)}` }}>
                              <div className="pl-3 flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  className={sample.language.startsWith("kn") || sample.language.startsWith("hi") ? "indic text-left font-semibold" : "text-left font-semibold"}
                                  style={{ color: "var(--text)" }}
                                  onClick={() => {
                                    setActiveSample(sample.id);
                                    router.push("/studio");
                                  }}
                                >
                                  {sample.title}
                                </button>
                                {sample.caseId !== "unassigned" && (
                                  <span className="mono text-[11px]" style={{ color: "var(--text-faint)" }}>
                                    {sample.caseId.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="mono inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-white"
                                style={{ background: langRailColor(sample.language) }}
                              >
                                {langBadgeCode(sample.language)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{ background: "var(--surface-2)", color: "var(--context-chip-text)" }}
                              >
                                {sample.elicitationContext.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right num font-semibold" style={{ color: "var(--text)" }}>
                              {sample.utterances.length}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <AnalysisSetPill setSize={set.length} />
                            </td>
                            <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                              {timeAgo(sample.updatedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                                  style={
                                    isActive
                                      ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" }
                                      : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }
                                  }
                                  onClick={() => {
                                    setActiveSample(sample.id);
                                    router.push("/studio");
                                  }}
                                >
                                  Open
                                </button>
                                <IconButton title="Export as ULASA JSON" onClick={() => exportUlasaJson(sample, null)}>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                  </svg>
                                </IconButton>
                                <IconButton title="Delete sample" danger onClick={() => setDeleteTarget(sample)}>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                                  </svg>
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-2.5 md:hidden">
                {filteredSamples.map((sample) => {
                  const set = analysisSet(sample);
                  const isActive = sample.id === activeSampleId;
                  return (
                    <div
                      key={sample.id}
                      className="rounded-lg border p-3.5"
                      style={{
                        borderColor: "var(--border)",
                        borderLeft: `3px solid ${langRailColor(sample.language)}`,
                        background: isActive ? "var(--surface-2)" : "var(--surface)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[15px]" style={{ color: "var(--text)" }}>
                          {sample.title}
                        </span>
                        <span
                          className="mono shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ background: langRailColor(sample.language) }}
                        >
                          {langBadgeCode(sample.language)}
                        </span>
                      </div>
                      <div className="mono text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {sample.caseId !== "unassigned" ? `${sample.caseId.toUpperCase()} · ` : ""}
                        {timeAgo(sample.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold"
                          style={{ background: "var(--surface-2)", color: "var(--context-chip-text)" }}
                        >
                          {sample.elicitationContext.replace(/_/g, " ")}
                        </span>
                        <span className="num text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                          {sample.utterances.length} utt
                        </span>
                        <AnalysisSetPill setSize={set.length} />
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          className="flex-1 min-h-11 rounded-lg border text-sm font-semibold"
                          style={
                            isActive
                              ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" }
                              : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }
                          }
                          onClick={() => {
                            setActiveSample(sample.id);
                            router.push("/studio");
                          }}
                        >
                          Open
                        </button>
                        <IconButton title="Export as ULASA JSON" onClick={() => exportUlasaJson(sample, null)}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </IconButton>
                        <IconButton title="Delete sample" danger onClick={() => setDeleteTarget(sample)}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                          </svg>
                        </IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Hydrated>
      </section>

      {/* --- Demonstration samples --------------------------------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Demonstration samples
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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
                className="card p-4 text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
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
                    <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--text)" }}>
                      {fixture.label}
                    </h3>
                    <span
                      className="mono shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-white"
                      style={{ background: langRailColor(fixture.language) }}
                    >
                      {langBadgeCode(fixture.language)}
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
                  {stats && (
                    <div className="mono num text-[11px]" style={{ color: "var(--text-faint)" }}>
                      {stats.utteranceCount} utt{stats.mluW !== null ? ` · MLU-w ${stats.mluW}` : ""}
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

      {/* --- Computed on this device + Privacy --------------------------------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Computed on this device
          </h2>
          <p className="text-xs pb-3" style={{ color: "var(--text-muted)" }}>
            Every measure below is a pure function over your transcript. Status follows the language pack, not the marketing.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13.5px]" style={{ color: "var(--text)" }}>
            {[
              "MLU in words (MLU-w)",
              "NDW and NDW-50",
              "TTR, MATTR-50",
              "MTLD, HD-D",
              "SD of utterance length",
              "Maze rate, verbal facility",
              "Percent grammatical utterances",
              "Clausal density, intelligibility",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l6 6L20 6" />
                </svg>
                <span>{label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 sm:col-span-2">
              <span
                className="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold tracking-wide"
                style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)" }}
              >
                EXPERIMENTAL
              </span>
              <span>MLU in morphemes for packs with no published morpheme protocol</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" style={{ color: "var(--accent-text)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M12 3l8 4v6c0 5-4 7.5-8 9-4-1.5-8-4-8-9V7l8-4z" />
              <path d="M9 12.5l2 2 4.5-4.5" strokeLinecap="round" />
            </svg>
            <h2 className="text-lg font-semibold" style={{ color: "var(--accent-text)" }}>
              Privacy and the local engine
            </h2>
          </div>
          <p className="text-sm" style={{ color: "var(--accent-text)" }}>
            Nothing is sent to any ULASA server, because there is no ULASA server.
          </p>
          <ul className="space-y-1.5 text-[13.5px]" style={{ color: "var(--accent-text)" }}>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: "var(--accent)" }}>·</span>
              <span>Transcripts live in this browser&rsquo;s localStorage. Audio lives in IndexedDB.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: "var(--accent)" }}>·</span>
              <span>No account, no telemetry, no analytics script.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: "var(--accent)" }}>·</span>
              <span>The optional sidecar runs on 127.0.0.1 and is announced in the chip above when reachable.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: "var(--accent)" }}>·</span>
              <span>Cloud ASR and translation are off. Arming one requires a typed confirmation and turns the chip red.</span>
            </li>
          </ul>
          <Link
            href="/settings"
            className="inline-flex items-center rounded-lg border px-3.5 py-2 text-[13.5px] font-semibold no-underline"
            style={{ borderColor: "var(--accent)", background: "var(--surface)", color: "var(--accent-text)" }}
          >
            Review privacy settings
          </Link>
        </div>
      </section>

      {/* --- Delete Confirmation Modal ------------------------------------------ */}
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
