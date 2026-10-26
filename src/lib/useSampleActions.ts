"use client";

import { useRouter } from "next/navigation";
import { newSampleId, useStore } from "@/store/useStore";
import { parseSaltText } from "@/core/io/salt";
import { parseChat } from "@/core/io/chat";
import { FIXTURES } from "@/data/fixtures";
import type { Bcp47, ElicitationContext, Sample } from "@/core/types";

const DEFAULT_SPEAKERS: Sample["speakers"] = [
  { id: "spk-0", code: "C", role: "child", isTarget: true },
  { id: "spk-1", code: "E", role: "examiner", isTarget: false },
];

/** Normalises a typed case ID; blank means "unassigned". No names are needed. */
function cleanCaseId(caseId?: string): string {
  const v = (caseId ?? "").trim();
  return v || "unassigned";
}

/**
 * Creating, importing and loading samples, shared by Home, Studio and Clients.
 * Every action stays in this browser and is written to the audit log.
 */
export function useSampleActions() {
  const router = useRouter();
  const addSample = useStore((s) => s.addSample);
  const log = useStore((s) => s.log);

  function createBlank(opts: { caseId?: string; title?: string; language: Bcp47; context: ElicitationContext }) {
    const caseId = cleanCaseId(opts.caseId);
    const title = opts.title?.trim() || (caseId !== "unassigned" ? `${caseId} · new session` : "Untitled sample");
    addSample({
      id: newSampleId(),
      caseId,
      title,
      language: opts.language,
      elicitationContext: opts.context,
      recordedAt: new Date().toISOString(),
      speakers: DEFAULT_SPEAKERS,
      utterances: [],
    });
    log("create_sample", `Created "${title}" in ${opts.language}.`);
    router.push("/studio");
  }

  function loadFixture(fixtureId: string, destination: "/studio" | "/analyse" = "/studio"): string[] {
    const fixture = FIXTURES.find((f) => f.id === fixtureId);
    if (!fixture) return [];
    const { sample, warnings } = parseSaltText(fixture.text, { language: fixture.language as Bcp47 });
    addSample({
      ...sample,
      id: newSampleId(),
      caseId: `Demo ${fixture.language}`,
      title: fixture.label,
      recordedAt: new Date().toISOString(),
    });
    log("load_fixture", `Loaded the "${fixture.label}" demonstration sample.`);
    router.push(destination);
    return warnings;
  }

  /** Imports .txt (SALT), .cha (CHAT) or ULASA .json. Returns import notes. */
  async function importFiles(
    files: File[],
    opts: { caseId?: string; language: Bcp47 },
  ): Promise<string[]> {
    const notes: string[] = [];
    let imported = 0;
    for (const file of files) {
      const text = await file.text();
      const isChat = file.name.endsWith(".cha") || text.trimStart().startsWith("@UTF8");

      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          const sample = parsed.sample ?? parsed;
          addSample({ ...sample, id: newSampleId() });
          log("import", `Imported ULASA JSON "${file.name}".`);
          imported++;
        } catch {
          notes.push(`"${file.name}" is not a readable ULASA JSON file.`);
        }
        continue;
      }

      const { sample, warnings } = isChat
        ? parseChat(text)
        : parseSaltText(text, { language: opts.language, title: file.name });
      const caseId = opts.caseId?.trim() ? cleanCaseId(opts.caseId) : sample.caseId;
      addSample({
        ...sample,
        id: newSampleId(),
        caseId,
        title: sample.title || file.name,
        recordedAt: sample.recordedAt ?? new Date().toISOString(),
      });
      notes.push(...warnings.map((w) => `${file.name}: ${w}`));
      log("import", `Imported ${isChat ? "CHAT" : "SALT-style"} transcript "${file.name}".`);
      imported++;
    }
    if (imported === 1) router.push("/studio");
    return notes;
  }

  return { createBlank, loadFixture, importFiles };
}
