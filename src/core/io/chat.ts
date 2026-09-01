import type { Bcp47, Sample, Speaker, Utterance } from "../types";
import { parseUtteranceText } from "../tokenise";
import { getPack } from "@/nlp/registry";
import { normaliseToken } from "@/nlp/pack";

/**
 * CHAT (.cha) — the TalkBank / CHILDES exchange format.
 *
 * ULASA implements the subset that carries a clinical language sample:
 * @Begin/@End, @Languages, @Participants, @ID, main speaker tiers (*CHI:),
 * the %mor: dependent tier, and media bullets. It does not implement the full
 * CHAT specification, and the writer says so rather than producing a file that
 * looks complete and fails CHECK.
 *
 * Round-tripping ULASA -> CHAT -> ULASA preserves speakers, utterance text,
 * timing and morpheme splits. It does not preserve ULASA's grammaticality
 * marks or clause-count overrides, which have no CHAT equivalent.
 */

const CHAT_LANG: Record<string, string> = {
  "en-IN": "eng", "en-US": "eng", "en-GB": "eng",
  "hi-IN": "hin", "ta-IN": "tam", "kn-IN": "kan",
  "te-IN": "tel", "ml-IN": "mal",
};

const FROM_CHAT_LANG: Record<string, Bcp47> = {
  eng: "en-IN", hin: "hi-IN", tam: "ta-IN", kan: "kn-IN", tel: "te-IN", mal: "ml-IN",
};

const CHAT_ROLE: Record<Speaker["role"], string> = {
  child: "Target_Child",
  examiner: "Investigator",
  parent: "Mother",
  peer: "Playmate",
  teacher: "Teacher",
  other: "Participant",
};

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

export function writeChat(sample: Sample): { text: string; lossWarnings: string[] } {
  const lossWarnings: string[] = [];
  const lines: string[] = ["@UTF8", "@Begin"];

  const langs = [sample.language, ...(sample.secondaryLanguages ?? [])]
    .map((l) => CHAT_LANG[l] ?? "und")
    .filter((v, i, a) => a.indexOf(v) === i);
  lines.push(`@Languages:\t${langs.join(", ")}`);

  const participants = sample.speakers
    .map((s) => `${chatCode(s)} ${titleCase(s.role)} ${CHAT_ROLE[s.role]}`)
    .join(", ");
  lines.push(`@Participants:\t${participants}`);

  for (const s of sample.speakers) {
    // @ID: language|corpus|code|age|sex|group|SES|role|education|custom|
    lines.push(`@ID:\t${langs[0]}|ulasa|${chatCode(s)}|||||${CHAT_ROLE[s.role]}|||`);
  }

  lines.push(`@Media:\t${sample.audioKey ? "sample" : "unspecified"}, audio`);
  lines.push(`@Comment:\tExported by ULASA. Elicitation context: ${sample.elicitationContext}.`);

  let morTiers = 0;
  for (const u of sample.utterances) {
    const speaker = sample.speakers.find((s) => s.id === u.speakerId);
    const code = speaker ? chatCode(speaker) : "*XXX";

    let line = `${code}:\t${toChatText(u)}`;
    if (typeof u.startTime === "number" && typeof u.endTime === "number") {
      // CHAT media bullet, milliseconds.
      line += ` ${Math.round(u.startTime * 1000)}_${Math.round(u.endTime * 1000)}`;
    }
    lines.push(line);

    const mor = morTier(u);
    if (mor) {
      lines.push(`%mor:\t${mor}`);
      morTiers++;
    }
    if (u.gloss) lines.push(`%xtra:\tgloss (${u.gloss.provenance}): ${u.gloss.text}`);
    if (u.comment) lines.push(`%com:\t${u.comment}`);
  }

  lines.push("@End");

  if (morTiers === 0) {
    lossWarnings.push(
      "No %mor: tier was written because no bound-morpheme splits are present. CLAN analyses that require %mor (DSS, IPSyn, MLU-m) will not run on this file.",
    );
  }
  if (sample.utterances.some((u) => u.grammaticality !== "unmarked")) {
    lossWarnings.push(
      "Grammaticality judgements were dropped — CHAT has no standard tier for them, so PGU is preserved only in ULASA JSON.",
    );
  }
  if (sample.utterances.some((u) => typeof u.clauseCountOverride === "number")) {
    lossWarnings.push("Clause-count overrides were dropped; CHAT has no equivalent field.");
  }
  lossWarnings.push(
    "This is a CHAT subset, not a full CHAT export. Run CLAN's CHECK before using it in a TalkBank workflow.",
  );

  return { text: lines.join("\n") + "\n", lossWarnings };
}

function chatCode(s: Speaker): string {
  const map: Record<Speaker["role"], string> = {
    child: "*CHI", examiner: "*INV", parent: "*MOT",
    peer: "*PLA", teacher: "*TEA", other: "*XXX",
  };
  return map[s.role];
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Converts ULASA conventions to CHAT's: mazes to [/] retracing, X to xxx. */
function toChatText(u: Utterance): string {
  const parts: string[] = [];
  for (let i = 0; i < u.tokens.length; i++) {
    const t = u.tokens[i];
    if (t.isUnintelligible) { parts.push("xxx"); continue; }
    if (t.isOmission) { parts.push(`0${normaliseToken(t.surface)}`); continue; }
    parts.push(normaliseToken(t.surface));
  }
  let text = parts.filter(Boolean).join(" ");

  // Mark maze spans with CHAT's retracing symbol.
  for (const maze of [...u.mazes].reverse()) {
    const symbol = maze.kind === "repetition" ? "[/]" : maze.kind === "revision" ? "[//]" : "[/-]";
    const words = u.tokens.slice(maze.start, maze.end).map((t) => normaliseToken(t.surface)).filter(Boolean);
    if (words.length === 0) continue;
    const needle = words.join(" ");
    text = text.replace(needle, `<${needle}> ${symbol}`);
  }

  if (!/[.!?]$/.test(text.trim())) text = text.trim() + " .";
  return text;
}

function morTier(u: Utterance): string | null {
  const withSplits = u.tokens.filter((t) => (t.morphemes?.length ?? 0) > 1);
  if (withSplits.length === 0) return null;
  return u.tokens
    .filter((t) => !t.isUnintelligible && !t.isOmission)
    .map((t) => {
      const pos = t.pos ?? "x";
      const morphs = t.morphemes ?? [normaliseToken(t.surface)];
      return `${pos}|${morphs[0]}${morphs.length > 1 ? "-" + morphs.slice(1).join("-") : ""}`;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

export function parseChat(text: string): { sample: Sample; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);

  let language: Bcp47 = "en-IN";
  const speakerCodes = new Map<string, Speaker>();
  const body: { code: string; text: string; start?: number; end?: number }[] = [];

  // CHAT continues a tier on an indented following line.
  const merged: string[] = [];
  for (const raw of lines) {
    if (/^[\t ]/.test(raw) && merged.length > 0) merged[merged.length - 1] += " " + raw.trim();
    else merged.push(raw);
  }

  for (const raw of merged) {
    const line = raw.trim();
    if (!line || line === "@Begin" || line === "@End" || line === "@UTF8") continue;

    if (line.startsWith("@Languages:")) {
      const first = line.split(":")[1]?.split(",")[0]?.trim();
      if (first && FROM_CHAT_LANG[first]) language = FROM_CHAT_LANG[first];
      else if (first) warnings.push(`ULASA has no language pack for CHAT language code "${first}". Defaulting to English; set the language in the Studio.`);
      continue;
    }
    if (line.startsWith("@")) continue;
    if (line.startsWith("%")) continue; // dependent tiers are re-derived, not trusted

    const match = line.match(/^\*([A-Z]{3}):\s*(.*)$/);
    if (!match) continue;

    let utteranceText = match[2];
    let start: number | undefined;
    let end: number | undefined;

    const bullet = utteranceText.match(/(\d+)_(\d+)/);
    if (bullet) {
      start = Number(bullet[1]) / 1000;
      end = Number(bullet[2]) / 1000;
      utteranceText = utteranceText.replace(bullet[0], "").trim();
    }

    body.push({ code: match[1], text: fromChatText(utteranceText), start, end });
  }

  for (const b of body) {
    if (speakerCodes.has(b.code)) continue;
    speakerCodes.set(b.code, {
      id: `spk-${speakerCodes.size}`,
      code: b.code,
      role: b.code === "CHI" ? "child" : b.code === "MOT" ? "parent" : b.code === "INV" ? "examiner" : "other",
      isTarget: b.code === "CHI",
    });
  }

  const speakers = [...speakerCodes.values()];
  if (speakers.length && !speakers.some((s) => s.isTarget)) {
    speakers[0].isTarget = true;
    warnings.push(`No *CHI tier was found. Treating "${speakers[0].code}" as the target speaker.`);
  }

  const pack = getPack(language);
  const utterances: Utterance[] = body.map((b, i) => {
    const parsed = parseUtteranceText(b.text, pack);
    return {
      id: `utt-${i}`,
      speakerId: speakerCodes.get(b.code)!.id,
      text: b.text,
      tokens: parsed.tokens,
      mazes: parsed.mazes,
      intelligibility: parsed.intelligibility,
      grammaticality: "unmarked",
      codes: parsed.codes,
      pauses: parsed.pauses,
      startTime: b.start,
      endTime: b.end,
    };
  });

  const last = utterances[utterances.length - 1];
  return {
    sample: {
      id: `sample-${Date.now().toString(36)}`,
      caseId: "unassigned",
      title: "Imported CHAT transcript",
      language,
      elicitationContext: "conversation",
      elapsedSeconds: last?.endTime,
      speakers,
      utterances,
    },
    warnings,
  };
}

/** Converts CHAT conventions back to ULASA's. */
function fromChatText(text: string): string {
  return text
    .replace(/<([^>]+)>\s*\[\/\/?-?\]/g, "($1)") // retracing -> maze
    .replace(/\bxxx\b/g, "X")
    .replace(/\byyy\b/g, "X")
    .replace(/\bwww\b/g, "")
    .replace(/\[[^\]]*\]/g, (m) => (/^\[[=%:]/.test(m) ? "" : m)) // drop CHAT-only annotations
    .replace(/\s+/g, " ")
    .trim();
}
