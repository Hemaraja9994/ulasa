"use client";

import { useStore } from "@/store/useStore";

/**
 * Where the computation is happening, in three states.
 *
 * The old chip always read "100% On-Device / Private", which was true of the
 * default and false of the two configurations `languageService.ts` actually
 * supports. The privacy claim is only worth anything if the UI can also say
 * when it no longer holds — so the armed state is loud, and it appears on
 * every route because it is store state, not page state.
 *
 * The dot does not pulse. Motion on a clinical screen reads as an alarm.
 */

export type ProviderMode = "device" | "sidecar" | "external";

export function useProviderMode(): { mode: ProviderMode; provider: string | null } {
  const cloud = useStore((s) => s.cloud);
  const sidecarReachable = useStore((s) => s.sidecarReachable);

  if (cloud.enabled && cloud.armedProvider) {
    return { mode: "external", provider: cloud.armedProvider };
  }
  if (cloud.sidecarEnabled && sidecarReachable) {
    return { mode: "sidecar", provider: null };
  }
  return { mode: "device", provider: null };
}

export function PrivacyChip({ onChrome = false }: { onChrome?: boolean }) {
  const { mode, provider } = useProviderMode();

  if (mode === "external") {
    return (
      <span
        title="An external provider is armed. Audio or text may leave this device."
        className="inline-flex items-center gap-[7px] rounded-full px-3 py-1.5 text-xs font-bold"
        style={{
          border: "1px solid #E86A6A",
          background: "rgba(232,106,106,.18)",
          color: onChrome ? "#FFB4B4" : "var(--danger-text)",
        }}
      >
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#E86A6A" }} />
        External armed · {provider}
      </span>
    );
  }

  if (mode === "sidecar") {
    return (
      <span
        title="A local sidecar process on 127.0.0.1 is reachable. Still your machine."
        className="inline-flex items-center gap-[7px] rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ border: "1px solid #FDE68A", background: "#FFFBEB", color: "#92400E" }}
      >
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: "#D97706" }} />
        Sidecar · 127.0.0.1
      </span>
    );
  }

  return (
    <span
      title="All analysis runs in this browser. Nothing is uploaded."
      className="inline-flex items-center gap-[7px] rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{
        border: "1px solid rgba(43,192,172,.5)",
        background: "rgba(43,192,172,.14)",
        color: onChrome ? "#6FE0CE" : "var(--accent-text)",
      }}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--signal, #2BC0AC)" }} />
      Device only
    </span>
  );
}
