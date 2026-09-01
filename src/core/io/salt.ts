import type { Sample, Speaker, Utterance, Bcp47, ElicitationContext } from "../types";
import { parseUtteranceText } from "../tokenise";
import { getPack } from "@/nlp/registry";

/**
 * SALT-style plain-text transcripts.
 *
 * ULASA reads and writes a SALT-compatible text form so a clinician trained on
 * SALT can move samples in and out without retyping. It is a *projection* of
 * the native JSON, not the source of truth, and the writer reports what it had
 * to drop.
 *
 * Format:
 *   $ Child, Examiner        speaker declaration
 *   + Language: hi-IN        metadata line
 *   C  utterance text        target speaker turn
 *   E  utterance text        examiner turn
 *   =  free comment          ignored by all counts
 */

export interface SaltParseResult {
  sample: Sample;
  warnings: string[];
}

const META_RE = /^\+\s*([A-Za-z ]+):\s*(.+)$/;
const SPEAKER_RE = /^([A-Za-z]{1,4})\s+(.*)$/;

export function parseSaltText(
  text: string,
  options: { language?: Bcp47; title?: string; caseId?: string } = {},
): SaltParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);

  let language: Bcp47 = options.language ?? "en-IN";
  let elicitationContext: ElicitationContext = "conversation";
  let elapsedSeconds: number | undefined;
  let title = options.title ?? "Imported transcript";

  const declaredSpeakers: string[] = [];
  const body: { code: string; text: string }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("$")) {
      declaredSpeakers.push(
        ...line
          .slice(1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
      continue;
    }

    if (line.startsWith("=")) continue; // free comment line

    const meta = line.match(META_RE);
    if (meta) {
      const key = meta[1].trim().toLowerCase();
      const value = meta[2].trim();
      if (key === "language") language = value as Bcp47;
      else if (key === "context") elicitationContext = value as ElicitationContext;
      else if (key === "title") title = value;
      else if (key === "elapsed" || key === "time") {
        const seconds = parseElapsed(value);
        if (seconds !== null) elapsedSeconds = seconds;
        else warnings.push(`Could not read the elapsed time "${value}". Use mm:ss or a number of seconds.`);
      }
      continue;
    }

    const match = line.match(SPEAKER_RE);
    if (match) {
      body.push({ code: match[1], text: match[2] });
    } else {
      // A continuation of the previous utterance rather than a new turn.
      if (body.length > 0) body[body.length - 1].text += " " + line;
      else warnings.push(`Ignored a line before any speaker turn: "${line.slice(0, 40)}"`);
    }
  }

  const codes = [...new Set(body.map((b) => b.code))];
  if (codes.length === 0) {
    warnings.push("No speaker turns were found. Each line should begin with a speaker code, e.g. 'C ' or 'E '.");
  }

  const speakers: Speaker[] = codes.map((code, i) => ({
    id: `spk-${i}`,
    code,
    role: guessRole(code),
    // The target is the first speaker whose code looks like a child/client
    // code; failing that, the first declared speaker.
    isTarget: false,
  }));

  const targetIndex = speakers.findIndex((s) => s.role === "child");
  if (speakers.length > 0) speakers[targetIndex >= 0 ? targetIndex : 0].isTarget = true;
  if (targetIndex < 0 && speakers.length > 0) {
    warnings.push(
      `No speaker code looked like a client code (C, CHI, P). Treating "${speakers[0].code}" as the target speaker — change this in the Studio if it is wrong.`,
    );
  }

  const pack = getPack(language);
  const utterances: Utterance[] = body.map((b, i) => {
    const speaker = speakers.find((s) => s.code === b.code)!;
    const parsed = parseUtteranceText(b.text, pack);
    const isAbandoned = /\^\s*$/.test(b.text.trim()) || />\s*$/.test(b.text.trim());
    return {
      id: `utt-${i}`,
      speakerId: speaker.id,
      text: b.text.trim(),
      tokens: parsed.tokens,
      mazes: parsed.mazes,
      intelligibility: parsed.intelligibility,
      grammaticality: "unmarked",
      isAbandoned,
      codes: parsed.codes,
      pauses: parsed.pauses,
      comment: parsed.comment,
    };
  });

  const sample: Sample = {
    id: `sample-${Date.now().toString(36)}`,
    caseId: options.caseId ?? "unassigned",
    title,
    language,
    elicitationContext,
    elapsedSeconds,
    speakers,
    utterances,
  };

  return { sample, warnings };
}

function parseElapsed(value: string): number | null {
  const mmss = value.match(/^(\d+):(\d{1,2})$/);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function guessRole(code: string): Speaker["role"] {
  const c = code.toUpperCase();
  if (["C", "CHI", "P", "CLI"].includes(c)) return "child";
  if (["E", "EXA", "INV", "SLP"].includes(c)) return "examiner";
  if (["M", "MOT", "F", "FAT", "PAR"].includes(c)) return "parent";
  if (["T", "TEA"].includes(c)) return "teacher";
  return "other";
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export function writeSaltText(sample: Sample): { text: string; lossWarnings: string[] } {
  const lossWarnings: string[] = [];
  const lines: string[] = [];

  lines.push("$ " + sample.speakers.map((s) => s.code).join(", "));
  lines.push(`+ Title: ${sample.title}`);
  lines.push(`+ Language: ${sample.language}`);
  lines.push(`+ Context: ${sample.elicitationContext}`);
  if (sample.elapsedSeconds) {
    const mm = Math.floor(sample.elapsedSeconds / 60);
    const ss = Math.round(sample.elapsedSeconds % 60);
    lines.push(`+ Elapsed: ${mm}:${String(ss).padStart(2, "0")}`);
  }
  lines.push("=");

  let droppedGloss = 0;
  let droppedGrammaticality = 0;
  let droppedTiming = 0;

  for (const u of sample.utterances) {
    const speaker = sample.speakers.find((s) => s.id === u.speakerId);
    lines.push(`${speaker?.code ?? "?"} ${u.text}`);
    if (u.gloss) droppedGloss++;
    if (u.grammaticality !== "unmarked") droppedGrammaticality++;
    if (typeof u.startTime === "number") droppedTiming++;
    if (u.comment) lines.push(`= ${u.comment}`);
  }

  if (droppedGloss) {
    lossWarnings.push(`${droppedGloss} English gloss line(s) were dropped — SALT text has no gloss tier. Export ULASA JSON or CHAT to keep them.`);
  }
  if (droppedGrammaticality) {
    lossWarnings.push(`${droppedGrammaticality} grammaticality judgement(s) were dropped — SALT text has no field for them. Your PGU score is preserved only in ULASA JSON.`);
  }
  if (droppedTiming) {
    lossWarnings.push(`${droppedTiming} media time-stamp(s) were dropped. Export CHAT to keep media alignment.`);
  }

  return { text: lines.join("\n") + "\n", lossWarnings };
}
