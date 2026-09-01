import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { AnalysisResult, Sample } from "@/core/types";
import { analysisSet } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { writeSaltText } from "@/core/io/salt";
import { writeChat } from "@/core/io/chat";
import { getPack } from "@/nlp/registry";
import { RUBRICS, scoreRubric, type RubricScores } from "@/core/rubrics";

/**
 * Every export runs in the browser and produces a Blob the clinician saves.
 * Nothing is uploaded, and no export endpoint exists to upload to.
 *
 * PDF is produced through the browser's own print pipeline rather than a
 * JavaScript PDF library. That is a deliberate choice: correct rendering of
 * Devanagari conjuncts, Tamil grantha letters and Malayalam chillu characters
 * needs a real text-shaping engine, and the browser already has one. A
 * jsPDF-style export would either mangle the scripts or require embedding
 * megabytes of font per language.
 */

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sample";
}

// ---------------------------------------------------------------------------
// Text formats
// ---------------------------------------------------------------------------

export function exportUlasaJson(sample: Sample, analysis: AnalysisResult | null) {
  const payload = {
    format: "ulasa-sample",
    version: 1,
    exportedAt: new Date().toISOString(),
    sample,
    analysis,
  };
  download(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `${slug(sample.title)}.ulasa.json`,
  );
}

export function exportSalt(sample: Sample): string[] {
  const { text, lossWarnings } = writeSaltText(sample);
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), `${slug(sample.title)}.slt.txt`);
  return lossWarnings;
}

export function exportChat(sample: Sample): string[] {
  const { text, lossWarnings } = writeChat(sample);
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), `${slug(sample.title)}.cha`);
  return lossWarnings;
}

// ---------------------------------------------------------------------------
// CSV — sample level and utterance level, for research use
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportMeasuresCsv(sample: Sample, analysis: AnalysisResult) {
  const rows: string[][] = [["group", "measure_key", "measure_label", "value", "unit", "status", "note"]];
  for (const group of analysis.groups) {
    for (const measure of group.measures) {
      rows.push([
        group.label,
        measure.key,
        measure.label,
        measure.value === null ? "" : String(measure.value),
        measure.unit ?? "",
        measure.status,
        measure.note ?? "",
      ]);
    }
  }
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `${slug(sample.title)}-measures.csv`);
}

export function exportUtterancesCsv(sample: Sample) {
  const pack = getPack(sample.language);
  const inSet = new Set(analysisSet(sample).map((u) => u.id));

  const rows: string[][] = [
    [
      "utterance_id", "speaker", "is_target", "in_analysis_set", "text",
      "words", "maze_words", "unintelligible_tokens", "intelligibility",
      "grammaticality", "codes", "start_s", "end_s", "gloss", "gloss_provenance",
    ],
  ];

  for (const u of sample.utterances) {
    const speaker = sample.speakers.find((s) => s.id === u.speakerId);
    rows.push([
      u.id,
      speaker?.code ?? "?",
      String(Boolean(speaker?.isTarget)),
      String(inSet.has(u.id)),
      u.text,
      String(countableWords(u.tokens).length),
      String(u.tokens.filter((t) => t.isMaze).length),
      String(u.tokens.filter((t) => t.isUnintelligible).length),
      u.intelligibility,
      u.grammaticality,
      (u.codes ?? []).join(" "),
      u.startTime === undefined ? "" : String(u.startTime),
      u.endTime === undefined ? "" : String(u.endTime),
      u.gloss?.text ?? "",
      u.gloss?.provenance ?? "",
    ]);
  }

  const header = `# ULASA utterance export. Language: ${sample.language} (${pack.name}). Mazes are excluded from the words column.\n`;
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  download(
    new Blob(["﻿" + header + csv], { type: "text/csv;charset=utf-8" }),
    `${slug(sample.title)}-utterances.csv`,
  );
}

// ---------------------------------------------------------------------------
// DOCX — the Standard Measures Report
// ---------------------------------------------------------------------------

export async function exportDocx(
  sample: Sample,
  analysis: AnalysisResult,
  options: {
    rubric?: RubricScores | null;
    narrative?: string;
    exemplars?: { text: string; gloss?: string }[];
  } = {},
) {
  const pack = getPack(sample.language);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: "ULASA Standard Measures Report",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: sample.title, bold: true }),
        new TextRun({ text: `  ·  ${pack.name} (${sample.language})  ·  ${sample.elicitationContext.replace(/_/g, " ")}`, color: "555555" }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Analysis set: ${analysis.analysisSetSize} complete and intelligible verbal utterances. Generated ${new Date(analysis.computedAt).toLocaleString()}.`,
          size: 18,
          color: "555555",
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "ULASA does not diagnose. It quantifies language production to support a qualified professional's judgement.",
          italics: true,
          size: 18,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  // Cautions first — a clinician should read these before any number.
  if (analysis.warnings.length) {
    children.push(new Paragraph({ text: "Cautions", heading: HeadingLevel.HEADING_2 }));
    for (const warning of analysis.warnings) {
      children.push(new Paragraph({ text: warning, bullet: { level: 0 } }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  for (const group of analysis.groups) {
    children.push(new Paragraph({ text: group.label, heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ["Measure", "Value", "Status"].map(
              (h) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                }),
            ),
          }),
          ...group.measures.map(
            (m) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph(m.label),
                      ...(m.note
                        ? [new Paragraph({ children: [new TextRun({ text: m.note, size: 16, italics: true, color: "666666" })] })]
                        : []),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph(
                        m.value === null ? "—" : `${m.value}${m.unit ? " " + m.unit : ""}`,
                      ),
                    ],
                  }),
                  new TableCell({ children: [new Paragraph(m.status)] }),
                ],
              }),
          ),
        ],
      }),
    );
    children.push(new Paragraph({ text: "" }));
  }

  if (options.rubric) {
    const rubric = RUBRICS[options.rubric.rubricId];
    const result = scoreRubric(rubric, options.rubric);
    children.push(new Paragraph({ text: rubric.label, heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Paragraph(
        result.composite === null
          ? "Not scored."
          : `Composite ${result.composite} of ${result.maximum} across ${result.scored} of ${result.total} dimensions (mean ${result.mean?.toFixed(1)}).`,
      ),
    );
    for (const d of rubric.dimensions) {
      const score = options.rubric.scores[d.key];
      children.push(
        new Paragraph({
          text: `${d.label}: ${score === null || score === undefined ? "not scored" : score}`,
          bullet: { level: 0 },
        }),
      );
    }
    if (options.rubric.notes) children.push(new Paragraph(options.rubric.notes));
    children.push(new Paragraph({ text: "" }));
  }

  if (options.exemplars?.length) {
    children.push(new Paragraph({ text: "Exemplar utterances", heading: HeadingLevel.HEADING_2 }));
    for (const ex of options.exemplars) {
      children.push(new Paragraph({ text: ex.text, bullet: { level: 0 } }));
      if (ex.gloss) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `gloss: ${ex.gloss}`, italics: true, size: 18, color: "666666" })],
            indent: { left: 720 },
          }),
        );
      }
    }
    children.push(new Paragraph({ text: "" }));
  }

  if (options.narrative) {
    children.push(new Paragraph({ text: "Performance report", heading: HeadingLevel.HEADING_2 }));
    for (const para of options.narrative.split(/\n{2,}/)) {
      if (para.trim()) children.push(new Paragraph(para.trim()));
    }
    children.push(new Paragraph({ text: "" }));
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: `Language-pack note — ${pack.name}: ${pack.normativeNotes}`,
          size: 16,
          color: "666666",
        }),
      ],
    }),
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  download(blob, `${slug(sample.title)}-report.docx`);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Opens the print dialog on the report view. The clinician chooses "Save as
 * PDF". This gives correct Indic shaping and correct pagination for free.
 */
export function exportPdf() {
  window.print();
}
