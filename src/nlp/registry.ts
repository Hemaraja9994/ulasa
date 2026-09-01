import type { Bcp47 } from "@/core/types";
import type { LanguagePack } from "./pack";
import { ENGLISH } from "./packs/english";
import { HINDI } from "./packs/hindi";
import { TAMIL } from "./packs/tamil";
import { KANNADA } from "./packs/kannada";
import { TELUGU } from "./packs/telugu";
import { MALAYALAM } from "./packs/malayalam";

/**
 * The six languages ULASA supports as first-class packs.
 *
 * Each has a hand-written function-word list, verb inventory, clause-marker
 * set, filler set and error taxonomy written for that language rather than
 * translated from English. Adding a seventh means writing those six lists, not
 * flipping a flag.
 */
export const PACKS: LanguagePack[] = [
  ENGLISH,
  HINDI,
  KANNADA,
  TAMIL,
  TELUGU,
  MALAYALAM,
];

const BY_ID = new Map<string, LanguagePack>(PACKS.map((p) => [p.id, p]));

/** Language variants that should resolve onto an existing pack. */
const ALIASES: Record<string, Bcp47> = {
  "en-US": "en-IN",
  "en-GB": "en-IN",
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
};

export function getPack(lang: Bcp47 | string): LanguagePack {
  const direct = BY_ID.get(lang);
  if (direct) return direct;
  const aliased = ALIASES[lang];
  if (aliased) return BY_ID.get(aliased)!;
  // "mixed" and "und" fall back to English's universal machinery. Every measure
  // that depends on language-specific knowledge reports status "experimental"
  // in that case; see analyseSample().
  return ENGLISH;
}

export function isSupported(lang: string): boolean {
  return BY_ID.has(lang) || lang in ALIASES;
}

export function packOptions(): { id: Bcp47; label: string }[] {
  return PACKS.map((p) => ({
    id: p.id,
    label: `${p.name} — ${p.nativeName}`,
  }));
}

/** Script family, used to pick the right Noto font stack in the UI. */
export function scriptFor(lang: Bcp47 | string): string {
  return getPack(lang).script;
}
