"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { LocalSidecarService } from "@/integrations/languageService";
import { PACKS } from "@/nlp/registry";
import { LanguageBadge } from "@/components/LanguageBadge";
import { TypedConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Settings — Privacy first, then External providers, Language packs, and
 * Appearance.
 *
 * Arming an external provider is the one action that can send a child's
 * speech off this device, so it goes through the same typed-confirm
 * primitive as deleting a sample, and it flips store-level state so the red
 * chip appears on every route immediately, not just this one.
 */
export default function Settings() {
  const cloud = useStore((s) => s.cloud);
  const setCloud = useStore((s) => s.setCloud);
  const armProvider = useStore((s) => s.armProvider);
  const disarmProvider = useStore((s) => s.disarmProvider);
  const audit = useStore((s) => s.audit);
  const clearAll = useStore((s) => s.clearAll);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const indicSize = useStore((s) => s.indicSize);
  const setIndicSize = useStore((s) => s.setIndicSize);
  const sidecarReachable = useStore((s) => s.sidecarReachable);
  const setSidecarReachable = useStore((s) => s.setSidecarReachable);
  const log = useStore((s) => s.log);

  const [sidecarChecked, setSidecarChecked] = useState(false);
  const [armingDialog, setArmingDialog] = useState<null | { phrase: string; label: string }>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  async function checkSidecar() {
    setSidecarChecked(false);
    const ok = await new LocalSidecarService(cloud.sidecarUrl).available();
    setSidecarReachable(ok);
    setSidecarChecked(true);
  }

  const armed = cloud.enabled && cloud.armedProvider;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
          Settings
        </h1>
        <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
          Nothing is sent to any ULASA server, because there is no ULASA server.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* --- Privacy --------------------------------------------------- */}
        <section className="card space-y-3 p-4">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Privacy
          </h2>

          <div className="rounded-lg p-3.5" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                style={{ background: "var(--accent)", color: "#FFF" }}
              >
                ACTIVE
              </span>
              <span className="text-[13.5px] font-semibold" style={{ color: "var(--accent-text)" }}>
                Local engine only
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-normal" style={{ color: "var(--accent-text)" }}>
              Tokenising, measures, rubrics and exports all run as pure functions in this tab, always — arming a
              cloud provider below never changes how a measure is computed.
            </p>
          </div>

          <div className="rounded-lg border p-3.5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
                Local sidecar on 127.0.0.1
              </span>
              {sidecarChecked && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={
                    sidecarReachable
                      ? { background: "var(--accent-soft)", color: "var(--accent-text)" }
                      : { background: "var(--surface-2)", color: "var(--text-faint)" }
                  }
                >
                  {sidecarReachable ? "reachable" : "not found"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
              faster-whisper and IndicTrans2 on your own machine. Free, no key, no quota, no network egress.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <input className="input mono flex-1" style={{ minWidth: 160 }} value={cloud.sidecarUrl} onChange={(e) => setCloud({ sidecarUrl: e.target.value })} />
              <button type="button" className="btn" onClick={() => void checkSidecar()}>
                Test connection
              </button>
              <label className="flex items-center gap-1.5 text-[13px]">
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
          </div>

          <div className="rounded-lg border p-3.5" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: "var(--danger-text)" }}>
                  Clear all local data
                </div>
                <p className="text-[12px]" style={{ color: "var(--danger-text)" }}>
                  Wipes localStorage transcripts and IndexedDB audio.
                </p>
              </div>
              <button type="button" className="btn btn-danger min-h-11 shrink-0 md:min-h-0" onClick={() => setConfirmingClear(true)}>
                Clear…
              </button>
            </div>
          </div>
        </section>

        {/* --- External providers ------------------------------------------ */}
        <section className="card space-y-3 p-4">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              External providers
            </h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
              Off by default. Arming one means audio or text leaves this device. The top chip turns red on every
              page until you disarm it.
            </p>
          </div>

          {armed ? (
            <div className="rounded-lg border p-3.5" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
              <div className="text-[13.5px] font-semibold" style={{ color: "var(--danger-text)" }}>
                Armed: {cloud.armedProvider}
              </div>
              <p className="mt-1 text-[12px]" style={{ color: "var(--danger-text)" }}>
                Only new samples are affected — nothing already transcribed is sent anywhere retroactively.
              </p>
              <button
                type="button"
                className="btn btn-danger mt-2.5 min-h-11 md:min-h-0"
                onClick={() => {
                  disarmProvider();
                }}
              >
                Disarm and return to device only
              </button>
            </div>
          ) : (
            <>
              <ProviderRow
                title="Cloud ASR — Bhashini / ULCA"
                description="India's public language stack. Free registration at bhashini.gov.in. Suitable for academic and government use; ULASA never resells its capacity."
                onArm={() => { setConfirmText(""); setArmingDialog({ phrase: "BHASHINI ASR", label: "Bhashini ASR" }); }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input mono" placeholder="User ID" value={cloud.bhashiniUserId} onChange={(e) => setCloud({ bhashiniUserId: e.target.value })} />
                  <input className="input mono" type="password" placeholder="API key" value={cloud.bhashiniApiKey} onChange={(e) => setCloud({ bhashiniApiKey: e.target.value })} />
                </div>
              </ProviderRow>

              <ProviderRow
                title="Machine translation for glosses — Google Cloud"
                description="Glosses are never analysed whatever the source — they are for the examiner's comprehension. The first 500,000 characters a month are free, but Google requires an active billing account."
                onArm={() => { setConfirmText(""); setArmingDialog({ phrase: "GOOGLE TRANSLATE", label: "Google Cloud Translation" }); }}
              >
                <input className="input mono" type="password" placeholder="API key" value={cloud.googleApiKey} onChange={(e) => setCloud({ googleApiKey: e.target.value })} />
              </ProviderRow>

              <label className="flex items-start gap-2 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" className="mt-1" checked={cloud.redactBeforeSending} onChange={(e) => setCloud({ redactBeforeSending: e.target.checked })} />
                <span>
                  Redact phone numbers, email addresses and long ID numbers before any external call.
                  <span className="block text-[11.5px]">Leave this on. It is a pattern-based safety net, not a guarantee.</span>
                </span>
              </label>

              <div className="notice notice-warn">
                API keys entered here live in this browser&apos;s local storage on this device. That is convenient
                and it is not a secret store. On a shared clinic machine, leave these off and use the local sidecar.
              </div>
            </>
          )}
        </section>

        {/* --- Language packs ----------------------------------------------- */}
        <section className="card p-4">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Language packs
          </h2>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {PACKS.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2" style={{ background: "var(--surface-2)" }}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <LanguageBadge lang={pack.id} />
                  <span className="truncate text-[13.5px]" style={{ color: "var(--text)" }}>
                    {pack.name} <span style={{ color: "var(--text-faint)" }}>— {pack.nativeName}</span>
                  </span>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                  style={
                    pack.morphemeProtocol === "published"
                      ? { background: "var(--accent-soft)", color: "var(--accent-text)" }
                      : { background: "var(--experimental-soft)", color: "var(--experimental-text)" }
                  }
                >
                  {pack.morphemeProtocol}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-normal" style={{ color: "var(--text-faint)" }}>
            The badge is <span className="mono">morphemeProtocol</span>, not tokeniser support. All six packs
            tokenise with hand-written function-word, verb, clause-marker and filler lists. Only English has a
            published morpheme-counting protocol, so only English may report MLU-m as established.
          </p>
        </section>

        {/* --- Appearance ----------------------------------------------------- */}
        <section className="card space-y-3.5 p-4">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Appearance
          </h2>

          <div>
            <div className="mb-1.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
              Theme
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Theme">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => setTheme(t)}
                  className="min-h-11 flex-1 rounded-lg text-[13px] capitalize md:min-h-0 md:py-1.5"
                  style={
                    theme === t
                      ? { background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent-text)", fontWeight: 600 }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {t === "system" ? "Match system" : t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
              Indic script size in Studio
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Indic script size">
              {([17, 19, 21] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={indicSize === size}
                  onClick={() => {
                    setIndicSize(size);
                    document.documentElement.style.setProperty("--indic-size", `${size}px`);
                  }}
                  className="num min-h-11 flex-1 rounded-lg text-[13px] md:min-h-0 md:py-1.5"
                  style={
                    indicSize === size
                      ? { background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent-text)", fontWeight: 600 }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {size}px
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
              17px is the floor. Smaller is not offered.
            </p>
          </div>
        </section>
      </div>

      {/* --- Audit log ------------------------------------------------------- */}
      <section className="card p-4">
        <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          Audit log
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          Recent activity in this browser. Entries marked <em>external</em> sent data off the device.
        </p>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing recorded yet.
          </p>
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

      <TypedConfirmDialog
        open={armingDialog !== null}
        phrase={armingDialog?.phrase ?? ""}
        title={`Arm ${armingDialog?.label ?? "this provider"}?`}
        body={
          <>
            Audio or text from new samples may be sent to {armingDialog?.label}. This device stays your engine of
            record — arming a provider never changes how a measure is computed, and disarming is one click.
          </>
        }
        confirmLabel="Arm"
        value={confirmText}
        onChange={setConfirmText}
        onConfirm={() => {
          if (armingDialog) armProvider(armingDialog.label);
          setArmingDialog(null);
        }}
        onCancel={() => setArmingDialog(null)}
      />

      <TypedConfirmDialog
        open={confirmingClear}
        phrase="ERASE"
        title="Erase all local data?"
        body="Every case, sample, rubric and report stored in this browser is deleted. There is no server copy to restore from — export what you need to keep first."
        confirmLabel="Erase everything"
        value={confirmText}
        onChange={setConfirmText}
        onConfirm={() => {
          clearAll();
          setConfirmingClear(false);
          setConfirmText("");
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}

function ProviderRow({
  title,
  description,
  onArm,
  children,
}: {
  title: string;
  description: string;
  onArm: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3.5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </div>
          <p className="mt-0.5 text-[12px] leading-normal" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        </div>
        <button type="button" className="btn min-h-11 shrink-0 md:min-h-0" onClick={onArm}>
          Arm…
        </button>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
