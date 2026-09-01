import type { Bcp47 } from "@/core/types";

/**
 * Language-rail colour, keyed by the language pack prefix. Drives the samples
 * table's left border, the language badge, and a demonstration card's top
 * border — one colour, three places, so a sample's language is recognisable
 * at a glance without rereading the badge text.
 */
const RAIL_BY_PREFIX: Record<string, string> = {
  en: "var(--lang-en)",
  hi: "var(--lang-hi)",
  kn: "var(--lang-kn)",
  ta: "var(--lang-ta)",
  te: "var(--lang-te)",
  ml: "var(--lang-ml)",
};

function prefixOf(lang: Bcp47 | string): string {
  return lang.split("-")[0]?.toLowerCase() ?? "";
}

export function langRailColor(lang: Bcp47 | string): string {
  return RAIL_BY_PREFIX[prefixOf(lang)] ?? "var(--text-faint)";
}

/** Short mono badge code, e.g. "kn-IN" -> "KN-IN". Falls back to the tag itself. */
export function langBadgeCode(lang: Bcp47 | string): string {
  return lang.toUpperCase();
}
