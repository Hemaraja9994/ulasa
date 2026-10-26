"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { LocalSidecarService } from "@/integrations/languageService";
import { PACKS } from "@/nlp/registry";
import { WHISPER_MODELS, type WhisperSize } from "@/integrations/browserWhisper";

export default function Settings() {
  const cloud = useStore((s) => s.cloud);
  const setCloud = useStore((s) => s.setCloud);
  const audit = useStore((s) => s.audit);
  const clearAll = useStore((s) => s.clearAll);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const log = useStore((s) => s.log);

  const [sidecarStatus, setSidecarStatus] = useState<"unknown" | "up" | "down">("unknown");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  async function checkSidecar() {
    setSidecarStatus("unknown");
    const ok = await new LocalSidecarService(cloud.sidecarUrl).available();
    setSidecarStatus(ok ? "up" : "down");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
          ULASA runs entirely in this browser. Everything below is off unless you switch it on, and
          nothing you switch on changes how a measure is computed.
        </p>
      </div>

      {/* --- privacy posture ------------------------------------------------ */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold">Where your data is</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
          <li>Transcripts, case records and reports: this browser&apos;s local storage.</li>
          <li>Audio: this browser&apos;s IndexedDB, deletable separately from the transcript.</li>
          <li>Nothing is sent to any ULASA server, because there is no ULASA server.</li>
          <li>
            Clearing your browser data erases everything. Export what you need to keep — the JSON
            export is lossless.
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: "var(--text-muted)" }}>Appearance</span>
            <select
              className="select"
              style={{ width: "auto" }}
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
            >
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button
            className="btn"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            onClick={() => {
              if (confirm("Erase every case, sample, rubric and report stored in this browser? This cannot be undone.")) {
                clearAll();
              }
            }}
          >
            Erase all local data
          </button>
        </div>
      </section>

      {/* --- in-browser speech recognition ----------------------------------- */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Speech recognition in this browser</h2>
            <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
              OpenAI Whisper running inside the browser (transformers.js / ONNX Runtime, WebGPU when
              available, otherwise WebAssembly). Audio is processed on this device and is not uploaded;
              the model weights are downloaded once from the Hugging Face CDN and cached by the browser.
              Used when the local sidecar is off or not answering. Output is always a draft to check.
            </p>
          </div>
          <span className="badge badge-local">on this device</span>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>Engine</span>
            <select
              className="select"
              style={{ width: "auto" }}
              value={cloud.asrEngine ?? "whisper"}
              onChange={(e) => {
                setCloud({ asrEngine: e.target.value as "whisper" | "none" });
                log("settings", `In-browser speech recognition ${e.target.value === "whisper" ? "enabled" : "disabled"}.`);
              }}
            >
              <option value="whisper">In-browser Whisper (default)</option>
              <option value="none">Off — type transcripts manually</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>Model size</span>
            <select
              className="select"
              style={{ width: "auto" }}
              value={cloud.whisperModel ?? "base"}
              disabled={(cloud.asrEngine ?? "whisper") !== "whisper"}
              onChange={(e) => setCloud({ whisperModel: e.target.value as WhisperSize })}
            >
              {(Object.keys(WHISPER_MODELS) as WhisperSize[]).map((k) => (
                <option key={k} value={k}>{WHISPER_MODELS[k].label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Accuracy (our quick test on clear synthetic adult speech): English is good on every size.
          Tamil is fair on tiny/base. Hindi is poor (base can switch to Urdu script; small is better
          but mixes in romanised words). Kannada, Telugu and Malayalam are unreliable on all three
          sizes and can produce the wrong script or repeated text. Child and clinical speech will
          be harder. Always review the draft.
        </p>
      </section>

      {/* --- local sidecar --------------------------------------------------- */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Local sidecar — free, no key, no quota</h2>
            <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
              A small Python service you run on this machine, giving speech-recognition drafts
              (faster-whisper) and English gloss (IndicTrans2) with no account and no network egress.
              Setup instructions are in <code className="mono">sidecar/README.md</code> in the
              repository.
            </p>
          </div>
          <span className="badge badge-local">recommended</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Sidecar address
            </span>
            <input
              className="input mono"
              value={cloud.sidecarUrl}
              onChange={(e) => setCloud({ sidecarUrl: e.target.value })}
            />
          </label>
          <button className="btn" onClick={() => void checkSidecar()}>Test connection</button>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input
              type="checkbox"
              checked={cloud.sidecarEnabled}
              onChange={(e) => {
                setCloud({ sidecarEnabled: e.target.checked });
                log("settings", `Local sidecar ${e.target.checked ? "enabled" : "disabled"}.`);
              }}
            />
            Use it
          </label>
        </div>

        {sidecarStatus !== "unknown" && (
          <div className={`notice mt-3 ${sidecarStatus === "up" ? "notice-info" : "notice-warn"}`}>
            {sidecarStatus === "up"
              ? "The sidecar answered. Speech recognition and gloss translation will run locally."
              : "No sidecar answered at that address. Start it, or leave it off — every clinical measure works without it."}
          </div>
        )}
      </section>

      {/* --- cloud ----------------------------------------------------------- */}
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Cloud services — optional</h2>
            <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
              Turning this on means audio or text leaves this device. ULASA falls back to local when
              a service is unavailable; it never falls forward to a paid one.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cloud.enabled}
              onChange={(e) => {
                setCloud({ enabled: e.target.checked });
                log(
                  "settings",
                  `Cloud services ${e.target.checked ? "enabled" : "disabled"}.`,
                  e.target.checked,
                );
              }}
            />
            Enable
          </label>
        </div>

        <div className={cloud.enabled ? "" : "pointer-events-none opacity-45"}>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium">Bhashini / ULCA</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                India&apos;s public language stack. Registration at bhashini.gov.in is free. Its open
                endpoints are documented as proof-of-concept capacity — suitable for academic,
                government and non-commercial use. ULASA never resells Bhashini capacity and offers
                no paid tier built on it.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  className="input mono"
                  placeholder="User ID"
                  value={cloud.bhashiniUserId}
                  onChange={(e) => setCloud({ bhashiniUserId: e.target.value })}
                />
                <input
                  className="input mono"
                  type="password"
                  placeholder="API key"
                  value={cloud.bhashiniApiKey}
                  onChange={(e) => setCloud({ bhashiniApiKey: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium">Google Cloud Translation</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                The first 500,000 characters a month are free, but Google requires an active billing
                account even inside that allowance — a misconfigured project can start charging.
                ULASA never selects this provider automatically.
              </p>
              <input
                className="input mono mt-2"
                type="password"
                placeholder="API key"
                value={cloud.googleApiKey}
                onChange={(e) => setCloud({ googleApiKey: e.target.value })}
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={cloud.redactBeforeSending}
                onChange={(e) => setCloud({ redactBeforeSending: e.target.checked })}
              />
              <span>
                Redact phone numbers, email addresses and long ID numbers before any external call.
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  Leave this on. It is a pattern-based safety net, not a guarantee — the real
                  protection is not putting identifiers in the transcript.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="notice notice-warn mt-4">
          API keys you enter here are stored in this browser&apos;s local storage on this device.
          That is convenient and it is not a secret store. On a shared clinic machine, leave the
          cloud switched off and use the local sidecar.
        </div>
      </section>

      {/* --- language packs -------------------------------------------------- */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold">Language packs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                {["Language", "Script", "Family", "Morpheme protocol", "Error codes"].map((h) => (
                  <th key={h} className="border-b px-2 py-1.5 font-medium" style={{ borderColor: "var(--border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PACKS.map((pack) => (
                <tr key={pack.id}>
                  <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
                    {pack.name} <span style={{ color: "var(--text-muted)" }}>{pack.nativeName}</span>
                  </td>
                  <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>{pack.script}</td>
                  <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>{pack.family}</td>
                  <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
                    {pack.morphemeProtocol === "published" ? (
                      <span className="badge badge-local">published</span>
                    ) : (
                      <span className="badge badge-experimental">{pack.morphemeProtocol}</span>
                    )}
                  </td>
                  <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
                    {pack.errorTaxonomy.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Only English has a published clinical morpheme-counting protocol. For the five Indian
          languages, MLU in morphemes is reported as experimental wherever it appears, and MLU in
          words is the primary length measure.
        </p>
      </section>

      {/* --- audit log ------------------------------------------------------- */}
      <section className="card p-4">
        <h2 className="text-sm font-semibold">Audit log</h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          Recent activity in this browser. Entries marked <em>external</em> sent data off the device.
        </p>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Nothing recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {audit.slice(0, 40).map((entry, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(entry.at).toLocaleString()}
                </span>
                {entry.external && <span className="badge badge-experimental">external</span>}
                <span>{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
