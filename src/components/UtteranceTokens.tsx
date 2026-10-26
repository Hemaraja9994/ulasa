import type { Token } from "@/core/types";

export type TokenHighlight = "maze" | "mix" | null;

/**
 * One utterance as its tokens, in the original script. Maze tokens are amber,
 * tokens in another language (by script) are indigo in IBM Plex Sans. A token
 * named in `highlight` gets the evidence wash used on Analyse.
 */
export function UtteranceTokens({
  tokens,
  matrixLang,
  highlight,
  size = 15.5,
}: {
  tokens: Token[];
  matrixLang: string;
  /** Returns the highlight for token i, or null. */
  highlight?: (token: Token, index: number) => TokenHighlight;
  size?: number;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-1.5 gap-y-0.5" style={{ fontSize: size, lineHeight: 1.85 }}>
      {tokens.map((t, i) => {
        const isMix = !t.isMaze && !t.isUnintelligible && !!t.lang && t.lang !== matrixLang;
        const hl = highlight?.(t, i) ?? null;
        let color = "var(--text)";
        if (t.isMaze) color = "var(--saffron-text)";
        else if (isMix) color = "var(--accent)";
        else if (t.isUnintelligible) color = "var(--text-muted)";
        const style: React.CSSProperties = { color, padding: "0 4px", margin: "0 -4px", borderRadius: 4 };
        if (hl === "maze") {
          style.background = "var(--saffron-soft)";
          style.boxShadow = "inset 0 0 0 1px var(--saffron)";
        } else if (hl === "mix") {
          style.background = "var(--accent-soft)";
          style.boxShadow = "inset 0 0 0 1px var(--accent-mid)";
        }
        const text = (t.isOmission ? "*" : "") + t.surface;
        return (
          <span key={i} style={style}>
            {t.isMaze && (i === 0 || !tokens[i - 1].isMaze) ? "(" : ""}
            {text}
            {t.isMaze && (i === tokens.length - 1 || !tokens[i + 1].isMaze) ? ")" : ""}
          </span>
        );
      })}
    </div>
  );
}

/** True when the token is a countable word in a language other than the matrix. */
export function isInsertion(t: Token, matrixLang: string): boolean {
  return !t.isMaze && !t.isUnintelligible && !t.isOmission && !!t.lang && t.lang !== matrixLang;
}
