import type { Bcp47 } from "@/core/types";
import { getPack } from "@/nlp/registry";

/**
 * The single source for how a language pack looks anywhere in the UI.
 *
 * Six languages, six rails. The same colour is the badge fill, the 3px left
 * rail on a table row and the 3px top rail on a card, so a clinician can pick
 * the Kannada samples out of a list without reading a single label. None of
 * the six is teal: a rail must never be mistaken for the on-device signal.
 */

const RAIL: Record<string, string> = {
  en: "var(--lang-en)",
  hi: "var(--lang-hi)",
  kn: "var(--lang-kn)",
  ta: "var(--lang-ta)",
  te: "var(--lang-te)",
  ml: "var(--lang-ml)",
};

/** Noto face per script, so conjuncts and matras shape correctly. */
const SCRIPT_FONT: Record<string, string> = {
  hi: '"Noto Sans Devanagari", var(--font-plex-sans), sans-serif',
  kn: '"Noto Sans Kannada", var(--font-plex-sans), sans-serif',
  ta: '"Noto Sans Tamil", var(--font-plex-sans), sans-serif',
  te: '"Noto Sans Telugu", var(--font-plex-sans), sans-serif',
  ml: '"Noto Sans Malayalam", var(--font-plex-sans), sans-serif',
};

function prefixOf(lang: Bcp47 | string): string {
  return lang.split("-")[0]?.toLowerCase() ?? "";
}

export function langRailColor(lang: Bcp47 | string): string {
  return RAIL[prefixOf(lang)] ?? "var(--text-faint)";
}

/** True for the five Indic packs, which need a Noto face and 17px+ sizing. */
export function isIndic(lang: Bcp47 | string): boolean {
  return prefixOf(lang) in SCRIPT_FONT;
}

/** Font stack for text written in this pack's script. */
export function scriptFont(lang: Bcp47 | string): string | undefined {
  return SCRIPT_FONT[prefixOf(lang)];
}

/**
 * Props for rendering a run of text in a sample's own script: the right Noto
 * face, and the `.indic` line-height and 17px floor where it applies.
 */
export function scriptTextProps(lang: Bcp47 | string): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (!isIndic(lang)) return {};
  return { className: "indic", style: { fontFamily: scriptFont(lang) } };
}

export function langBadgeCode(lang: Bcp47 | string): string {
  return lang.toUpperCase();
}

export function LanguageBadge({
  lang,
  secondary,
  className = "",
}: {
  lang: Bcp47 | string;
  /** Additional languages in a code-mixed sample, rendered as `+EN` chips. */
  secondary?: (Bcp47 | string)[];
  className?: string;
}) {
  const pack = getPack(lang as Bcp47);
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className="mono inline-flex items-center rounded-[5px] px-[7px] py-[2px] text-[10.5px] font-semibold text-white"
        style={{ background: langRailColor(lang) }}
        title={`${pack.name} — ${pack.nativeName}`}
      >
        {langBadgeCode(lang)}
      </span>
      {secondary?.map((s) => (
        <span
          key={s}
          className="mono inline-flex items-center rounded-[5px] px-[5px] py-[2px] text-[10px] font-semibold"
          style={{ background: "var(--chip-neutral)", color: "var(--chip-neutral-text)" }}
          title={`Also present: ${getPack(s as Bcp47).name}`}
        >
          +{prefixOf(s).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
