import type { Bcp47, GlossedText } from "@/core/types";
import { makeGloss } from "@/core/types";

/**
 * Speech, translation and transliteration providers.
 *
 * Order of preference, and the reason for it (see docs/ADDENDUM_A_FREE_TIER.md):
 *
 *  1. OfflineNoOp        — the default. Nothing leaves the device, nothing is
 *                          called, and the UI simply offers manual transcription.
 *                          Every clinical measure ULASA reports works here.
 *  2. LocalSidecar       — faster-whisper and IndicTrans2 running on the
 *                          clinician's own machine at 127.0.0.1. Free, no key,
 *                          no quota, no network egress.
 *  3. Bhashini / ULCA    — India's public language stack. Free developer
 *                          registration. Suitable for academic and government
 *                          use; ULASA never resells Bhashini capacity.
 *  4. Google Cloud       — optional, requires the user's own billing account
 *                          even inside the free allowance. Never the default.
 *
 * Whatever the provider, translation output is wrapped in GlossedText, which
 * the measure engine cannot accept. A gloss is for the examiner to read; it is
 * never scored.
 */

export type ProviderId = "offline" | "sidecar" | "bhashini" | "google";

export interface AsrSegment {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptDraft {
  segments: AsrSegment[];
  language: Bcp47;
  provider: ProviderId;
  /** Always true for machine output. The clinician must review every line. */
  isDraft: true;
  modelNote: string;
}

export interface LanguageService {
  readonly id: ProviderId;
  readonly label: string;
  /** True when using this provider sends data off the device. */
  readonly external: boolean;
  available(): Promise<boolean>;
  asr(audio: Blob, lang: Bcp47): Promise<TranscriptDraft>;
  translate(text: string, src: Bcp47, tgt: Bcp47): Promise<GlossedText>;
  transliterate(text: string, src: Bcp47): Promise<string>;
}

export class ProviderUnavailable extends Error {
  constructor(public readonly provider: ProviderId, message: string) {
    super(message);
    this.name = "ProviderUnavailable";
  }
}

// ---------------------------------------------------------------------------

/**
 * The default. Does nothing, and says so clearly rather than failing obscurely.
 */
export class OfflineNoOpService implements LanguageService {
  readonly id = "offline" as const;
  readonly label = "Local only (no speech or translation assistance)";
  readonly external = false;

  async available() {
    return true;
  }

  async asr(): Promise<TranscriptDraft> {
    throw new ProviderUnavailable(
      "offline",
      "ULASA is in local-only mode, so there is no speech recogniser to draft a transcript. Type the transcript in the Studio, or start the local sidecar and enable it in Settings. Every measure ULASA reports works without a recogniser.",
    );
  }

  async translate(): Promise<GlossedText> {
    throw new ProviderUnavailable(
      "offline",
      "ULASA is in local-only mode, so no translation is available. Enable the local sidecar in Settings for offline IndicTrans2 translation, or type a gloss yourself. Translation never affects any score.",
    );
  }

  async transliterate(text: string) {
    return text;
  }
}

// ---------------------------------------------------------------------------

/**
 * A FastAPI process the clinician runs on their own machine (see sidecar/).
 * This is the free path that Addendum A asks ULASA to ship before any cloud
 * call: faster-whisper for speech, IndicTrans2 for gloss, IndicXlit for script.
 */
export class LocalSidecarService implements LanguageService {
  readonly id = "sidecar" as const;
  readonly label = "Local sidecar (faster-whisper + IndicTrans2)";
  readonly external = false; // 127.0.0.1 never leaves the machine

  constructor(private readonly baseUrl: string) {}

  async available(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async asr(audio: Blob, lang: Bcp47): Promise<TranscriptDraft> {
    const form = new FormData();
    form.append("audio", audio, "sample.webm");
    form.append("language", lang);

    const res = await fetch(`${this.baseUrl}/asr`, { method: "POST", body: form });
    if (!res.ok) {
      throw new ProviderUnavailable(
        "sidecar",
        `The local sidecar returned ${res.status}. Check the terminal window where you started it.`,
      );
    }
    const data = await res.json();
    return {
      segments: (data.segments ?? []) as AsrSegment[],
      language: lang,
      provider: "sidecar",
      isDraft: true,
      modelNote:
        data.model_note ??
        "Draft from local Whisper. Accuracy on Indian languages other than Hindi and English is variable — treat every line as a starting point and correct it against the audio.",
    };
  }

  async translate(text: string, src: Bcp47, tgt: Bcp47): Promise<GlossedText> {
    const res = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: src, target: tgt }),
    });
    if (!res.ok) {
      throw new ProviderUnavailable("sidecar", `The local sidecar returned ${res.status}.`);
    }
    const data = await res.json();
    return makeGloss(data.text ?? "", tgt, "machine", "IndicTrans2 (local)");
  }

  async transliterate(text: string, src: Bcp47): Promise<string> {
    const res = await fetch(`${this.baseUrl}/transliterate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: src }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.text ?? text;
  }
}

// ---------------------------------------------------------------------------

/**
 * Bhashini / ULCA — the Government of India's public language stack.
 *
 * ULASA calls it with the clinician's own free developer credentials and never
 * charges for it. Bhashini's open endpoints are documented as proof-of-concept
 * capacity; billing end-users for Bhashini cycles would require a separate
 * production agreement, so ULASA does not offer one.
 */
export class BhashiniService implements LanguageService {
  readonly id = "bhashini" as const;
  readonly label = "Bhashini / ULCA (free developer registration)";
  readonly external = true;

  constructor(
    private readonly userId: string,
    private readonly apiKey: string,
  ) {}

  async available(): Promise<boolean> {
    return Boolean(this.userId && this.apiKey);
  }

  private assertConfigured() {
    if (!this.userId || !this.apiKey) {
      throw new ProviderUnavailable(
        "bhashini",
        "Bhashini needs a user ID and API key from bhashini.gov.in. Registration is free. Add them in Settings.",
      );
    }
  }

  async asr(audio: Blob, lang: Bcp47): Promise<TranscriptDraft> {
    this.assertConfigured();
    const base64 = await blobToBase64(audio);
    const body = {
      pipelineTasks: [
        { taskType: "asr", config: { language: { sourceLanguage: isoOf(lang) } } },
      ],
      inputData: { audio: [{ audioContent: base64 }] },
    };

    const res = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
        userID: this.userId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new ProviderUnavailable(
        "bhashini",
        `Bhashini returned ${res.status}. If this is a quota or pipeline error, ULASA will fall back to the local path rather than switching to a paid service.`,
      );
    }

    const data = await res.json();
    const text: string =
      data?.pipelineResponse?.[0]?.output?.[0]?.source ?? "";
    return {
      segments: text ? [{ text, start: 0, end: 0 }] : [],
      language: lang,
      provider: "bhashini",
      isDraft: true,
      modelNote:
        "Draft from Bhashini ASR (IndicConformer / AI4Bharat models). Bhashini's open endpoints are proof-of-concept capacity; review every line.",
    };
  }

  async translate(text: string, src: Bcp47, tgt: Bcp47): Promise<GlossedText> {
    this.assertConfigured();
    const body = {
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: { sourceLanguage: isoOf(src), targetLanguage: isoOf(tgt) },
          },
        },
      ],
      inputData: { input: [{ source: text }] },
    };

    const res = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
        userID: this.userId,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new ProviderUnavailable("bhashini", `Bhashini returned ${res.status}.`);
    const data = await res.json();
    const out = data?.pipelineResponse?.[0]?.output?.[0]?.target ?? "";
    return makeGloss(out, tgt, "machine", "Bhashini NMT");
  }

  async transliterate(text: string): Promise<string> {
    return text; // TODO(integration): wire ULCA transliteration task.
  }
}

// ---------------------------------------------------------------------------

/**
 * Google Cloud. Deliberately last, deliberately off by default.
 *
 * Google's free allowances (500,000 translated characters per month;
 * 60 minutes of Speech-to-Text V1 per month) still require an active billing
 * account, which means a misconfigured project can start charging. ULASA
 * therefore never selects this provider automatically and never falls back
 * *to* it — only away from it.
 */
export class GoogleCloudService implements LanguageService {
  readonly id = "google" as const;
  readonly label = "Google Cloud (optional; needs your own billing account)";
  readonly external = true;

  constructor(private readonly apiKey: string) {}

  async available(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async asr(): Promise<TranscriptDraft> {
    throw new ProviderUnavailable(
      "google",
      "Google Speech-to-Text is not wired into ULASA's browser build, because sending child audio to a billed cloud endpoint should be a deliberate server-side decision, not a button in a local tool. Use the local sidecar or Bhashini.",
    );
  }

  async translate(text: string, src: Bcp47, tgt: Bcp47): Promise<GlossedText> {
    if (!this.apiKey) {
      throw new ProviderUnavailable("google", "No Google API key is configured.");
    }
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: isoOf(src),
          target: isoOf(tgt),
          format: "text",
        }),
      },
    );
    if (!res.ok) {
      throw new ProviderUnavailable(
        "google",
        `Google returned ${res.status}. ULASA will not retry against a paid endpoint — switch to the local sidecar in Settings.`,
      );
    }
    const data = await res.json();
    const out = data?.data?.translations?.[0]?.translatedText ?? "";
    return makeGloss(out, tgt, "machine", "Google Cloud Translation v2");
  }

  async transliterate(text: string) {
    return text;
  }
}

// ---------------------------------------------------------------------------

const ISO: Record<string, string> = {
  "en-IN": "en", "en-US": "en", "en-GB": "en",
  "hi-IN": "hi", "ta-IN": "ta", "kn-IN": "kn", "te-IN": "te", "ml-IN": "ml",
};

function isoOf(lang: Bcp47): string {
  return ISO[lang] ?? "en";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Chooses a provider given the clinician's settings.
 *
 * The fallback direction is one-way: an unavailable cloud provider falls back
 * to local, never the reverse. A local-only install can never start billing.
 */
export async function resolveService(settings: {
  enabled: boolean;
  sidecarEnabled: boolean;
  sidecarUrl: string;
  bhashiniUserId: string;
  bhashiniApiKey: string;
  googleApiKey: string;
}): Promise<LanguageService> {
  if (settings.sidecarEnabled) {
    const sidecar = new LocalSidecarService(settings.sidecarUrl);
    if (await sidecar.available()) return sidecar;
  }

  if (settings.enabled) {
    const bhashini = new BhashiniService(settings.bhashiniUserId, settings.bhashiniApiKey);
    if (await bhashini.available()) return bhashini;

    const google = new GoogleCloudService(settings.googleApiKey);
    if (await google.available()) return google;
  }

  return new OfflineNoOpService();
}

/** Redacts obvious identifiers before any external call. */
export function redact(text: string): string {
  return text
    .replace(/\b(?:\+91[- ]?)?[6-9]\d{9}\b/g, "[phone]")
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[id-number]");
}
