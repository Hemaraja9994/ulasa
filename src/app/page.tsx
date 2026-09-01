"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { newSampleId, SUPPORTED_LANGUAGES, useStore } from "@/store/useStore";
import { parseSaltText } from "@/core/io/salt";
import { parseChat } from "@/core/io/chat";
import { FIXTURES } from "@/data/fixtures";
import { analysisSet } from "@/core/analyse";
import { Hydrated } from "@/components/Hydrated";
import { getPack } from "@/nlp/registry";
import type { Bcp47, ElicitationContext } from "@/core/types";

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

  async function handleFile(file: File) {
    const text = await file.text();
    const isChat = file.name.endsWith(".cha") || text.trimStart().startsWith("@UTF8");

    if (file.name.endsWith(".json")) {
      try {
        const parsed = JSON.parse(text);
        const sample = parsed.sample ?? parsed;
        addSample({ ...sample, id: newSampleId() });
        setImportWarnings([]);
        log("import", `Imported ULASA JSON "${file.name}".`);
        router.push("/studio");
        return;
      } catch {
        setImportWarnings([`"${file.name}" is not a readable ULASA JSON file.`]);
        return;
      }
    }

    const { sample, warnings } = isChat
      ? parseChat(text)
      : parseSaltText(text, { language, title: file.name });

    addSample({ ...sample, id: newSampleId(), title: sample.title || file.name });
    setImportWarnings(warnings);
    log("import", `Imported ${isChat ? "CHAT" : "SALT-style"} transcript "${file.name}".`);
    router.push("/studio");
  }

  return (
    <div className="space-y-8">
      {/* --- Upfront Hero Section -------------------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-red-950/60 bg-gradient-to-b from-[#161720] to-[#0d0e13] p-6 md:p-8 shadow-2xl shadow-black/80">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-800/40 bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-400 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            Universal Language Assessment & Sample Analysis
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Clinician-Grade <span className="bg-gradient-to-r from-red-400 via-red-500 to-rose-400 bg-clip-text text-transparent">Language Analysis</span>
          </h1>
          <p className="text-sm md:text-base leading-relaxed text-gray-300">
            Transcribe, score, and generate comprehensive clinical reports with first-class Indic morphosyntax. 
            Runs 100% locally in your browser with zero latency, complete patient privacy, and no licence fees.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
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
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-xs font-medium text-neutral-300 shadow-sm"
              >
                <span className="font-mono text-[10px] font-bold text-red-400">{lang.code}</span>
                <span>{lang.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --- New sample ----------------------------------------------------- */}
      <section className="card card-glow p-5 md:p-6 border-red-950/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-1 rounded bg-red-500"></div>
          <h2 className="text-base font-bold tracking-tight text-white">Start New Sample</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
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
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
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
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
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

          <div className="flex items-end gap-2">
            <button className="btn btn-primary flex-1 justify-center py-2 text-sm" onClick={createBlank}>
              Create Sample
            </button>
            <button className="btn py-2 text-sm" onClick={() => fileRef.current?.click()} title="Import SALT, CHAT, or ULASA JSON">
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.slt,.cha,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Supported import formats: SALT-style text (.txt), CHAT (.cha), and ULASA JSON.
        </p>
      </section>

      {importWarnings.length > 0 && (
        <div className="notice notice-warn">
          <strong>Import notes</strong>
          <ul className="mt-1 list-disc pl-5">
            {importWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Existing samples ----------------------------------------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Your samples</h2>
        <Hydrated>
        {samples.length === 0 ? (
          <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
            <p>No samples yet.</p>
            <p className="mt-1 text-sm">
              Create one above, or load a demonstration sample below to see the whole workflow.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                  <th className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--border)" }}>Title</th>
                  <th className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--border)" }}>Language</th>
                  <th className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--border)" }}>Context</th>
                  <th className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--border)" }}>Analysis set</th>
                  <th className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--border)" }}></th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample) => {
                  const set = analysisSet(sample);
                  const pack = getPack(sample.language);
                  return (
                    <tr key={sample.id}>
                      <td className="border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
                        <button
                          className="text-left font-medium"
                          style={{ color: "var(--accent-text)" }}
                          onClick={() => {
                            setActiveSample(sample.id);
                            router.push("/studio");
                          }}
                        >
                          {sample.title}
                        </button>
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
                        {pack.name}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        {sample.elicitationContext.replace(/_/g, " ")}
                      </td>
                      <td className="border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
                        {set.length}
                        {set.length > 0 && set.length < 50 && (
                          <span className="badge badge-experimental ml-2">short</span>
                        )}
                      </td>
                      <td className="border-b px-3 py-2 text-right" style={{ borderColor: "var(--border)" }}>
                        <button
                          className="btn"
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                          onClick={() => {
                            if (confirm(`Delete "${sample.title}"? This cannot be undone.`)) {
                              deleteSample(sample.id);
                              log("delete_sample", `Deleted "${sample.title}".`);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </Hydrated>
      </section>

      {/* --- Fixtures -------------------------------------------------------- */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-3 w-1 rounded bg-red-500"></div>
          <h2 className="text-base font-bold tracking-tight text-white">Demonstration Samples</h2>
        </div>
        <p className="mb-4 text-sm text-neutral-400">
          Original transcripts written specifically for ULASA. Contains no copyrighted materials or real child recordings.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIXTURES.map((fixture) => (
            <button
              key={fixture.id}
              className="group card p-4 text-left transition-all hover:border-red-500/50 hover:bg-neutral-900/90 hover:shadow-lg hover:shadow-red-950/40"
              onClick={() => loadFixture(fixture.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-white group-hover:text-red-400 transition-colors">
                  {fixture.label}
                </span>
                <span className="badge badge-local text-[10px] font-mono">{fixture.language}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                {fixture.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-red-400 opacity-80 group-hover:opacity-100">
                <span>Load transcript</span>
                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold">What runs without any key or account</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--accent-text)" }}>
              Free, always, offline
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Transcription studio with SALT-style conventions</li>
              <li>MLU-w, NTW, NDW, TTR, MATTR, MTLD, HD-D</li>
              <li>Intelligibility, maze inventory, speaking rate</li>
              <li>Clausal density and error inventory</li>
              <li>Narrative, expository and persuasion rubrics</li>
              <li>PDF, DOCX, CSV, CHAT and SALT export</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Optional assistance you switch on yourself
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Local sidecar: faster-whisper drafts, IndicTrans2 gloss — free, no key</li>
              <li>Bhashini / ULCA — free developer registration</li>
              <li>Google Cloud — needs your own billing account; never the default</li>
            </ul>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Cloud services are off until you enable them in{" "}
              <Link href="/settings" style={{ color: "var(--accent-text)" }}>
                Settings
              </Link>
              . If a free quota runs out, ULASA falls back to local — it never starts billing quietly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
