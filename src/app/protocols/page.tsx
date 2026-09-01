"use client";

import { useState } from "react";
import { PROTOCOLS } from "@/data/protocols";
import { SUPPORTED_LANGUAGES } from "@/store/useStore";
import { getPack } from "@/nlp/registry";
import type { Bcp47 } from "@/core/types";

export default function Protocols() {
  const [language, setLanguage] = useState<Bcp47>("en-IN");
  const [open, setOpen] = useState<string | null>(PROTOCOLS[0].id);
  const pack = getPack(language);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Elicitation workbench</h1>
          <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
            The sample you collect sets a ceiling on everything downstream. These protocol cards
            carry prompts in all six languages so you are not translating at the moment of asking —
            an improvised translation changes the task, and a changed task changes the sample.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--text-muted)" }}>Prompts in</span>
          <select
            className="select"
            style={{ width: "auto" }}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Bcp47)}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="notice notice-info">
        <strong>{pack.name} — how a C-unit is defined here.</strong> {pack.cUnitNotes}
      </div>

      <div className="space-y-3">
        {PROTOCOLS.map((protocol) => {
          const expanded = open === protocol.id;
          const prompts = protocol.prompts[language] ?? protocol.prompts["en-IN"];
          return (
            <section key={protocol.id} className="card overflow-hidden">
              <button
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setOpen(expanded ? null : protocol.id)}
                aria-expanded={expanded}
              >
                <span>
                  <span className="block font-semibold">{protocol.label}</span>
                  <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                    {protocol.ageRange} · {protocol.duration} · minimum {protocol.minimumSet}
                  </span>
                </span>
                <span style={{ color: "var(--text-muted)" }}>{expanded ? "−" : "+"}</span>
              </button>

              {expanded && (
                <div className="space-y-4 border-t px-4 py-4" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm">{protocol.purpose}</p>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Prompts — {pack.name}
                    </h3>
                    <ul className={`mt-1.5 space-y-1 ${pack.script === "Latin" ? "" : "indic"}`}>
                      {prompts.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span style={{ color: "var(--text-muted)" }}>·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-text)" }}>
                        Do
                      </h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
                        {protocol.dos.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--danger)" }}>
                        Do not
                      </h3>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
                        {protocol.donts.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Measures this protocol supports
                    </h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {protocol.supports.map((s) => (
                        <span key={s} className="badge badge-local">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Stimuli</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          ULASA bundles no picture stimuli. The Frog-story sequences and comparable published sets
          are copyrighted, and the Cookie Theft scene assumes a kitchen many Indian children have
          never seen. Where a protocol needs a picture, use one your clinic owns or has created — a
          busy market, a classroom, a railway platform, a festival — and record which one you used,
          because a retell is only comparable against the same stimulus.
        </p>
      </section>
    </div>
  );
}
