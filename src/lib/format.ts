import type { ElicitationContext, Sample } from "@/core/types";

/** Display labels for elicitation contexts, in the order the forms offer them. */
export const CONTEXT_LABELS: Record<ElicitationContext, string> = {
  conversation: "Conversation",
  play: "Play",
  narrative_retell: "Story retell",
  personal_narrative: "Personal narrative",
  expository: "Expository",
  persuasion: "Persuasion",
  picture_description: "Picture description",
  parent_child: "Parent–child",
  classroom: "Classroom",
  other: "Other",
};

export function contextLabel(ctx: ElicitationContext): string {
  return CONTEXT_LABELS[ctx] ?? ctx.replace(/_/g, " ");
}

/** "08:15" from seconds; null when no elapsed time was recorded. */
export function formatDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "20 Oct 2026"; an em dash when the sample has no recorded date. */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "20 Oct", for chart axes. */
export function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Case IDs are free text typed by the clinician; "unassigned" is the default. */
export function caseLabel(caseId: string): string {
  if (!caseId || caseId === "unassigned") return "Unassigned";
  return caseId;
}

/** Samples sorted oldest first, by recorded date and then by title. */
export function byDate(a: Sample, b: Sample): number {
  const da = a.recordedAt ?? "";
  const db = b.recordedAt ?? "";
  if (da !== db) return da < db ? -1 : 1;
  return a.title.localeCompare(b.title);
}

/** Formats a measure value with its percent sign when the unit is "%". */
export function fmtValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return "—";
  return unit === "%" ? `${value}%` : String(value);
}

/** "5;2" (years;months), the clinical convention. */
export function formatAge(years?: number, months?: number): string | null {
  if (years === undefined) return null;
  return `${years};${months ?? 0}`;
}

/** Parses "5;2", "5:2" or "5" into years and months; null when unreadable. */
export function parseAge(text: string): { years: number; months: number } | null {
  const m = text.trim().match(/^(\d{1,2})(?:\s*[;:.]\s*(\d{1,2}))?$/);
  if (!m) return null;
  const months = m[2] ? Number(m[2]) : 0;
  if (months > 11) return null;
  return { years: Number(m[1]), months };
}
