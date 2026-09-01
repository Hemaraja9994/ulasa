"use client";

import { useEffect, useId, useRef } from "react";

/**
 * The shared modal shell behind both confirmations: deleting a sample, and
 * arming an external provider.
 *
 * Both are irreversible in the way that matters — one destroys the only copy
 * of a transcript, the other lets a child's speech leave the device — so both
 * trap focus, close on Escape, and return focus to whatever opened them.
 */
export function ConfirmDialog({
  open,
  onCancel,
  labelledBy,
  children,
}: {
  open: boolean;
  onCancel: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusable()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;

      // Trap: Tab past the last control wraps to the first, and back again.
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,17,22,.55)", backdropFilter: "blur(3px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="elevated w-full max-w-lg rounded-xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border-strong)" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Arming an external provider takes an exact typed match — deliberate
 * friction in front of the one action that breaks the on-device promise.
 */
export function TypedConfirmDialog({
  open,
  phrase,
  title,
  body,
  confirmLabel,
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  phrase: string;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const headingId = useId();
  const matches = value.trim() === phrase;

  return (
    <ConfirmDialog open={open} onCancel={onCancel} labelledBy={headingId}>
      <h2 id={headingId} className="text-[17px] font-semibold" style={{ color: "var(--danger-text)" }}>
        {title}
      </h2>
      <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        {body}
      </div>

      <label className="mt-4 block">
        <span className="meta-label">
          Type <span className="mono normal-case tracking-normal">{phrase}</span> to confirm
        </span>
        <input
          className="input mono mt-1.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={phrase}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${headingId}-hint`}
        />
      </label>
      <p id={`${headingId}-hint`} className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
        The button stays disabled until this matches exactly.
      </p>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" disabled={!matches} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </ConfirmDialog>
  );
}
