"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GLOSSARY, SALT_DOCS_URL } from "@/data/glossary";

export default function Glossary() {
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter((g) =>
      [g.term, g.short, g.detail ?? "", g.key].some((t) => t.toLowerCase().includes(needle)),
    );
  }, [q]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metric glossary</h1>
          <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
            What each number on the Analyse screen means, with the usual source for further reading.
            Transcription conventions follow SALT where noted; see the{" "}
            <a href={SALT_DOCS_URL} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              SALT Software documentation
            </a>{" "}
            for the full convention set.
          </p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search measures (e.g. MLU, maze)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the glossary"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((g) => (
          <article key={g.key} id={g.key} className="card p-4 scroll-mt-24">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{g.term}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>{g.short}</p>
            {g.detail && (
              <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{g.detail}</p>
            )}
            {g.reference && (
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="font-semibold" style={{ color: "var(--saffron-text)" }}>Reference:</span> {g.reference}
              </p>
            )}
          </article>
        ))}
        {items.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No measure matches &ldquo;{q}&rdquo;.</p>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        ULASA quantifies language production to support a qualified professional; it does not diagnose.{" "}
        <Link href="/analyse" style={{ color: "var(--accent)" }}>Back to Analyse</Link>
      </p>
    </div>
  );
}
