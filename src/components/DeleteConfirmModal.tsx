"use client";

import { useId } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { scriptTextProps } from "@/components/LanguageBadge";
import type { Sample } from "@/core/types";
import { analysisSet } from "@/core/analyse";

/**
 * Deleting a sample is never silent.
 *
 * The dialog names the sample in its own script, shows the case code and how
 * many utterances are about to go, and says plainly that there is no server
 * copy to restore from — because there is no server. The third action exists
 * so that "I want this off this machine" does not have to mean "I want this
 * gone": export first, then delete.
 */
export function DeleteConfirmModal({
  isOpen,
  sample,
  onConfirm,
  onCancel,
  onExportThenDelete,
}: {
  isOpen: boolean;
  sample: Sample | null;
  onConfirm: () => void;
  onCancel: () => void;
  onExportThenDelete?: () => void;
}) {
  const headingId = useId();
  if (!sample) return null;

  const set = analysisSet(sample);
  const caseCode = sample.caseId !== "unassigned" ? sample.caseId.toUpperCase() : null;

  return (
    <ConfirmDialog open={isOpen} onCancel={onCancel} labelledBy={headingId}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3l9 17H3z" />
            <path d="M12 9v5M12 17.5v.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold" style={{ color: "var(--danger-text)" }}>
            Delete this sample?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--danger-text)" }}>
            <span className="font-semibold" {...scriptTextProps(sample.language)}>
              {sample.title}
            </span>
            {caseCode && <span className="mono"> · {caseCode}</span>}
            <span className="num"> · {sample.utterances.length} utterances, {set.length} complete &amp; intelligible</span>
            {" "}and any linked audio are removed from this browser. There is no server copy to restore from.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {onExportThenDelete && (
          <button
            type="button"
            className="text-[13.5px] font-medium underline underline-offset-2"
            style={{ color: "var(--danger-text)" }}
            onClick={onExportThenDelete}
          >
            Export first, then delete
          </button>
        )}
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          Delete permanently
        </button>
      </div>
    </ConfirmDialog>
  );
}
