import type { MazeSpan, Token, Intelligibility } from "./types";
import type { LanguagePack } from "@/nlp/pack";
import { normaliseToken } from "@/nlp/pack";

/**
 * Parses one utterance of ULASA transcript text into tokens, maze spans and
 * codes.
 *
 * The convention set is a superset of SALT's, chosen so that a clinician
 * trained on SALT can type into ULASA without relearning anything:
 *
 *   (word word)   maze — repetition, revision, filled pause or false start
 *   word/morph    bound-morpheme split (never rewrites the surface form)
 *   *word         omission the clinician judged should have been present
 *   X  XX  XXX    unintelligible: one word, two words, an unintelligible run
 *   [code]        an error or descriptive code attached to the previous word,
 *                 or to the whole utterance if it appears at the end
 *   (:2.5)        silent pause of 2.5 seconds
 *   +comment      clinician comment, excluded from all counts
 *
 * Everything the parser does not recognise is treated as an ordinary word. It
 * never discards text silently.
 */

export interface ParsedUtterance {
  tokens: Token[];
  mazes: MazeSpan[];
  codes: string[];
  pauses: number[];
  comment?: string;
  intelligibility: Intelligibility;
}

const PAUSE_RE = /\(:\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g;
const MAZE_OPEN = "(";
const MAZE_CLOSE = ")";

/** Classifies a maze span given its tokens and what follows it. */
function classifyMaze(
  mazeWords: string[],
  following: string[],
  pack: LanguagePack,
): MazeSpan["kind"] {
  const fillers = new Set(pack.mazeFillers.map((f) => f.toLowerCase()));
  const lower = mazeWords.map((w) => w.toLowerCase());

  if (lower.length > 0 && lower.every((w) => fillers.has(w))) return "filled_pause";

  // Repetition: the maze content reappears immediately after the maze.
  const nextLower = following.map((w) => w.toLowerCase());
  if (lower.length > 0) {
    const last = lower[lower.length - 1];
    if (nextLower[0] === last) return "repetition";
    if (lower.length >= 2 && nextLower.slice(0, lower.length).join(" ") === lower.join(" ")) {
      return "repetition";
    }
  }

  // A single abandoned fragment with nothing recoverable after it.
  if (following.length === 0) return "false_start";

  return "revision";
}

export function parseUtteranceText(raw: string, pack: LanguagePack): ParsedUtterance {
  let text = raw;
  const codes: string[] = [];
  const pauses: number[] = [];
  let comment: string | undefined;

  // Clinician comment: everything after a bare "+" at the end of the line.
  const commentIdx = text.indexOf(" +");
  if (commentIdx >= 0) {
    comment = text.slice(commentIdx + 2).trim();
    text = text.slice(0, commentIdx);
  }

  // Silent pauses are recorded then removed so they never become word tokens.
  text = text.replace(PAUSE_RE, (_m, secs) => {
    pauses.push(Number(secs));
    return " ";
  });

  // Bracketed codes. Utterance-level and word-level codes are both collected
  // here; word attachment happens below by position.
  const codePositions: { code: string; before: string }[] = [];
  text = text.replace(/\[([^\]]+)\]/g, (_m, code) => {
    codes.push(String(code).trim());
    codePositions.push({ code: String(code).trim(), before: "" });
    return " ";
  });

  const tokens: Token[] = [];
  const mazes: MazeSpan[] = [];

  // Walk the text, tracking maze depth so nested parentheses do not break.
  const chunks = text.split(/\s+/).filter(Boolean);
  let depth = 0;
  let mazeStart = -1;
  let mazeWords: string[] = [];

  for (const chunk of chunks) {
    let word = chunk;
    let opens = 0;
    let closes = 0;

    while (word.startsWith(MAZE_OPEN)) {
      opens++;
      word = word.slice(1);
    }
    while (word.endsWith(MAZE_CLOSE)) {
      closes++;
      word = word.slice(0, -1);
    }

    if (opens > 0 && depth === 0) {
      mazeStart = tokens.length;
      mazeWords = [];
    }
    depth += opens;

    if (word.length > 0) {
      const token = makeToken(word, pack);
      if (depth > 0) {
        token.isMaze = true;
        mazeWords.push(token.surface);
      }
      tokens.push(token);
    }

    depth -= closes;
    if (closes > 0 && depth <= 0) {
      depth = 0;
      if (mazeStart >= 0) {
        mazes.push({
          kind: "revision", // provisional; reclassified below once we know what follows
          start: mazeStart,
          end: tokens.length,
        });
        mazeStart = -1;
      }
    }
  }

  // An unclosed maze runs to the end of the utterance.
  if (depth > 0 && mazeStart >= 0) {
    mazes.push({ kind: "false_start", start: mazeStart, end: tokens.length });
  }

  // Reclassify each maze now that the full token list exists.
  for (const maze of mazes) {
    const words = tokens.slice(maze.start, maze.end).map((t) => t.surface);
    const following = tokens
      .slice(maze.end)
      .filter((t) => !t.isMaze && !t.isUnintelligible)
      .map((t) => t.surface);
    maze.kind = classifyMaze(words, following, pack);
  }

  return {
    tokens,
    mazes,
    codes,
    pauses,
    comment,
    intelligibility: judgeIntelligibility(tokens),
  };
}

function makeToken(word: string, pack: LanguagePack): Token {
  const token: Token = { surface: word };

  if (word.startsWith("*")) {
    token.isOmission = true;
    token.surface = word.slice(1);
  }

  const bare = normaliseToken(token.surface);

  // X, XX, XXX — unintelligible. Case-sensitive by convention so that a Roman
  // "x" inside romanised Indic text is not swallowed.
  if (/^X{1,3}$/.test(bare)) {
    token.isUnintelligible = true;
    token.surface = bare;
    return token;
  }

  // Bound-morpheme splits are recorded without altering the surface form.
  if (bare.includes("/") && bare.length > 1) {
    const parts = bare.split("/").filter(Boolean);
    if (parts.length > 1) {
      token.morphemes = parts;
      token.surface = token.surface.replace(/\//g, "");
    }
  }

  token.lang = guessTokenLanguage(normaliseToken(token.surface), pack);
  return token;
}

/**
 * Token-level language ID by script, which is all that is needed for the
 * code-mixing metrics ULASA reports. A Latin-script token inside a Devanagari
 * or Dravidian-script sample is an insertion from the pack's declared
 * code-mix partner (in practice English); anything in the pack's own script is
 * the matrix language.
 *
 * This deliberately does not attempt to identify romanised Indic ("Hinglish")
 * as Indic — that requires a transliteration model, and the Studio offers a
 * "normalise to native script" action for it instead.
 */
function guessTokenLanguage(word: string, pack: LanguagePack) {
  if (!word) return undefined;
  const isLatin = /^[\p{Script=Latin}\p{N}'’.-]+$/u.test(word);
  if (pack.script === "Latin") return isLatin ? pack.id : undefined;
  if (isLatin) return pack.codeMixPartners.includes("en-IN") ? "en-IN" : undefined;
  return pack.id;
}

function judgeIntelligibility(tokens: Token[]): Intelligibility {
  const words = tokens.filter((t) => !t.isOmission);
  if (words.length === 0) return "unintelligible";
  const unintelligible = words.filter((t) => t.isUnintelligible).length;
  if (unintelligible === 0) return "intelligible";
  if (unintelligible >= words.length) return "unintelligible";
  return "partial";
}

/**
 * Words counted for lexical and length measures.
 *
 * Excluded: maze words (SALT convention — mazes are verbal facility, not
 * content), unintelligible tokens, omission placeholders, and pure punctuation.
 */
export function countableWords(tokens: Token[], includeMazes = false): string[] {
  return tokens
    .filter((t) => (includeMazes || !t.isMaze) && !t.isUnintelligible && !t.isOmission)
    .map((t) => normaliseToken(t.surface))
    .filter((w) => w.length > 0);
}
