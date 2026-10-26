import type { AsrSegment } from "@/integrations/languageService";

/**
 * Turns recogniser segments into SALT-style draft lines, one utterance per line.
 *
 * Rules (kept deliberately conservative — this is a draft for the clinician to
 * correct, never analysed as-is):
 *  - Non-speech annotations the recogniser invents ("[Music]", "(laughs)",
 *    "*coughs*") are removed. Parentheses would otherwise be read as mazes and
 *    square brackets as codes by the SALT parser.
 *  - A segment is split into utterances at sentence-final punctuation
 *    (. ? ! and the Devanagari danda । ॥), keeping the punctuation.
 *  - Whitespace is collapsed; empty results and immediate verbatim repeats
 *    (a common Whisper hallucination loop) are dropped.
 *  - A word or short phrase repeated 4+ times in a row (Whisper's typical
 *    hallucination loop on unfamiliar audio) is collapsed to one occurrence.
 *  - Each line is prefixed with the speaker code (default "C").
 */
export function formatDraftLines(segments: Pick<AsrSegment, "text">[], speakerCode = "C"): string[] {
  const code = (speakerCode || "C").trim() || "C";
  const lines: string[] = [];
  for (const seg of segments) {
    const cleaned = (seg.text ?? "")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\*[^*]*\*/g, " ")
      .replace(/[()[\]{}<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/(\S+(?:\s+\S+){0,3}?)(?:[\s,.-]+\1){3,}/gu, "$1");
    if (!cleaned) continue;
    const parts = cleaned.match(/[^.?!।॥]+[.?!।॥]*/g) ?? [cleaned];
    for (const raw of parts) {
      const utt = raw.trim();
      if (!utt || /^[.?!।॥,\s]+$/.test(utt)) continue;
      const line = `${code} ${utt}`;
      if (lines[lines.length - 1] === line) continue;
      lines.push(line);
    }
  }
  return lines;
}
