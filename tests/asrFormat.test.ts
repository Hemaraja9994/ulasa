import { describe, expect, it } from "vitest";
import { formatDraftLines } from "@/integrations/asrFormat";
import { parseSaltText } from "@/core/io/salt";

describe("formatDraftLines", () => {
  it("puts one utterance per line with the default speaker C", () => {
    expect(formatDraftLines([{ text: " I go to school. The bus is yellow!" }, { text: "Do you like it?" }])).toEqual([
      "C I go to school.",
      "C The bus is yellow!",
      "C Do you like it?",
    ]);
  });

  it("uses the given speaker code", () => {
    expect(formatDraftLines([{ text: "hello" }], "CHI")).toEqual(["CHI hello"]);
  });

  it("strips non-speech annotations that would be parsed as mazes or codes", () => {
    expect(formatDraftLines([{ text: "[Music] (laughs) we played *coughs* outside" }])).toEqual(["C we played outside"]);
  });

  it("drops empty segments and immediate repeats", () => {
    expect(formatDraftLines([{ text: "  " }, { text: "[BLANK_AUDIO]" }, { text: "ok." }, { text: "ok." }])).toEqual(["C ok."]);
  });

  it("collapses hallucination loops", () => {
    expect(formatDraftLines([{ text: "nd court nd court nd court nd court nd court" }])).toEqual(["C nd court"]);
    expect(formatDraftLines([{ text: "ని ని ని ని ని ని" }])).toEqual(["C ని"]);
  });

  it("splits Devanagari text at the danda", () => {
    expect(formatDraftLines([{ text: "मैं स्कूल जाता हूँ। बस पीली है।" }])).toEqual(["C मैं स्कूल जाता हूँ।", "C बस पीली है।"]);
  });

  it("produces lines the SALT importer accepts as target utterances", () => {
    const lines = formatDraftLines([{ text: "I drawed a house. And a tree." }]);
    const { sample } = parseSaltText(`$ C, E\n${lines.join("\n")}\n`, { language: "en-IN" });
    expect(sample.utterances.length).toBe(2);
  });
});
