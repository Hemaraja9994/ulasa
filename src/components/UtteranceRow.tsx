"use client";

import { scriptTextProps } from "@/components/LanguageBadge";
import type { Bcp47, Utterance } from "@/core/types";

/**
 * One utterance, rendered with its marks visible.
 *
 * Maze spans carry the amber fill and the wavy underline; omissions keep their
 * asterisk and unintelligible tokens their X, because those are the
 * clinician's own marks and rewriting them would be rewriting the data. The
 * text sits at the Studio's Indic size — matra and conjunct decisions are the
 * clinical judgement being made, and they are not reliably legible at 15px.
 */
export function UtteranceTokens({
  utterance,
  lang,
  editorSize = false,
}: {
  utterance: Utterance;
  lang: Bcp47 | string;
  /** True in the centre editor, where the Indic floor rises to --indic-size. */
  editorSize?: boolean;
}) {
  const scriptProps = scriptTextProps(lang);

  return (
    <p
      className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-1 ${scriptProps.className ?? ""} ${
        editorSize ? "indic-editor" : ""
      }`}
      style={{ ...scriptProps.style, color: "var(--text)" }}
    >
      {utterance.tokens.map((token, i) => {
        if (token.isMaze) {
          return (
            <span
              key={i}
              className="rounded-[3px] px-[3px]"
              style={{
                background: "var(--warn-soft)",
                textDecoration: "underline wavy var(--warn)",
                textUnderlineOffset: "3px",
              }}
              title="Maze — excluded from word counts and from MLU"
            >
              {token.surface}
            </span>
          );
        }
        if (token.isUnintelligible) {
          return (
            <span key={i} className="mono" style={{ color: "var(--text-faint)" }} title="Unintelligible">
              {token.surface}
            </span>
          );
        }
        if (token.isOmission) {
          return (
            <span key={i} style={{ color: "var(--warn-text)" }} title="Judged omitted">
              *{token.surface}
            </span>
          );
        }
        return <span key={i}>{token.surface}</span>;
      })}
    </p>
  );
}
