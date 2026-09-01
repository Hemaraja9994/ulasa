"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnalysisSetKind, Bcp47, CaseRecord, Sample, Utterance } from "@/core/types";
import type { RubricScores } from "@/core/rubrics";

/**
 * All ULASA state lives in the clinician's own browser.
 *
 * There is no server database, no account, and no upload. That is not a
 * limitation of the free tier — it is the privacy design. Child speech never
 * leaves the device unless the clinician explicitly turns on a cloud service in
 * Settings, and every such call is written to the audit log below.
 *
 * Transcripts and case records persist to localStorage. Audio blobs are far too
 * large for that, so they go to IndexedDB via src/lib/audio.ts and are keyed
 * from the sample record.
 */

export interface AuditEntry {
  at: string;
  action: string;
  detail: string;
  /** True when the action sent data off the device. */
  external: boolean;
}

export interface CloudSettings {
  /** Nothing cloud-facing is on unless the clinician switches it on here. */
  enabled: boolean;
  /** Address of a locally running ULASA sidecar (Whisper + IndicTrans2). */
  sidecarUrl: string;
  sidecarEnabled: boolean;
  bhashiniUserId: string;
  bhashiniApiKey: string;
  googleApiKey: string;
  /** Strip names, phone numbers and addresses before any external call. */
  redactBeforeSending: boolean;
  /**
   * Name of the external provider the clinician has armed, or null.
   *
   * Arming is deliberate and typed: it is the only state in which audio or
   * text can leave the device, so it is stored explicitly rather than inferred
   * from whether a key happens to be present. It drives the red chip on every
   * route.
   */
  armedProvider: string | null;
}

interface State {
  cases: CaseRecord[];
  samples: Sample[];
  rubrics: Record<string, RubricScores>;
  /** Clinician-edited performance report prose, keyed by sample id. */
  reportDrafts: Record<string, string>;
  activeSampleId: string | null;
  cloud: CloudSettings;
  audit: AuditEntry[];
  theme: "system" | "light" | "dark";
  /**
   * Indic script size in the Studio editor. 17px is the floor — below it the
   * matras and conjuncts a clinician is judging are not reliably legible — so
   * nothing smaller is offered.
   */
  indicSize: 17 | 19 | 21;
  /** Whether the analysis set is the C&I subset or every target utterance. */
  analysisSetKind: AnalysisSetKind;
  /** Runtime only: whether a sidecar answered on 127.0.0.1. Never persisted. */
  sidecarReachable: boolean;

  /**
   * False until the persisted state has been read back from localStorage.
   *
   * The pages are prerendered as static HTML, so the first React render happens
   * with the empty defaults. Without this flag a clinician who reloads the page
   * sees "No samples yet" over a localStorage that is in fact full — the data is
   * there, the render is just early. Components that read persisted data wait
   * for this rather than rendering a false empty state.
   */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  addCase: (record: CaseRecord) => void;
  updateCase: (id: string, patch: Partial<CaseRecord>) => void;
  deleteCase: (id: string) => void;

  addSample: (sample: Sample) => void;
  updateSample: (id: string, patch: Partial<Sample>) => void;
  replaceUtterances: (sampleId: string, utterances: Utterance[]) => void;
  deleteSample: (id: string) => void;
  setActiveSample: (id: string | null) => void;

  setRubric: (sampleId: string, scores: RubricScores) => void;
  setReportDraft: (sampleId: string, text: string) => void;

  setCloud: (patch: Partial<CloudSettings>) => void;
  setTheme: (theme: State["theme"]) => void;
  setIndicSize: (size: State["indicSize"]) => void;
  setAnalysisSetKind: (kind: AnalysisSetKind) => void;
  setSidecarReachable: (reachable: boolean) => void;
  /** Arm an external provider. Audited, because it is the one action that can
   *  send a child's speech off this device. */
  armProvider: (provider: string) => void;
  disarmProvider: () => void;
  log: (action: string, detail: string, external?: boolean) => void;
  clearAll: () => void;
}

const DEFAULT_CLOUD: CloudSettings = {
  enabled: false,
  sidecarUrl: "http://127.0.0.1:8765",
  sidecarEnabled: false,
  bhashiniUserId: "",
  bhashiniApiKey: "",
  googleApiKey: "",
  redactBeforeSending: true,
  armedProvider: null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      cases: [],
      samples: [],
      rubrics: {},
      reportDrafts: {},
      activeSampleId: null,
      cloud: DEFAULT_CLOUD,
      audit: [],
      theme: "system",
      indicSize: 19,
      analysisSetKind: "complete_intelligible_verbal",
      sidecarReachable: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      addCase: (record) =>
        set((s) => ({ cases: [record, ...s.cases] })),

      updateCase: (id, patch) =>
        set((s) => ({
          cases: s.cases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCase: (id) =>
        set((s) => ({
          cases: s.cases.filter((c) => c.id !== id),
          samples: s.samples.filter((sample) => sample.caseId !== id),
        })),

      addSample: (sample) =>
        set((s) => ({
          samples: [{ ...sample, updatedAt: new Date().toISOString() }, ...s.samples],
          activeSampleId: sample.id,
        })),

      updateSample: (id, patch) =>
        set((s) => ({
          samples: s.samples.map((sample) =>
            sample.id === id
              ? { ...sample, ...patch, updatedAt: new Date().toISOString() }
              : sample,
          ),
        })),

      replaceUtterances: (sampleId, utterances) =>
        set((s) => ({
          samples: s.samples.map((sample) =>
            sample.id === sampleId
              ? { ...sample, utterances, updatedAt: new Date().toISOString() }
              : sample,
          ),
        })),

      deleteSample: (id) =>
        set((s) => ({
          samples: s.samples.filter((sample) => sample.id !== id),
          activeSampleId: s.activeSampleId === id ? null : s.activeSampleId,
        })),

      setActiveSample: (id) => set({ activeSampleId: id }),

      setRubric: (sampleId, scores) =>
        set((s) => ({ rubrics: { ...s.rubrics, [sampleId]: scores } })),

      setReportDraft: (sampleId, text) =>
        set((s) => ({ reportDrafts: { ...s.reportDrafts, [sampleId]: text } })),

      setCloud: (patch) => set((s) => ({ cloud: { ...s.cloud, ...patch } })),

      setTheme: (theme) => set({ theme }),

      setIndicSize: (indicSize) => set({ indicSize }),

      setAnalysisSetKind: (analysisSetKind) => set({ analysisSetKind }),

      setSidecarReachable: (sidecarReachable) => set({ sidecarReachable }),

      armProvider: (provider) => {
        set((s) => ({ cloud: { ...s.cloud, enabled: true, armedProvider: provider } }));
        get().log(
          "arm_provider",
          `Armed the external provider "${provider}". Audio or text from new samples may leave this device until it is disarmed.`,
          true,
        );
      },

      disarmProvider: () => {
        const previous = get().cloud.armedProvider;
        set((s) => ({ cloud: { ...s.cloud, enabled: false, armedProvider: null } }));
        get().log(
          "disarm_provider",
          previous
            ? `Disarmed "${previous}". Back to device only.`
            : "Disarmed external providers. Back to device only.",
        );
      },

      log: (action, detail, external = false) =>
        set((s) => ({
          audit: [
            { at: new Date().toISOString(), action, detail, external },
            ...s.audit,
          ].slice(0, 500),
        })),

      clearAll: () =>
        set({
          cases: [],
          samples: [],
          rubrics: {},
          reportDrafts: {},
          activeSampleId: null,
          audit: [
            {
              at: new Date().toISOString(),
              action: "clear_all",
              detail: "All local cases, samples and reports were erased by the user.",
              external: false,
            },
          ],
        }),
    }),
    {
      name: "ulasa-store-v1",
      // API keys are the one thing that must not be written to disk casually,
      // but a clinician who enters one expects it to survive a reload. They are
      // persisted in localStorage on this device only, and Settings says so.
      partialize: (s) => ({
        cases: s.cases,
        samples: s.samples,
        rubrics: s.rubrics,
        reportDrafts: s.reportDrafts,
        activeSampleId: s.activeSampleId,
        cloud: s.cloud,
        audit: s.audit,
        theme: s.theme,
        indicSize: s.indicSize,
        analysisSetKind: s.analysisSetKind,
      }),
      onRehydrateStorage: () => (state) => {
        // Runs once localStorage has been read, whether or not there was
        // anything in it. Either way the store is now authoritative.
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * True once persisted state has been read back. Gate any view that would
 * otherwise render an empty state over data that is merely still loading.
 */
export function useHydrated(): boolean {
  return useStore((s) => s.hasHydrated);
}

export function useActiveSample(): Sample | null {
  const id = useStore((s) => s.activeSampleId);
  const samples = useStore((s) => s.samples);
  return samples.find((sample) => sample.id === id) ?? null;
}

export function newCaseId(): string {
  return `case-${Math.random().toString(36).slice(2, 9)}`;
}

export function newSampleId(): string {
  return `sample-${Math.random().toString(36).slice(2, 9)}`;
}

export const SUPPORTED_LANGUAGES: { id: Bcp47; label: string }[] = [
  { id: "en-IN", label: "English (India)" },
  { id: "hi-IN", label: "हिन्दी — Hindi" },
  { id: "kn-IN", label: "ಕನ್ನಡ — Kannada" },
  { id: "ta-IN", label: "தமிழ் — Tamil" },
  { id: "te-IN", label: "తెలుగు — Telugu" },
  { id: "ml-IN", label: "മലയാളം — Malayalam" },
];
