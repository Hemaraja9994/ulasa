"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROTOCOLS } from "@/data/protocols";
import { getPack } from "@/nlp/registry";
import { useActiveSample, useStore } from "@/store/useStore";
import { EmptyState } from "@/components/EmptyState";
import { Recorder } from "@/components/Recorder";
import { scriptTextProps } from "@/components/LanguageBadge";
import { formatTime } from "@/lib/audio";
import type { Bcp47 } from "@/core/types";

/**
 * Elicitation — the step the old build had a nav link for and no route.
 *
 * The sample you collect sets a ceiling on everything downstream, so this
 * screen is about the session itself: which protocol, what to say, how long it
 * ran, and what the examiner noticed. Prompts are shown in the sample's own
 * language, verbatim from the protocol — never translated at runtime, because
 * an improvised translation changes the task, and a changed task changes the
 * sample.
 */

interface Note {
  at: number;
  label: string;
}

const NOTE_CHIPS = ["Prompt given", "Off topic", "Interruption", "Parent present"];

export default function ElicitationPage() {
  const router = useRouter();
  const sample = useActiveSample();
  const cases = useStore((s) => s.cases);
  const updateSample = useStore((s) => s.updateSample);
  const log = useStore((s) => s.log);

  const [protocolId, setProtocolId] = useState<string>(PROTOCOLS[0].id);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The protocol that matches the sample's own elicitation context leads.
  useEffect(() => {
    if (!sample) return;
    const match = PROTOCOLS.find((p) => p.context === sample.elicitationContext);
    if (match) setProtocolId(match.id);
  }, [sample]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const protocol = useMemo(
    () => PROTOCOLS.find((p) => p.id === protocolId) ?? PROTOCOLS[0],
    [protocolId],
  );

  if (!sample) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Elicitation</h1>
        <EmptyState
          art="brackets"
          heading="No sample is open"
          body="Elicitation records the session against a sample: which protocol you ran, how long it took, and what you noticed. Create or open one first."
          action={
            <button type="button" className="btn btn-primary" onClick={() => router.push("/")}>
              Go to the Workbench
            </button>
          }
        />
      </div>
    );
  }

  const lang = sample.language as Bcp47;
  const pack = getPack(lang);
  const caseRecord = cases.find((c) => c.id === sample.caseId);
  const prompts = protocol.prompts[lang] ?? protocol.prompts["en-IN"] ?? [];

  function addNote(label: string) {
    setNotes((n) => [...n, { at: elapsed, label }]);
  }

  function sendToStudio() {
    // Elapsed time is what makes the rate measures possible, so it is stored
    // with the sample rather than left on this screen.
    updateSample(sample!.id, {
      elapsedSeconds: elapsed > 0 ? elapsed : sample!.elapsedSeconds,
      elicitationContext: protocol.context,
      contextNote: notes.length
        ? notes.map((n) => `${formatTime(n.at)} · ${n.label}`).join("\n")
        : sample!.contextNote,
    });
    log("elicitation", `Ran the "${protocol.label}" protocol for ${formatTime(elapsed)}.`);
    router.push("/studio");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            Elicitation
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Run the protocol, keep the clock, note what happened. Everything here stays in this browser.
          </p>
        </div>
        <button type="button" className="btn btn-primary min-h-12 w-full sm:w-auto" onClick={sendToStudio}>
          Send to Studio
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[300px_1fr_320px]">
        {/* Protocol list */}
        <div className="card overflow-hidden">
          <div className="meta-label border-b px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
            Protocol
          </div>
          <div role="radiogroup" aria-label="Elicitation protocol">
            {PROTOCOLS.map((p) => {
              const selected = p.id === protocol.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProtocolId(p.id)}
                  className="block w-full px-3.5 py-2.5 text-left"
                  style={{
                    borderBottom: "1px solid var(--row-rule)",
                    borderLeft: selected ? "3px solid var(--accent)" : "3px solid transparent",
                    background: selected ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <span className={`block text-[14.5px] ${selected ? "font-semibold" : "font-medium"}`} style={{ color: "var(--text)" }}>
                    {p.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                    {p.ageRange} · {p.duration} · {p.minimumSet}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stimulus, script, notes */}
        <div className="flex flex-col gap-3.5">
          <div className="card p-[18px]">
            <div className="mb-3 flex items-center justify-between gap-3.5">
              <span className="meta-label">Stimulus and examiner script</span>
              <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                {pack.name} · {protocol.label}
              </span>
            </div>

            <div
              className="flex h-[190px] items-center justify-center rounded-[10px] border"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="max-w-sm px-4 text-center">
                <svg width="60" height="46" viewBox="0 0 80 60" fill="none" className="mx-auto mb-1.5" aria-hidden="true">
                  <rect x="4" y="4" width="72" height="52" rx="6" stroke="var(--border-strong)" strokeWidth="2" />
                  <path d="M14 44l16-18 12 12 9-8 15 14" stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="26" cy="19" r="5" stroke="var(--border-strong)" strokeWidth="2" />
                </svg>
                <p className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
                  Stimulus slot — ULASA ships no picture set. Use a wordless sequence the clinic owns or created.
                </p>
              </div>
            </div>

            <div className="mt-3 border-l-[3px] pl-3" style={{ borderColor: "var(--border-strong)" }}>
              <div className="meta-label mb-1">
                Say to the child · <span className="mono normal-case tracking-normal">{lang}</span> prompts, verbatim from the protocol
              </div>
              {prompts.map((prompt) => (
                <p key={prompt} className="text-[17px]" style={{ color: "var(--text)" }} {...scriptTextProps(lang)}>
                  {prompt}
                </p>
              ))}
              {protocol.donts[0] && (
                <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                  {protocol.donts[0]}
                </p>
              )}
            </div>
          </div>

          <div className="card p-[18px]">
            <div className="meta-label mb-3">Live notes — examiner</div>
            <div className="flex flex-wrap gap-2">
              {NOTE_CHIPS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addNote(label.toLowerCase())}
                  className="min-h-11 rounded-full border px-3 text-[13px] md:min-h-0 md:py-1.5"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  + {label}
                </button>
              ))}
            </div>
            <div className="mono mt-3 space-y-0.5 text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {notes.length === 0 ? (
                <span style={{ color: "var(--text-faint)" }}>
                  Notes are timestamped against the clock and saved with the sample.
                </span>
              ) : (
                notes.map((n, i) => (
                  <div key={i}>
                    {formatTime(n.at)} · {n.label}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Timer, recorder, header */}
        <div className="flex flex-col gap-3.5">
          <div className="card p-[18px] text-center">
            <div className="meta-label">Elapsed</div>
            <div className="mono num my-1 text-[44px] font-semibold leading-none tracking-[-0.02em]" style={{ color: "var(--text)" }} aria-live="off">
              {formatTime(elapsed)}
            </div>
            <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
              Rate measures need elapsed time. It is recorded with the sample.
            </p>
            <div className="mt-3.5 flex gap-2">
              {running ? (
                <>
                  <button
                    type="button"
                    className="min-h-11 flex-1 rounded-lg border p-2.5 text-[13.5px] font-semibold"
                    style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", color: "var(--danger-text)" }}
                    onClick={() => setRunning(false)}
                  >
                    Stop
                  </button>
                  <button type="button" className="btn min-h-11 flex-1" onClick={() => setRunning(false)}>
                    Pause
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-primary min-h-11 flex-1" onClick={() => setRunning(true)}>
                    {elapsed > 0 ? "Resume" : "Start"}
                  </button>
                  {elapsed > 0 && (
                    <button type="button" className="btn min-h-11 flex-1" onClick={() => { setElapsed(0); setNotes([]); }}>
                      Reset
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <Recorder
            audioKey={sample.audioKey ?? `audio-${sample.id}`}
            onRecorded={(seconds) => {
              updateSample(sample.id, {
                audioKey: sample.audioKey ?? `audio-${sample.id}`,
                elapsedSeconds: sample.elapsedSeconds ?? seconds,
              });
            }}
          />

          <div className="card p-[18px]">
            <div className="meta-label mb-2.5">Sample header</div>
            <dl className="flex flex-col gap-2.5 text-[13.5px]">
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--text-muted)" }}>Case</dt>
                <dd className="mono">{sample.caseId === "unassigned" ? "—" : sample.caseId.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--text-muted)" }}>Age</dt>
                <dd className="mono num">
                  {caseRecord?.ageYears !== undefined
                    ? `${caseRecord.ageYears};${String(caseRecord.ageMonths ?? 0).padStart(2, "0")}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--text-muted)" }}>Language</dt>
                <dd className="text-right">
                  {pack.name}
                  {caseRecord?.region ? ` · ${caseRecord.region}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--text-muted)" }}>Speakers</dt>
                <dd className="text-right">
                  {sample.speakers.map((s) => `${s.code}${s.isTarget ? " (target)" : ""}`).join(", ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt style={{ color: "var(--text-muted)" }}>Consent recorded</dt>
                <dd className="font-semibold" style={{ color: caseRecord?.consentRecorded ? "var(--accent-text)" : "var(--warn-text)" }}>
                  {caseRecord?.consentRecorded ? "Yes" : "Not recorded"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
